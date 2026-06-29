import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { type Db, agents, approvals, auditLog, costEvents } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 7 — Budgets/Cost, Approvals, Heartbeats, Fleet-Insights.
@Injectable()
export class GovernanceService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  costs(companyId: string) {
    return this.db.select().from(costEvents).where(eq(costEvents.companyId, companyId)).orderBy(desc(costEvents.createdAt));
  }

  budgets(companyId: string) {
    return this.db
      .select({
        id: agents.id,
        name: agents.displayName,
        spentCents: agents.spentMonthlyCents,
        capCents: agents.budgetMonthlyCents,
        status: agents.status,
      })
      .from(agents)
      .where(eq(agents.companyId, companyId));
  }

  /** Cost-Roll-up → Budget-Alarme: Agenten ab 80 % Auslastung (warn) / 100 % (over). */
  async alerts(companyId: string) {
    const rows = await this.budgets(companyId);
    return rows
      .filter((r) => r.capCents != null && r.capCents > 0)
      .map((r) => {
        const pct = Math.round(((r.spentCents ?? 0) / (r.capCents as number)) * 100);
        return { ...r, pct, level: pct >= 100 ? "over" : "warn" };
      })
      .filter((r) => r.pct >= 80)
      .sort((a, b) => b.pct - a.pct);
  }

  /** Letzter Heartbeat je Agent (aus dem Audit-Log). */
  async heartbeats(companyId: string) {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.companyId, companyId), eq(auditLog.action, "heartbeat")))
      .orderBy(desc(auditLog.createdAt))
      .limit(400);
    const latest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const id = r.entityId ?? r.actorId;
      if (id && !latest.has(id)) latest.set(id, r);
    }
    return [...latest.entries()].map(([agentId, r]) => ({
      agentId,
      state: (r.data as any)?.state ?? "unknown",
      note: (r.data as any)?.note ?? null,
      at: r.createdAt,
    }));
  }

  /** Fleet-Insights („Chat with your fleet") — deterministisch aus Agenten + Audit. */
  async insights(companyId: string) {
    const ags = await this.db.select().from(agents).where(eq(agents.companyId, companyId));
    const audits = await this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.companyId, companyId))
      .orderBy(desc(auditLog.createdAt))
      .limit(500);

    const byActor = new Map<string, number>();
    for (const a of audits) if (a.actorId) byActor.set(a.actorId, (byActor.get(a.actorId) ?? 0) + 1);

    const topSpender = [...ags].sort((a, b) => (b.spentMonthlyCents ?? 0) - (a.spentMonthlyCents ?? 0))[0];
    const mostActiveId = [...byActor.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mostActive = ags.find((a) => a.id === mostActiveId);
    const atRisk = ags.filter(
      (a) =>
        a.status === "paused" ||
        (a.budgetMonthlyCents != null && (a.spentMonthlyCents ?? 0) / a.budgetMonthlyCents >= 0.8),
    );

    return {
      agentCount: ags.length,
      activeCount: ags.filter((a) => a.status === "active").length,
      externalCount: ags.filter((a) => a.kind === "external").length,
      totalSpendCents: ags.reduce((s, a) => s + (a.spentMonthlyCents ?? 0), 0),
      topSpender: topSpender ? { name: topSpender.displayName, spentCents: topSpender.spentMonthlyCents ?? 0 } : null,
      mostActive: mostActive ? { name: mostActive.displayName, events: byActor.get(mostActiveId!) ?? 0 } : null,
      atRisk: atRisk.map((a) => ({
        name: a.displayName,
        status: a.status,
        pct: a.budgetMonthlyCents ? Math.round(((a.spentMonthlyCents ?? 0) / a.budgetMonthlyCents) * 100) : null,
      })),
    };
  }

  approvals(companyId: string) {
    return this.db.select().from(approvals).where(eq(approvals.companyId, companyId)).orderBy(desc(approvals.createdAt));
  }

  async decide(id: string, status: "approved" | "rejected") {
    const [a] = await this.db.update(approvals).set({ status, decidedAt: new Date() }).where(eq(approvals.id, id)).returning();
    return a;
  }
}
