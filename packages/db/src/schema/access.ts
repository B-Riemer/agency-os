// Säule 3 — Berechtigung & Zugang: zwei getrennte Achsen (Plan Phase 5).
//  (A) RBAC  = wer (Mensch) darf konfigurieren/sehen.
//  (B) Toggle = was darf DIESER Agent zur Laufzeit nutzen (default-deny).
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { companies } from "./org";
import { agents } from "./agents";

// --- (B) Universelle Toggle-Engine ---------------------------------------
export const toggleTarget = pgEnum("toggle_target", [
  "tool",
  "integration",
  "secret",
  "dataroom",
]);

/** Ein boolean pro (Agent × Ziel). Default-deny: fehlt die Zeile/false ⇒ verboten. */
export const agentToggles = pgTable(
  "agent_toggles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    targetType: toggleTarget("target_type").notNull(),
    targetId: text("target_id").notNull(), // z. B. Tool-Name oder Integration-ID
    enabled: boolean("enabled").notNull().default(false),
    grantedBy: uuid("granted_by"), // user id
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    agentIdx: index("agent_toggles_agent_idx").on(t.agentId),
    targetUnique: unique("agent_toggles_unique").on(t.agentId, t.targetType, t.targetId),
  }),
);

// --- (A) RBAC für Menschen ------------------------------------------------
/** Menschliche Nutzer (Identität kommt via OIDC; hier nur Referenz + Profil). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  // Verknüpfung zum OIDC-Subject (sub), wenn vorhanden.
  oidcSubject: text("oidc_subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Rollen pro Company (z. B. board, admin, editor, member). */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // board | admin | editor | member
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyKeyUnique: unique("roles_company_key_unique").on(t.companyId, t.key),
  }),
);

/** Granulare Permission: Ressourcentyp × Aktion (z. B. agent:edit, budget:approve). */
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resource: text("resource").notNull(), // agent | skill | integration | budget | audit | company
    action: text("action").notNull(), // view | edit | approve | admin
  },
  (t) => ({
    pairUnique: unique("permissions_resource_action_unique").on(t.resource, t.action),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: unique("role_permissions_pk").on(t.roleId, t.permissionId),
  }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: unique("user_roles_pk").on(t.userId, t.roleId, t.companyId),
    userIdx: index("user_roles_user_idx").on(t.userId),
  }),
);
