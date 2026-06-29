import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { type Db, routines, tasks } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

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
}
