import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERM_KEY } from "./permissions.decorator.js";

// Säule 3 — RBAC. Prüft @RequirePermission gegen die Rollen des Request-Users.
// Ohne @RequirePermission: frei. board/admin dürfen alles; member darf lesen (view).
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.get<{ resource: string; action: string } | undefined>(PERM_KEY, ctx.getHandler());
    if (!required) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const roleKeys: string[] = user?.roleKeys ?? [];
    if (roleKeys.includes("board") || roleKeys.includes("admin")) return true;
    if (required.action === "view") return true;
    return false;
  }
}
