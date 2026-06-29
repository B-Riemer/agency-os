import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { RunsService } from "./runs.service.js";
import { AdapterRegistry } from "./adapter.registry.js";

@Controller()
export class RunsController {
  constructor(
    @Inject(RunsService) private readonly runs: RunsService,
    @Inject(AdapterRegistry) private readonly registry: AdapterRegistry,
  ) {}

  /** Verfügbare Adapter-Typen (für den Onboarding-Wizard). */
  @Get("adapters")
  adapters() {
    return { types: this.registry.types() };
  }

  /** Verbindungstest im Wizard, bevor der Agent angelegt wird. */
  @Post("adapters/test")
  testConfig(@Body() body: { type: string; config: Record<string, unknown> }) {
    return this.runs.testConfig(body.type, body.config);
  }

  /** Externen/internen Agenten ausführen — Kern erzwingt Toggles/Budget/Audit. */
  @Post("agents/:id/run")
  run(@Param("id") id: string, @Body("task") task: string) {
    return this.runs.run(id, task);
  }

  /** Verbindungstest beim Onboarding. */
  @Post("agents/:id/test")
  test(@Param("id") id: string) {
    return this.runs.test(id);
  }

  /** Proaktiver Heartbeat eines (externen) Agenten. */
  @Post("agents/:id/heartbeat")
  heartbeat(@Param("id") id: string, @Body() body: { state: string; note?: string }) {
    return this.runs.heartbeat(id, body.state, body.note);
  }
}
