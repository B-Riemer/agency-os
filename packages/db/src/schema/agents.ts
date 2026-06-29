// Säule 2 — Personalwirtschaft: die "Agenten-Akte" (Mitarbeiter mit Akte).
// Vereint Identität, Herkunft (intern/extern = USP), Eigenschaften, Status, Budget.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  foreignKey,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { companies, departments } from "./org";

/** Herkunft: app-intern erstellt ODER extern eingebunden (USP). */
export const agentKind = pgEnum("agent_kind", ["internal", "external"]);

/** Lebenszyklus laut Charter. */
export const agentStatus = pgEnum("agent_status", [
  "onboarding",
  "active",
  "paused",
  "terminated",
]);

/** Souveränitäts-Stufe (meinGPT-Idee): EU-only → … → weltweit inkl. PII. */
export const sovereigntyLevel = pgEnum("sovereignty_level", [
  "eu_only",
  "eu_plus",
  "global",
  "global_pii",
]);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // --- Identität ---
    displayName: text("display_name").notNull(),
    role: text("role"), // Titel/Rolle
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    // Reporting-Linie (self-FK). REIN ORGANISATORISCH — NICHT mit RBAC vermischen.
    managerId: uuid("manager_id"),

    // --- Herkunft (USP) ---
    kind: agentKind("kind").notNull().default("internal"),
    // adapter_type bewusst TEXT (nicht enum): Plugin-erweiterbar.
    // Werte z. B.: internal | http | process | mcp | openai | claude_local | a2a
    adapterType: text("adapter_type").notNull().default("internal"),
    adapterConfig: jsonb("adapter_config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    // --- Eigenschaften ---
    modelConfig: jsonb("model_config").$type<Record<string, unknown>>(),
    systemPrompt: text("system_prompt"),
    // Wissensordner (RAG) folgen in M7 als eigene Verknüpfungstabelle.

    // --- Status ---
    status: agentStatus("status").notNull().default("onboarding"),

    // --- Budget / Cost-Cap (in Cents) ---
    budgetMonthlyCents: integer("budget_monthly_cents"), // null = unbegrenzt
    spentMonthlyCents: integer("spent_monthly_cents").notNull().default(0),
    autoPausePercent: integer("auto_pause_percent").notNull().default(100),
    // USP-Welle: Souveränität + Budget-Verhalten bei Cap-Erreichung.
    sovereignty: sovereigntyLevel("sovereignty").notNull().default("eu_plus"),
    budgetFallback: boolean("budget_fallback").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("agents_company_idx").on(t.companyId),
    statusIdx: index("agents_status_idx").on(t.status),
    managerFk: foreignKey({
      columns: [t.managerId],
      foreignColumns: [t.id],
      name: "agents_manager_fk",
    }).onDelete("set null"),
  }),
);

/** Versionierte Akte (Feature: Promote/Rollback) — Snapshot der Agenten-Konfig. */
export const agentVersions = pgTable(
  "agent_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    agentIdx: index("agent_versions_agent_idx").on(t.agentId),
    versionUnique: unique("agent_versions_unique").on(t.agentId, t.version),
  }),
);
