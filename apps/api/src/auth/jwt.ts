// Krypto-Helfer für OIDC — bewusst dependency-frei (nur node:crypto).
//  - HS256-Session-Token (eigene Sessions, signiert mit SESSION_SECRET)
//  - PKCE (S256) + State/Nonce
//  - RS256-Verifikation des ID-Tokens gegen die JWKS des Providers
import { createHash, createHmac, createPublicKey, createVerify, randomBytes, timingSafeEqual } from "node:crypto";

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// --- eigene Session-Tokens (HS256) ---------------------------------------
export function signSession(payload: Record<string, unknown>, secret: string, expiresInSec = 60 * 60 * 8): string {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = `${b64urlJson({ alg: "HS256", typ: "JWT" })}.${b64urlJson(body)}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token: string, secret: string): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = createHmac("sha256", secret).update(`${h}.${b}`).digest("base64url");
  if (!safeEqual(s, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- PKCE / State / Nonce -------------------------------------------------
export function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

// --- ID-Token-Verifikation (RS256 gegen JWKS) -----------------------------
export interface Jwks {
  keys: Array<Record<string, any> & { kid?: string; alg?: string }>;
}

export function decodeJwtHeader(token: string): Record<string, any> | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  } catch {
    return null;
  }
}

/** Verifiziert ein RS256-ID-Token gegen die JWKS und gibt die Claims zurück (oder null). */
export function verifyRs256(token: string, jwks: Jwks): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const header = decodeJwtHeader(token);
  if (!header) return null;
  const jwk = jwks.keys.find((k) => k.kid === header.kid) ?? jwks.keys.find((k) => (k.alg ?? "RS256") === "RS256") ?? jwks.keys[0];
  if (!jwk) return null;
  try {
    const key = createPublicKey({ key: jwk as any, format: "jwk" });
    const ok = createVerify("RSA-SHA256").update(`${h}.${b}`).end().verify(key, Buffer.from(s, "base64url"));
    if (!ok) return null;
    return JSON.parse(Buffer.from(b, "base64url").toString());
  } catch {
    return null;
  }
}
