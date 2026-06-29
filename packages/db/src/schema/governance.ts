// Säule 7 — Governance: Kosten, append-only Audit, Approvals.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./org";
import { agents } from "./agents";

/** Einzelne Kosten-Buchung; summiert sich in agents.spentMonthlyCents (Auto-Pause). */
export const costEvents = pgTable(
  "cost_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    provider: text("provider"),
    model: text("model"),
    taskRef: text("task_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("cost_events_company_idx").on(t.companyId),
    agentIdx: index("cost_events_agent_idx").on(t.agentId),
  }),
);

/** Append-only Audit-Log: keine Updates/Deletes (durch App-Konvention + DB-Trigger in M6). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(), // user | agent | system
    actorId: text("actor_id"),
    action: text("action").notNull(), // z. B. tool_call | toggle_changed | hire | budget_pause
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("audit_log_company_idx").on(t.companyId),
    entityIdx: index("audit_log_entity_idx").on(t.entityType, t.entityId),
    createdIdx: index("audit_log_created_idx").on(t.createdAt),
  }),
);

export const approvalType = pgEnum("approval_type", [
  "agent_hire",
  "budget_override",
  "skill_approval",
  "strategy",
]);
export const approvalStatus = pgEnum("approval_status", ["pending", "approved", "rejected"]);

/** Board-/Manager-Freigaben (HITL-Gates). */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: approvalType("type").notNull(),
    status: approvalStatus("status").notNull().default("pending"),
    subjectType: text("subject_type"), // agent | skill | budget | ...
    subjectId: text("subject_id"),
    reason: text("reason"),
    requestedBy: text("requested_by"), // agent oder user
    decidedBy: uuid("decided_by"), // user id
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => ({
    companyStatusIdx: index("approvals_company_status_idx").on(t.companyId, t.status),
  }),
);
