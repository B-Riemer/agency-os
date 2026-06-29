// Säule 7 / DSGVO — Secrets: versioniert, verschlüsselt at rest, Sidecar-Injection.
// Werte werden AES-verschlüsselt gespeichert und NUR als ENV in Agenten-Prozesse
// injiziert — niemals in Prompts oder Logs (redactEnvForLogs in der Runtime, M6).
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { companies } from "./org";

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyNameUnique: unique("secrets_company_name_unique").on(t.companyId, t.name),
  }),
);

/** Versionierte, verschlüsselte Werte (Rotation ohne Verlust der Historie). */
export const secretVersions = pgTable(
  "secret_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretId: uuid("secret_id")
      .notNull()
      .references(() => secrets.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    ciphertext: text("ciphertext").notNull(), // AES-verschlüsselt (local_encrypted)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    secretVersionUnique: unique("secret_versions_unique").on(t.secretId, t.version),
  }),
);

export const secretTarget = pgEnum("secret_target", ["agent", "routine", "project"]);

/** Bindung Secret→Ziel als ENV-Key (config_path unter env.*). */
export const secretBindings = pgTable(
  "secret_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretId: uuid("secret_id")
      .notNull()
      .references(() => secrets.id, { onDelete: "cascade" }),
    targetType: secretTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    envKey: text("env_key").notNull(), // Name der ENV-Variable im Agenten-Prozess
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    bindingUnique: unique("secret_bindings_unique").on(
      t.secretId,
      t.targetType,
      t.targetId,
      t.envKey,
    ),
    targetIdx: index("secret_bindings_target_idx").on(t.targetType, t.targetId),
  }),
);

/** Zugriffs-Audit auf Secrets (wer/was/wann). */
export const secretAccessEvents = pgTable("secret_access_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  secretId: uuid("secret_id")
    .notNull()
    .references(() => secrets.id, { onDelete: "cascade" }),
  actorType: text("actor_type").notNull(), // user | agent | system
  actorId: text("actor_id"),
  action: text("action").notNull(), // read | bind | rotate | revoke
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
