import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import { makePkce, signSession, verifyRs256, verifySession } from "../src/auth/jwt.js";

test("HS256-Session: Roundtrip", () => {
  const tok = signSession({ uid: "u1" }, "secret", 60);
  const p = verifySession(tok, "secret");
  assert.equal(p?.uid, "u1");
});

test("HS256-Session: falsches Secret / Manipulation / Ablauf abgelehnt", () => {
  const tok = signSession({ uid: "u1" }, "secret", 60);
  assert.equal(verifySession(tok, "anderes"), null);
  assert.equal(verifySession(tok.slice(0, -2) + "xx", "secret"), null);
  assert.equal(verifySession(signSession({ uid: "u1" }, "secret", -10), "secret"), null);
});

test("PKCE: challenge = base64url(sha256(verifier))", () => {
  const { verifier, challenge } = makePkce();
  assert.equal(createHash("sha256").update(verifier).digest("base64url"), challenge);
});

test("RS256-ID-Token: Verifikation, Manipulation, falscher Schlüssel", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk: any = publicKey.export({ format: "jwk" });
  jwk.kid = "key1";
  jwk.alg = "RS256";
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const data = `${b64({ alg: "RS256", typ: "JWT", kid: "key1" })}.${b64({ sub: "abc", email: "x@y.de", exp: Math.floor(Date.now() / 1000) + 300 })}`;
  const sig = createSign("RSA-SHA256").update(data).end().sign(privateKey).toString("base64url");
  const idTok = `${data}.${sig}`;

  assert.equal(verifyRs256(idTok, { keys: [jwk] })?.email, "x@y.de");
  assert.equal(verifyRs256(`${data}.${sig.slice(0, -2)}AA`, { keys: [jwk] }), null);
  const other: any = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "jwk" });
  other.kid = "key1";
  assert.equal(verifyRs256(idTok, { keys: [other] }), null);
});
