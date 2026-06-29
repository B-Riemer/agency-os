import { Controller, Get, Inject, Post, Query, Req, Res } from "@nestjs/common";
import { OidcService } from "./oidc.service.js";

// Auth-Endpunkte. /auth/config, /auth/login, /auth/callback sind öffentlich (Guard lässt sie durch);
// /auth/me & /auth/logout laufen durch den Guard.
@Controller()
export class AuthController {
  constructor(@Inject(OidcService) private readonly oidc: OidcService) {}

  private cookie(token: string, maxAgeSec: number): string {
    const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
    return `agos_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
  }

  @Get("auth/config")
  config() {
    return { enabled: this.oidc.isEnabled() };
  }

  @Get("auth/login")
  async login(@Res() reply: any) {
    if (!this.oidc.isEnabled()) return reply.code(404).send({ error: "OIDC nicht konfiguriert" });
    const url = await this.oidc.buildAuthUrl();
    return reply.code(302).header("location", url).send();
  }

  @Get("auth/callback")
  async callback(@Query("code") code: string, @Query("state") state: string, @Res() reply: any) {
    try {
      const { sessionToken, redirectTo } = await this.oidc.handleCallback(code, state);
      return reply
        .header("set-cookie", this.cookie(sessionToken, 60 * 60 * 8))
        .code(302)
        .header("location", redirectTo)
        .send();
    } catch (e) {
      return reply.code(401).send({ error: (e as Error).message });
    }
  }

  @Get("auth/me")
  me(@Req() req: any) {
    return req.user ?? null;
  }

  @Post("auth/logout")
  logout(@Res() reply: any) {
    reply.header("set-cookie", this.cookie("", 0));
    return reply.send({ ok: true });
  }
}
