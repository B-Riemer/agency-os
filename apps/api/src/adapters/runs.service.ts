import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { type Db, agents, costEvents } from "@agency-os/db";
import type { ExecutionContext, TranscriptEntry } from "@agency-os/adapter-contract";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { AdapterRegistry } from "./adapter.registry.js";
import { TogglesService } from "../access/toggles.service.js";
import { AuditService } from "../governance/audit.service.js";
import { RagService } from "../rag/rag.service.js";
import { SecretsService } from "../secrets/secrets.service.js";

// USP-Laufzeit: Der Kern ERZWINGT die Akte. Vor execute() werden Skills/Tools nach
// Toggles gefiltert, das Budget geprüft; danach wird jede Aktion auditiert und Kosten
// werden gebucht. Ein externer Agent ist damit nicht privilegierter als ein interner.
@Injectable()
export class RunsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(AdapterRegistry) private readonly registry: AdapterRegistry,
    @Inject(TogglesService) private readonly toggles: TogglesService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RagService) private readonly ragService: RagService,
    @Inject(SecretsService) private readonly secrets: SecretsService,
  ) {}

  async run(agentId: string, task: string) {
    const [agent] = await this.db.select().from(agents).where(eq(agents.id, agentId));
    if (!agent) throw new BadRequestException("Agent nicht gefunden");
    if (agent.status !== "active") {
      throw new BadRequestException(`Agent ist '${agent.status}' — kein Lauf möglich.`);
    }
    // Budget-Gate: bei Cap entweder hart stoppen ODER (budgetFallback) degradiert weiterlaufen.
    let degraded = false;
    if (agent.budgetMonthlyCents != null && (agent.spentMonthlyCents ?? 0) >= agent.budgetMonthlyCents) {
      if (agent.budgetFallback) {
        degraded = true;
        await this.heartbeatEntry(agent.companyId, agentId, "budget_warning", "Budget-Cap: Graceful-Fallback (günstiges Modell)");
      } else {
        throw new BadRequestException("Budget-Cap erreicht — Agent pausiert.");
      }
    }

    const adapter = this.registry.get(agent.adapterType);
    if (!adapter) throw new BadRequestException(`Kein Adapter für Typ '${agent.adapterType}'`);

    const [allowedTools, allowedSkills, knowledgeFolders, injectedEnv] = await Promise.all([
      this.toggles.allowedTools(agentId),
      this.toggles.allowedSkills(agentId),
      this.ragService.allowedFolderNames(agentId),
      this.secrets.injectedEnvFor(agentId),
    ]);
    if (Object.keys(injectedEnv).length) {
      await this.audit.write({ companyId: agent.companyId, actorType: "system", action: "secrets_injected", entityType: "agent", entityId: agentId, data: { keys: Object.keys(injectedEnv) } });
    }

    const runId = randomUUID();
    const ctx: ExecutionContext = {
      runId,
      agentId,
      task,
      allowedSkills,
      allowedTools,
      knowledgeFolders, // Permission-Mirroring: nur freigeschaltete RAG-Quellen
      injectedEnv, // Secrets-Sidecar-Injection (Werte nie geloggt)
      budgetRemainingCents:
        agent.budgetMonthlyCents == null
          ? null
          : agent.budgetMonthlyCents - (agent.spentMonthlyCents ?? 0),
      audit: {
        write: (entry: TranscriptEntry) =>
          void this.audit.write({
            companyId: agent.companyId,
            actorType: "agent",
            actorId: agentId,
            action: entry.kind,
            entityType: "agent",
            entityId: agentId,
            data: entry,
            costCents: "costCents" in entry ? entry.costCents : undefined,
          }),
      },
    };

    await this.heartbeatEntry(agent.companyId, agentId, "working", task.slice(0, 80));
    const result = await adapter.execute(ctx, agent.adapterConfig as Record<string, unknown>);

    const cost = result.costCents ?? 0;
    const newSpent = (agent.spentMonthlyCents ?? 0) + cost;
    if (cost) {
      await this.db.insert(costEvents).values({ companyId: agent.companyId, agentId, amountCents: cost, taskRef: runId });
      await this.db.update(agents).set({ spentMonthlyCents: newSpent }).where(eq(agents.id, agentId));
    }

    // Budget: Auto-Pause bei 100 % (außer Fallback aktiv), Warn-Heartbeat ab 80 %.
    if (!agent.budgetFallback && agent.budgetMonthlyCents != null && newSpent >= agent.budgetMonthlyCents) {
      await this.db.update(agents).set({ status: "paused" }).where(eq(agents.id, agentId));
      await this.audit.write({ companyId: agent.companyId, actorType: "system", action: "budget_pause", entityType: "agent", entityId: agentId, data: { spent: newSpent, cap: agent.budgetMonthlyCents } });
      await this.heartbeatEntry(agent.companyId, agentId, "paused", "Budget-Cap erreicht — Auto-Pause");
    } else if (agent.budgetMonthlyCents != null && newSpent / agent.budgetMonthlyCents >= 0.8) {
      await this.heartbeatEntry(agent.companyId, agentId, "budget_warning", `${Math.round((newSpent / agent.budgetMonthlyCents) * 100)}% Budget verbraucht`);
    } else {
      await this.heartbeatEntry(agent.companyId, agentId, result.status === "completed" ? "idle" : "error", result.status);
    }

    await this.audit.write({
      companyId: agent.companyId,
      actorType: "agent",
      actorId: agentId,
      action: `run_${result.status}`,
      entityType: "agent",
      entityId: agentId,
      data: { task, status: result.status, artifactRef: result.artifactRef },
    });

    return { runId, degraded, ...result };
  }

  /** Onboarding-Test: Verbindung/Health/Contract des Adapters prüfen. */
  async test(agentId: string) {
    const [agent] = await this.db.select().from(agents).where(eq(agents.id, agentId));
    if (!agent) throw new BadRequestException("Agent nicht gefunden");
    const adapter = this.registry.get(agent.adapterType);
    if (!adapter) throw new BadRequestException(`Kein Adapter für Typ '${agent.adapterType}'`);
    return adapter.testEnvironment(agent.adapterConfig as Record<string, unknown>);
  }

  /** Verbindungstest OHNE bestehenden Agenten (für den Onboarding-Wizard). */
  async testConfig(type: string, config: Record<string, unknown>) {
    const adapter = this.registry.get(type);
    if (!adapter) throw new BadRequestException(`Kein Adapter für Typ '${type}'`);
    return adapter.testEnvironment(config);
  }

  /** Proaktiver Heartbeat (intern beim Lauf ODER extern per Endpoint). */
  private heartbeatEntry(companyId: string, agentId: string, state: string, note?: string) {
    return this.audit.write({
      companyId,
      actorType: "agent",
      actorId: agentId,
      action: "heartbeat",
      entityType: "agent",
      entityId: agentId,
      data: { state, note },
    });
  }

  async heartbeat(agentId: string, state: string, note?: string) {
    const [agent] = await this.db.select().from(agents).where(eq(agents.id, agentId));
    if (!agent) throw new BadRequestException("Agent nicht gefunden");
    await this.heartbeatEntry(agent.companyId, agentId, state, note);
    return { ok: true, state };
  }
}
