import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { RoutinesService } from "./routines.service.js";
import { RunsService } from "../adapters/runs.service.js";
import { AuditService } from "../governance/audit.service.js";

// Säule 6 — automatischer Wakeup-Loop. Tickt jede Minute, feuert fällige Routinen
// (Cron-aware), erzeugt Tickets und lässt zugewiesene Agenten autonom laufen — alles
// durch die Akte (Budget/Toggles/Audit). Abschaltbar via SCHEDULER_ENABLED=false.
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger("Scheduler");
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    @Inject(RoutinesService) private readonly routines: RoutinesService,
    @Inject(RunsService) private readonly runs: RunsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    if (process.env.SCHEDULER_ENABLED === "false") {
      this.log.log("Scheduler deaktiviert (SCHEDULER_ENABLED=false)");
      return;
    }
    this.timer = setInterval(() => void this.tick(), 60_000);
    setTimeout(() => void this.tick(), 5_000); // kurz nach Start einmal prüfen
    this.log.log("Scheduler aktiv — prüft Routinen jede Minute");
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Ein Tick: fällige Routinen feuern + Agenten laufen lassen. Überlappung verhindert. */
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const fired = await this.routines.fireDue(new Date());
      for (const f of fired) {
        await this.audit.write({
          companyId: f.companyId,
          actorType: "system",
          action: "routine_fired",
          entityType: "routine",
          entityId: f.routineId,
          data: { taskId: f.taskId, title: f.title },
        });
        if (!f.agentId) continue;
        try {
          const res = await this.runs.run(f.agentId, f.title);
          await this.audit.write({
            companyId: f.companyId,
            actorType: "system",
            action: "routine_run",
            entityType: "agent",
            entityId: f.agentId,
            data: { taskId: f.taskId, status: res.status },
          });
        } catch (e) {
          // Agent pausiert / Budget-Cap / Adapter-Fehler → sauber auditieren, nicht crashen.
          await this.audit.write({
            companyId: f.companyId,
            actorType: "system",
            action: "routine_skipped",
            entityType: "agent",
            entityId: f.agentId,
            data: { taskId: f.taskId, error: (e as Error).message },
          });
        }
      }
      if (fired.length) this.log.log(`${fired.length} Routine(n) gefeuert`);
    } catch (e) {
      this.log.error(`Tick-Fehler: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
