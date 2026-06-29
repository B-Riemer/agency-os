import { Module } from "@nestjs/common";
import { TogglesService } from "./toggles.service.js";
import { RbacGuard } from "./rbac.guard.js";
import { AuthGuard } from "./auth.guard.js";
import { AccessController } from "./access.controller.js";

@Module({
  controllers: [AccessController],
  providers: [TogglesService, RbacGuard, AuthGuard],
  exports: [TogglesService, RbacGuard, AuthGuard],
})
export class AccessModule {}
