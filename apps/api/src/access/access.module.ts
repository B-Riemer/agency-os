import { Module } from "@nestjs/common";
import { TogglesService } from "./toggles.service.js";
import { RbacGuard } from "./rbac.guard.js";
import { AuthGuard } from "./auth.guard.js";
import { AccessController } from "./access.controller.js";
import { OidcService } from "../auth/oidc.service.js";
import { AuthController } from "../auth/auth.controller.js";

@Module({
  controllers: [AccessController, AuthController],
  providers: [TogglesService, RbacGuard, AuthGuard, OidcService],
  exports: [TogglesService, RbacGuard, AuthGuard, OidcService],
})
export class AccessModule {}
