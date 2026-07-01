import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { type Db, agents, agentVersions } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import type { CreateAgentDto } from "./dto/create-agent.dto.js";

type AgentStatus = "onboarding" | "active" | "paused" | "terminated";

// Säule 2 — Personalwirtschaft: die Agenten-Akte.
@Injectable()
export class AgentsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  list(companyId: string) {
    return this.db.select().from(agents).where(eq(agents.companyId, companyId));
  }

  async get(id: string) {
    const [a] = await this.db.select().from(agents).where(eq(agents.id, id));
    if (!a) throw new NotFoundException("Agent nicht gefunden");
    return a;
  }

  async create(companyId: string, dto: CreateAgentDto) {
    const [a] = await this.db
      .insert(agents)
      .values({
        companyId,
        displayName: dto.displayName,
        role: dto.role,
        departmentId: dto.departmentId,
        managerId: dto.managerId,
        kind: dto.kind ?? "internal",
        adapterType: dto.adapterType ?? "internal",
        adapterConfig: dto.adapterConfig ?? {},
        budgetMonthlyCents: dto.budgetMonthlyCents,
        status: "onboarding",
      })
      .returning();
    return a;
  }

  /** Status-Lifecycle: onboarding → active → paused → terminated. */
  async setStatus(id: string, status: AgentStatus) {
    const [a] = await this.db
      .update(agents)
      .set({ status, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    if (!a) throw new NotFoundException("Agent nicht gefunden");
    return a;
  }

  /** Runtime/Adapter einer bestehenden Akte setzen (z. B. auf claude_local umstellen). */
  async setRuntime(id: string, dto: { adapterType?: string; adapterConfig?: Record<string, unknown> }) {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.adapterType !== undefined) set.adapterType = dto.adapterType;
    if (dto.adapterConfig !== undefined) set.adapterConfig = dto.adapterConfig;
    const [a] = await this.db.update(agents).set(set).where(eq(agents.id, id)).returning();
    if (!a) throw new NotFoundException("Agent nicht gefunden");
    return a;
  }

  // --- Versionierte Akte (Promote/Rollback) ---
  listVersions(agentId: string) {
    return this.db
      .select()
      .from(agentVersions)
      .where(eq(agentVersions.agentId, agentId))
      .orderBy(desc(agentVersions.version));
  }

  /** Snapshot der aktuellen Konfig als neue Version speichern. */
  async snapshot(agentId: string, note?: string) {
    const a = await this.get(agentId);
    const existing = await this.db.select().from(agentVersions).where(eq(agentVersions.agentId, agentId));
    const nextV = existing.reduce((m, v) => Math.max(m, v.version), 0) + 1;
    const snapshot = {
      role: a.role,
      systemPrompt: a.systemPrompt,
      modelConfig: a.modelConfig,
      adapterConfig: a.adapterConfig,
      budgetMonthlyCents: a.budgetMonthlyCents,
    };
    const [v] = await this.db
      .insert(agentVersions)
      .values({ agentId, version: nextV, snapshot, note })
      .returning();
    return v;
  }

  /** Eine Version „befördern"/zurückrollen: erst Auto-Snapshot, dann anwenden. */
  async promote(agentId: string, versionId: string) {
    const [v] = await this.db.select().from(agentVersions).where(eq(agentVersions.id, versionId));
    if (!v || v.agentId !== agentId) throw new NotFoundException("Version nicht gefunden");
    await this.snapshot(agentId, `Auto-Snapshot vor Promote von v${v.version}`);
    const s = v.snapshot as Record<string, any>;
    const [a] = await this.db
      .update(agents)
      .set({
        role: s.role,
        systemPrompt: s.systemPrompt,
        modelConfig: s.modelConfig,
        adapterConfig: s.adapterConfig ?? {},
        budgetMonthlyCents: s.budgetMonthlyCents,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId))
      .returning();
    return a;
  }

  // --- USP-Welle: Souveränität, Budget-Fallback, token-scoped Credentials ---
  async setSovereignty(id: string, level: "eu_only" | "eu_plus" | "global" | "global_pii") {
    const [a] = await this.db.update(agents).set({ sovereignty: level, updatedAt: new Date() }).where(eq(agents.id, id)).returning();
    if (!a) throw new NotFoundException("Agent nicht gefunden");
    return a;
  }

  async setBudgetFallback(id: string, enabled: boolean) {
    const [a] = await this.db.update(agents).set({ budgetFallback: enabled, updatedAt: new Date() }).where(eq(agents.id, id)).returning();
    if (!a) throw new NotFoundException("Agent nicht gefunden");
    return a;
  }

  /** Token-scoped Credential (Zylon-Idee): per-Agent-Bearer-Token, das nur dieser Agent nutzt.
   *  Wird einmalig zurückgegeben und als Authorization-Header in adapterConfig hinterlegt. */
  async rotateToken(id: string) {
    const a = await this.get(id);
    const token = "agos_" + randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
    const cfg = (a.adapterConfig as Record<string, any>) ?? {};
    const headers = { ...(cfg.headers ?? {}), Authorization: `Bearer ${token}` };
    await this.db.update(agents).set({ adapterConfig: { ...cfg, headers }, updatedAt: new Date() }).where(eq(agents.id, id));
    return { token, hint: "Einmalig anzeigen — wird als Authorization-Header an den externen Agenten gesendet." };
  }
}
