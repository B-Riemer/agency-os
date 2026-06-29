import { BadRequestException, Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { type Db, agents } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { RunsService } from "../adapters/runs.service.js";

// OpenAI-/Anthropic-kompatibler Endpoint (Zylon-Idee): bestehende Tools/Frameworks
// docken ohne Umbau an. Basis-URL: http://localhost:3100/api/v1
@Controller("v1")
export class CompatController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(RunsService) private readonly runs: RunsService,
  ) {}

  /** „Modelle" = Agenten. */
  @Get("models")
  async models() {
    const ags = await this.db.select().from(agents);
    return { object: "list", data: ags.map((a) => ({ id: a.id, object: "model", owned_by: "agency-os", name: a.displayName })) };
  }

  /** Chat-Completion → führt den gewählten Agenten aus (Akte/Toggles/Budget werden erzwungen). */
  @Post("chat/completions")
  async chat(@Body() body: { model?: string; messages?: { role: string; content: unknown }[] }) {
    const msgs = body.messages ?? [];
    const userMsg = [...msgs].reverse().find((m) => m.role === "user")?.content ?? "";
    const task = typeof userMsg === "string" ? userMsg : JSON.stringify(userMsg);
    const model = String(body.model ?? "");
    let agent: any = null;
    if (model) {
      const [byId] = await this.db.select().from(agents).where(eq(agents.id, model));
      agent = byId ?? null;
    }
    if (!agent) {
      const all = await this.db.select().from(agents);
      agent = all.find((a) => a.displayName.toLowerCase() === model.toLowerCase()) ?? all.find((a) => a.status === "active") ?? all[0];
    }
    if (!agent) throw new BadRequestException("Kein Agent gefunden (Parameter 'model')");
    const r: any = await this.runs.run(agent.id, task);
    return {
      id: "chatcmpl-" + (r.runId ?? "x"),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: agent.displayName,
      choices: [
        { index: 0, message: { role: "assistant", content: r.result ?? r.error ?? "" }, finish_reason: r.status === "completed" ? "stop" : "error" },
      ],
      usage: { total_cost_cents: r.costCents ?? 0, degraded: !!r.degraded },
    };
  }
}
