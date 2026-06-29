// Säule 4 — Skill-/Tool-System: Skills mit Schema/Version/Policy + Zuweisung an Agenten.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { companies } from "./org";
import { agents } from "./agents";

/** Policy: auto = läuft ohne Rückfrage; approval_required = erzeugt Approval-Gate. */
export const skillPolicy = pgEnum("skill_policy", ["auto", "approval_required"]);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = globaler Katalog-Skill; gesetzt = company-spezifisch installiert.
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    body: text("body"), // SKILL.md-Inhalt
    // Q7: input_schema erstklassig unterstützt, aber NICHT Pflicht (typsichere Validierung wenn vorhanden).
    inputSchema: jsonb("input_schema").$type<Record<string, unknown>>(),
    version: text("version").notNull().default("0.0.0"),
    contentHash: text("content_hash"), // Integrität: installedHash vs originHash
    trustLevel: text("trust_level"), // z. B. bundled | optional | community
    sourceType: text("source_type"), // catalog | github | url | local
    defaultPolicy: skillPolicy("default_policy").notNull().default("auto"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyKeyUnique: unique("skills_company_key_unique").on(t.companyId, t.key),
  }),
);

/** Zuweisung Skill→Agent, versioniert, mit Policy-Override und Toggle (enabled). */
export const agentSkills = pgTable(
  "agent_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    versionPin: text("version_pin"), // gepinnte Version
    policy: skillPolicy("policy"), // Override; null = skills.defaultPolicy
    scope: text("scope"),
    enabled: boolean("enabled").notNull().default(true), // Toggle pro Skill
    addedBy: uuid("added_by"), // user id (FK in RBAC-Datei)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    agentIdx: index("agent_skills_agent_idx").on(t.agentId),
    pairUnique: unique("agent_skills_agent_skill_unique").on(t.agentId, t.skillId),
  }),
);
