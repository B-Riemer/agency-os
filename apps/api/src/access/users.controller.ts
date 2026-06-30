import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { RequirePermission } from "./permissions.decorator.js";

// Nutzer-/Rollenverwaltung — nur board/admin (RequirePermission mit action != view).
@Controller()
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get("users")
  @RequirePermission("user", "manage")
  list() {
    return this.users.list();
  }

  @Get("companies/:id/roles")
  @RequirePermission("user", "manage")
  roles(@Param("id") id: string) {
    return this.users.rolesFor(id);
  }

  @Post("users/:id/roles")
  @RequirePermission("user", "manage")
  grant(@Param("id") id: string, @Body("roleKey") roleKey: string) {
    return this.users.grant(id, roleKey);
  }

  @Delete("users/:id/roles/:roleKey")
  @RequirePermission("user", "manage")
  revoke(@Param("id") id: string, @Param("roleKey") roleKey: string) {
    return this.users.revoke(id, roleKey);
  }
}
