import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service.js";
import { GovernanceService } from "./governance.service.js";
import { GovernanceController } from "./governance.controller.js";

@Module({
  controllers: [GovernanceController],
  providers: [AuditService, GovernanceService],
  exports: [AuditService, GovernanceService],
})
export class GovernanceModule {}
