import { Module } from "@nestjs/common";
import { TogglesService } from "./toggles.service.js";
import { RbacGuard } from "./rbac.guard.js";
import { AccessController } from "./access.controller.js";

@Module({
  controllers: [AccessController],
  providers: [TogglesService, RbacGuard],
  exports: [TogglesService, RbacGuard],
})
export class AccessModule {}
