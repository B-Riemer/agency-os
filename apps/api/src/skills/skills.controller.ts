import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { SkillsService } from "./skills.service.js";

@Controller()
export class SkillsController {
  constructor(@Inject(SkillsService) private readonly skills: SkillsService) {}

  @Get("companies/:companyId/skills")
  catalog(@Param("companyId") companyId: string) {
    return this.skills.catalog(companyId);
  }

  @Get("agents/:id/skills")
  agentSkills(@Param("id") id: string) {
    return this.skills.agentSkills(id);
  }

  @Post("agents/:id/skills")
  assign(
    @Param("id") id: string,
    @Body() body: { skillId: string; policy?: "auto" | "approval_required" },
  ) {
    return this.skills.assign(id, body.skillId, body.policy);
  }

  @Patch("agents/:id/skills/:skillId")
  toggle(
    @Param("id") id: string,
    @Param("skillId") skillId: string,
    @Body("enabled") enabled: boolean,
  ) {
    return this.skills.setEnabled(id, skillId, enabled);
  }
}
