import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// AES-256-GCM. Schlüssel aus SECRETS_MASTER_KEY abgeleitet (local_encrypted, D4/DSGVO).
const RAW = process.env.SECRETS_MASTER_KEY ?? "dev-insecure-master-key-please-change";
const KEY = scryptSync(RAW, "agency-os-secrets-v1", 32);

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [iv, tag, enc] = ciphertext.split(".");
  const d = createDecipheriv("aes-256-gcm", KEY, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}
