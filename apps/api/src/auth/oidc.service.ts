import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, or } from "drizzle-orm";
import { type Db, users, userRoles, roles, companies } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { makePkce, randomToken, signSession, verifySession, verifyRs256, type Jwks } from "./jwt.js";

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

interface PendingLogin {
  verifier: string;
  nonce: string;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  email: string;
  roleKeys: string[];
}

// Säule 3 — OIDC (Authorization Code + PKCE). Provider-agnostisch via Discovery.
// Opt-in: aktiv nur, wenn OIDC_ISSUER + OIDC_CLIENT_ID + OIDC_REDIRECT_URI gesetzt sind.
@Injectable()
export class OidcService {
  private readonly log = new Logger("OIDC");
  private discoveryCache?: Discovery;
  private jwksCache?: { at: number; jwks: Jwks };
  private readonly pending = new Map<string, PendingLogin>();

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  isEnabled(): boolean {
    return !!(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_REDIRECT_URI);
  }

  private sessionSecret(): string {
    return (
      process.env.SESSION_SECRET ??
      process.env.AUTH_SESSION_SECRET ??
      process.env.SECRETS_MASTER_KEY ??
      "agency-os-dev-session-secret"
    );
  }

  private webUrl(): string {
    return process.env.WEB_URL ?? "http://localhost:5173";
  }

  // --- Session (eigene Tokens) -------------------------------------------
  issueSession(userId: string): string {
    return signSession({ uid: userId }, this.sessionSecret());
  }

  verifySessionToken(token: string): { uid: string } | null {
    const p = verifySession(token, this.sessionSecret());
    return p?.uid ? { uid: p.uid } : null;
  }

  async loadUser(userId: string): Promise<SessionUser | null> {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) return null;
    const rs = await this.db
      .select({ key: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, u.id));
    return { id: u.id, email: u.email, roleKeys: rs.map((r) => r.key) };
  }

  // --- OIDC-Discovery -----------------------------------------------------
  private async discovery(): Promise<Discovery> {
    if (this.discoveryCache) return this.discoveryCache;
    const base = process.env.OIDC_ISSUER!.replace(/\/+$/, "");
    const url = `${base}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OIDC-Discovery fehlgeschlagen (${res.status}) bei ${url}`);
    const d = (await res.json()) as Discovery;
    this.discoveryCache = d;
    return d;
  }

  private async jwks(): Promise<Jwks> {
    if (this.jwksCache && Date.now() - this.jwksCache.at < 10 * 60_000) return this.jwksCache.jwks;
    const d = await this.discovery();
    const res = await fetch(d.jwks_uri);
    if (!res.ok) throw new Error(`JWKS-Abruf fehlgeschlagen (${res.status})`);
    const jwks = (await res.json()) as Jwks;
    this.jwksCache = { at: Date.now(), jwks };
    return jwks;
  }

  // --- Login-Start --------------------------------------------------------
  async buildAuthUrl(): Promise<string> {
    const d = await this.discovery();
    const { verifier, challenge } = makePkce();
    const state = randomToken();
    const nonce = randomToken();
    this.gcPending();
    this.pending.set(state, { verifier, nonce, createdAt: Date.now() });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.OIDC_CLIENT_ID!,
      redirect_uri: process.env.OIDC_REDIRECT_URI!,
      scope: process.env.OIDC_SCOPES ?? "openid email profile",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `${d.authorization_endpoint}?${params.toString()}`;
  }

  private gcPending(): void {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [k, v] of this.pending) if (v.createdAt < cutoff) this.pending.delete(k);
  }

  // --- Callback -----------------------------------------------------------
  /** Tauscht den Code, verifiziert das ID-Token, provisioniert den User, gibt Session-JWT + Ziel-URL zurück. */
  async handleCallback(code: string, state: string): Promise<{ sessionToken: string; redirectTo: string }> {
    const p = this.pending.get(state);
    if (!p) throw new Error("Ungültiger oder abgelaufener State");
    this.pending.delete(state);

    const d = await this.discovery();
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.OIDC_REDIRECT_URI!,
      client_id: process.env.OIDC_CLIENT_ID!,
      code_verifier: p.verifier,
    });
    if (process.env.OIDC_CLIENT_SECRET) form.set("client_secret", process.env.OIDC_CLIENT_SECRET);

    const tokenRes = await fetch(d.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form.toString(),
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as { id_token?: string; error_description?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.id_token) {
      throw new Error(tokenJson.error_description ?? tokenJson.error ?? `Token-Exchange fehlgeschlagen (${tokenRes.status})`);
    }

    const claims = verifyRs256(tokenJson.id_token, await this.jwks());
    if (!claims) throw new Error("ID-Token-Signatur ungültig (nur RS256 unterstützt)");
    // Claims prüfen: Issuer, Audience, Ablauf, Nonce.
    if (claims.iss !== d.issuer) throw new Error("Issuer-Mismatch");
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(process.env.OIDC_CLIENT_ID)) throw new Error("Audience-Mismatch");
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) throw new Error("ID-Token abgelaufen");
    if (claims.nonce && claims.nonce !== p.nonce) throw new Error("Nonce-Mismatch");

    const user = await this.upsertUser(claims);
    return { sessionToken: this.issueSession(user.id), redirectTo: this.webUrl() };
  }

  /** Findet den User (per oidc_subject oder email) oder legt ihn mit Default-Rolle an. */
  private async upsertUser(claims: Record<string, any>): Promise<{ id: string }> {
    const email = String(claims.email ?? "").toLowerCase();
    const sub = String(claims.sub ?? "");
    if (!email && !sub) throw new Error("ID-Token ohne email/sub");

    const [existing] = await this.db
      .select()
      .from(users)
      .where(sub && email ? or(eq(users.oidcSubject, sub), eq(users.email, email)) : sub ? eq(users.oidcSubject, sub) : eq(users.email, email));

    if (existing) {
      if (!existing.oidcSubject && sub) {
        await this.db.update(users).set({ oidcSubject: sub }).where(eq(users.id, existing.id));
      }
      return { id: existing.id };
    }

    const [created] = await this.db
      .insert(users)
      .values({ email: email || `${sub}@oidc.local`, displayName: claims.name ?? claims.preferred_username ?? email, oidcSubject: sub || null })
      .returning();

    // Default-Rolle in der ersten Company zuweisen (konfigurierbar via OIDC_DEFAULT_ROLE).
    const roleKey = process.env.OIDC_DEFAULT_ROLE ?? "member";
    const [company] = await this.db.select().from(companies).limit(1);
    if (company) {
      const [role] = await this.db.select().from(roles).where(eq(roles.companyId, company.id));
      const target = role && role.key === roleKey ? role : (await this.db.select().from(roles).where(eq(roles.companyId, company.id))).find((r) => r.key === roleKey);
      if (target) {
        await this.db.insert(userRoles).values({ userId: created.id, roleId: target.id, companyId: company.id }).onConflictDoNothing();
        this.log.log(`Neuer OIDC-User ${created.email} → Rolle '${roleKey}'`);
      } else {
        this.log.warn(`OIDC-User ${created.email} angelegt, aber Rolle '${roleKey}' nicht gefunden`);
      }
    }
    return { id: created.id };
  }
}
