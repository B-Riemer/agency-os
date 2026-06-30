import { Module } from "@nestjs/common";
import { TogglesService } from "./toggles.service.js";
import { RbacGuard } from "./rbac.guard.js";
import { AuthGuard } from "./auth.guard.js";
import { AccessController } from "./access.controller.js";
import { OidcService } from "../auth/oidc.service.js";
import { AuthController } from "../auth/auth.controller.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { SystemController } from "./system.controller.js";

@Module({
  controllers: [AccessController, AuthController, UsersController, SystemController],
  providers: [TogglesService, RbacGuard, AuthGuard, OidcService, UsersService],
  exports: [TogglesService, RbacGuard, AuthGuard, OidcService, UsersService],
})
export class AccessModule {}
