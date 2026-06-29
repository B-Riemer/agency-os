import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { type Db, users, userRoles, roles } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { OidcService } from "../auth/oidc.service.js";

/** Session-Token aus Cookie (agos_session) oder Authorization: Bearer lesen. */
function readSessionToken(req: any): string | undefined {
  const auth = req.headers?.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers?.cookie;
  if (typeof cookie === "string") {
    for (const part of cookie.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k === "agos_session") return v.join("=");
    }
  }
  return undefined;
}

// Säule 3 — Auth. Drei Wege: API-Key (x-api-key), OIDC-Session (Cookie/Bearer),
// oder dev-offener lokaler Owner. AUTH_MODE=strict erzwingt echte Credentials.
// /auth/login|callback|config sind immer öffentlich (sonst kein Login möglich).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(OidcService) private readonly oidc: OidcService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();
    const path = String(req.url ?? "").split("?")[0];
    if (path.includes("/auth/login") || path.includes("/auth/callback") || path.includes("/auth/config")) {
      return true; // öffentliche Auth-Endpunkte
    }

    // 1) API-Key (maschinelle Auth)
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
    }

    // 2) OIDC-Session
    const token = readSessionToken(req);
    if (token) {
      const s = this.oidc.verifySessionToken(token);
      if (s) {
        const u = await this.oidc.loadUser(s.uid);
        if (u) {
          req.user = u;
          return true;
        }
      }
      if (process.env.AUTH_MODE === "strict") return false;
    }

    // 3) Strikt: ohne gültige Credentials Schluss.
    if (process.env.AUTH_MODE === "strict") return false;

    // Dev-Default: lokaler Owner mit board-Rolle — hält die App ohne Login offen.
    req.user = req.user ?? { id: "local", email: "local@dev", roleKeys: ["board"] };
    return true;
  }
}
