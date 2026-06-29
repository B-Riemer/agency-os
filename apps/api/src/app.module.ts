import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { CompaniesModule } from "./companies/companies.module.js";
import { AgentsModule } from "./agents/agents.module.js";
import { AccessModule } from "./access/access.module.js";
import { AdaptersModule } from "./adapters/adapters.module.js";
import { GovernanceModule } from "./governance/governance.module.js";
import { SkillsModule } from "./skills/skills.module.js";
import { RagModule } from "./rag/rag.module.js";
import { TasksModule } from "./tasks/tasks.module.js";
import { RoutinesModule } from "./routines/routines.module.js";

@Module({
  imports: [
    DatabaseModule,
    CompaniesModule,
    AccessModule,
    GovernanceModule,
    AgentsModule,
    AdaptersModule,
    SkillsModule,
    RagModule,
    TasksModule,
    RoutinesModule,
  ],
})
export class AppModule {}
