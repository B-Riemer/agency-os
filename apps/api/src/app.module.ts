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
import { CompatModule } from "./compat/compat.module.js";
import { SecretsModule } from "./secrets/secrets.module.js";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthGuard } from "./access/auth.guard.js";
import { RbacGuard } from "./access/rbac.guard.js";
import { AuditInterceptor } from "./common/audit.interceptor.js";

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
    SecretsModule,
    TasksModule,
    RoutinesModule,
    CompatModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard }, // setzt req.user (dev-offen, AUTH_MODE=strict erzwingt)
    { provide: APP_GUARD, useClass: RbacGuard }, // prüft @RequirePermission
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
