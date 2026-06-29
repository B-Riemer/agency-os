import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { type Db, tasks } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { RunsService } from "../adapters/runs.service.js";

type Status = "backlog" | "in_progress" | "review" | "done" | "blocked";

// Säule 6 — Tickets/Tasks.
@Injectable()
export class TasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(RunsService) private readonly runs: RunsService,
  ) {}

  list(companyId: string) {
    return this.db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(desc(tasks.createdAt));
  }

  async create(companyId: string, dto: { title: string; description?: string; priority?: number; assigneeId?: string; createdBy?: string }) {
    const [t] = await this.db
      .insert(tasks)
      .values({ companyId, title: dto.title, description: dto.description, priority: dto.priority ?? 2, assigneeId: dto.assigneeId, createdBy: dto.createdBy ?? "user" })
      .returning();
    return t;
  }

  async setStatus(id: string, status: Status) {
    const [t] = await this.db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    if (!t) throw new NotFoundException("Task nicht gefunden");
    return t;
  }

  async assign(id: string, assigneeId: string | null) {
    const [t] = await this.db.update(tasks).set({ assigneeId, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return t;
  }

  /** Task an den zugewiesenen Agenten geben (echter Lauf via Adapter). */
  async run(id: string) {
    const [t] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    if (!t) throw new NotFoundException("Task nicht gefunden");
    if (!t.assigneeId) throw new BadRequestException("Task hat keinen Assignee");
    await this.db.update(tasks).set({ status: "in_progress", updatedAt: new Date() }).where(eq(tasks.id, id));
    const taskText = `${t.title}${t.description ? ": " + t.description : ""}`;
    const result: any = await this.runs.run(t.assigneeId, taskText);
    await this.db
      .update(tasks)
      .set({ status: result.status === "completed" ? "done" : "blocked", resultRef: result.artifactRef ?? result.result ?? null, updatedAt: new Date() })
      .where(eq(tasks.id, id));
    return { task: id, ...result };
  }
}
