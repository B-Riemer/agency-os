import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { type Db, secrets, secretVersions, secretBindings, secretAccessEvents } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";
import { decryptSecret, encryptSecret } from "./crypto.js";

// Säule 7 / DSGVO — Secrets: verschlüsselt at rest, Sidecar-ENV-Injection, NIE in Prompts/Logs.
@Injectable()
export class SecretsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  list(companyId: string) {
    return this.db.select({ id: secrets.id, name: secrets.name, createdAt: secrets.createdAt }).from(secrets).where(eq(secrets.companyId, companyId));
  }

  async create(companyId: string, name: string, value: string) {
    const [s] = await this.db.insert(secrets).values({ companyId, name }).returning();
    await this.db.insert(secretVersions).values({ secretId: s.id, version: 1, ciphertext: encryptSecret(value) });
    return { id: s.id, name: s.name };
  }

  async bind(secretId: string, agentId: string, envKey: string) {
    const [b] = await this.db.insert(secretBindings).values({ secretId, targetType: "agent", targetId: agentId, envKey }).returning();
    return b;
  }

  bindingsFor(agentId: string) {
    return this.db
      .select({ envKey: secretBindings.envKey, secretId: secretBindings.secretId, name: secrets.name })
      .from(secretBindings)
      .innerJoin(secrets, eq(secretBindings.secretId, secrets.id))
      .where(and(eq(secretBindings.targetType, "agent"), eq(secretBindings.targetId, agentId)));
  }

  /** Sidecar-ENV für einen Agenten: gebundene Secrets entschlüsseln. Werte nie loggen. */
  async injectedEnvFor(agentId: string): Promise<Record<string, string>> {
    const binds = await this.db
      .select()
      .from(secretBindings)
      .where(and(eq(secretBindings.targetType, "agent"), eq(secretBindings.targetId, agentId)));
    const env: Record<string, string> = {};
    for (const b of binds) {
      const [v] = await this.db.select().from(secretVersions).where(eq(secretVersions.secretId, b.secretId)).orderBy(desc(secretVersions.version)).limit(1);
      if (!v) continue;
      try {
        env[b.envKey] = decryptSecret(v.ciphertext);
        await this.db.insert(secretAccessEvents).values({ secretId: b.secretId, actorType: "agent", actorId: agentId, action: "read" });
      } catch {
        // defekter Ciphertext überspringen
      }
    }
    return env;
  }
}
