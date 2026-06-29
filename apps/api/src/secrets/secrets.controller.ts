import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { SecretsService } from "./secrets.service.js";

@Controller()
export class SecretsController {
  constructor(@Inject(SecretsService) private readonly secrets: SecretsService) {}

  @Get("companies/:companyId/secrets")
  list(@Param("companyId") companyId: string) {
    return this.secrets.list(companyId);
  }

  @Post("companies/:companyId/secrets")
  create(@Param("companyId") companyId: string, @Body() b: { name: string; value: string }) {
    return this.secrets.create(companyId, b.name, b.value);
  }

  @Post("secrets/:id/bind")
  bind(@Param("id") id: string, @Body() b: { agentId: string; envKey: string }) {
    return this.secrets.bind(id, b.agentId, b.envKey);
  }

  @Get("agents/:id/secrets")
  bindings(@Param("id") id: string) {
    return this.secrets.bindingsFor(id);
  }
}
