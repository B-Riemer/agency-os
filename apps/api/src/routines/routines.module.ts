import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters/adapters.module.js";
import { GovernanceModule } from "../governance/governance.module.js";
import { RoutinesController } from "./routines.controller.js";
import { RoutinesService } from "./routines.service.js";
import { SchedulerService } from "./scheduler.service.js";

@Module({
  imports: [AdaptersModule, GovernanceModule],
  controllers: [RoutinesController],
  providers: [RoutinesService, SchedulerService],
  exports: [RoutinesService],
})
export class RoutinesModule {}
