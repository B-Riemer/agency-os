import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { AgentsService } from "./agents.service.js";
import { CreateAgentDto } from "./dto/create-agent.dto.js";
import { RequirePermission } from "../access/permissions.decorator.js";

@Controller("companies/:companyId/agents")
export class AgentsController {
  constructor(@Inject(AgentsService) private readonly agents: AgentsService) {}

  @Get()
  list(@Param("companyId") companyId: string) {
    return this.agents.list(companyId);
  }

  @Post()
  @RequirePermission("agent", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateAgentDto) {
    return this.agents.create(companyId, dto);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.agents.get(id);
  }

  @Patch(":id/status")
  setStatus(
    @Param("id") id: string,
    @Body("status") status: "onboarding" | "active" | "paused" | "terminated",
  ) {
    return this.agents.setStatus(id, status);
  }

  @Get(":id/versions")
  versions(@Param("id") id: string) {
    return this.agents.listVersions(id);
  }

  @Post(":id/versions")
  snapshot(@Param("id") id: string, @Body("note") note?: string) {
    return this.agents.snapshot(id, note);
  }

  @Post(":id/versions/:vid/promote")
  promote(@Param("id") id: string, @Param("vid") vid: string) {
    return this.agents.promote(id, vid);
  }

  @Patch(":id/runtime")
  setRuntime(
    @Param("id") id: string,
    @Body() dto: { adapterType?: string; adapterConfig?: Record<string, unknown> },
  ) {
    return this.agents.setRuntime(id, dto);
  }

  @Patch(":id/sovereignty")
  sovereignty(@Param("id") id: string, @Body("level") level: "eu_only" | "eu_plus" | "global" | "global_pii") {
    return this.agents.setSovereignty(id, level);
  }

  @Patch(":id/budget-fallback")
  budgetFallback(@Param("id") id: string, @Body("enabled") enabled: boolean) {
    return this.agents.setBudgetFallback(id, enabled);
  }

  @Post(":id/rotate-token")
  rotateToken(@Param("id") id: string) {
    return this.agents.rotateToken(id);
  }
}
