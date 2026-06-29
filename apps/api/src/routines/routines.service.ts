import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { type Db, routines, tasks } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { cronMatches } from "./cron.js";

export interface FiredRoutine {
  routineId: string;
  companyId: string;
  taskId: string;
  agentId: string | null;
  title: string;
}

// Säule 6 — Routinen (cron) + Wakeup-Tick.
@Injectable()
export class RoutinesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  list(companyId: string) {
    return this.db.select().from(routines).where(eq(routines.companyId, companyId)).orderBy(desc(routines.createdAt));
  }

  async create(companyId: string, dto: { name: string; cron: string; agentId?: string; taskTitleTemplate: string }) {
    const [r] = await this.db
      .insert(routines)
      .values({ companyId, name: dto.name, cron: dto.cron, agentId: dto.agentId, taskTitleTemplate: dto.taskTitleTemplate })
      .returning();
    return r;
  }

  async setEnabled(id: string, enabled: boolean) {
    const [r] = await this.db.update(routines).set({ enabled }).where(eq(routines.id, id)).returning();
    return r;
  }

  /** Wakeup-Tick: für alle aktiven Routinen ein Ticket erzeugen (echte cron-Auswertung: M-später). */
  async tick(companyId: string) {
    const rs = await this.db.select().from(routines).where(and(eq(routines.companyId, companyId), eq(routines.enabled, true)));
    const taskIds: string[] = [];
    for (const r of rs) {
      const title = r.taskTitleTemplate.replace("{{date}}", new Date().toLocaleDateString("de-DE"));
      const [t] = await this.db
        .insert(tasks)
        .values({ companyId, title, assigneeId: r.agentId, createdBy: "routine", priority: 2 })
        .returning();
      await this.db.update(routines).set({ lastRunAt: new Date() }).where(eq(routines.id, r.id));
      taskIds.push(t.id);
    }
    return { triggered: rs.length, taskIds };
  }

  /**
   * Cron-aware: erzeugt für alle fälligen, aktivierten Routinen ein Ticket.
   * Minuten-Dedupe über lastRunAt (verhindert Doppel-Feuern im selben Tick-Fenster).
   * Liefert die gefeuerten Routinen zurück (der Scheduler startet daraufhin die Läufe).
   */
  async fireDue(now: Date = new Date()): Promise<FiredRoutine[]> {
    const rs = await this.db.select().from(routines).where(eq(routines.enabled, true));
    const minuteKey = (d: Date) => Math.floor(d.getTime() / 60000);
    const fired: FiredRoutine[] = [];
    for (const r of rs) {
      if (!cronMatches(r.cron, now)) continue;
      if (r.lastRunAt && minuteKey(r.lastRunAt) === minuteKey(now)) continue; // schon gefeuert
      const title = r.taskTitleTemplate.replace("{{date}}", now.toLocaleDateString("de-DE"));
      const [t] = await this.db
        .insert(tasks)
        .values({ companyId: r.companyId, title, assigneeId: r.agentId, createdBy: "routine", priority: 2 })
        .returning();
      await this.db.update(routines).set({ lastRunAt: now }).where(eq(routines.id, r.id));
      fired.push({ routineId: r.id, companyId: r.companyId, taskId: t.id, agentId: r.agentId, title });
    }
    return fired;
  }
}
