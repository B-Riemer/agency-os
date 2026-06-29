import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { type Db, users, userRoles, roles } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 3 — Auth. M1: API-Key (Header x-api-key) ODER dev-offener lokaler Owner.
// Produktion/Enterprise: AUTH_MODE=strict erzwingt gültige Credentials; OIDC folgt (D7).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();
    const key = req.headers?.["x-api-key"];
    if (key) {
      const [u] = await this.db.select().from(users).where(eq(users.apiKey, String(key)));
      if (u) {
        const rs = await this.db
          .select({ key: roles.key })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, u.id));
        req.user = { id: u.id, email: u.email, roleKeys: rs.map((r) => r.key) };
        return true;
      }
      if (process.env.AUTH_MODE === "strict") return false;
    } else if (process.env.AUTH_MODE === "strict") {
      return false;
    }
    // Dev-Default: lokaler Owner mit board-Rolle — hält die App ohne Login offen.
    req.user = req.user ?? { id: "local", email: "local@dev", roleKeys: ["board"] };
    return true;
  }
}
