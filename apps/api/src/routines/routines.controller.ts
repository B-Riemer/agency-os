import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { RoutinesService } from "./routines.service.js";

@Controller()
export class RoutinesController {
  constructor(@Inject(RoutinesService) private readonly routines: RoutinesService) {}

  @Get("companies/:companyId/routines")
  list(@Param("companyId") companyId: string) {
    return this.routines.list(companyId);
  }

  @Post("companies/:companyId/routines")
  create(@Param("companyId") companyId: string, @Body() dto: { name: string; cron: string; agentId?: string; taskTitleTemplate: string }) {
    return this.routines.create(companyId, dto);
  }

  @Patch("routines/:id")
  setEnabled(@Param("id") id: string, @Body("enabled") enabled: boolean) {
    return this.routines.setEnabled(id, enabled);
  }

  @Post("companies/:companyId/routines/tick")
  tick(@Param("companyId") companyId: string) {
    return this.routines.tick(companyId);
  }
}
