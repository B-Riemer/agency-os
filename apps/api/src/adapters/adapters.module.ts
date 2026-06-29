import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module.js";
import { GovernanceModule } from "../governance/governance.module.js";
import { RagModule } from "../rag/rag.module.js";
import { SecretsModule } from "../secrets/secrets.module.js";
import { AdapterRegistry } from "./adapter.registry.js";
import { RunsService } from "./runs.service.js";
import { RunsController } from "./runs.controller.js";

@Module({
  imports: [AccessModule, GovernanceModule, RagModule, SecretsModule],
  controllers: [RunsController],
  providers: [AdapterRegistry, RunsService],
  exports: [AdapterRegistry, RunsService],
})
export class AdaptersModule {}
