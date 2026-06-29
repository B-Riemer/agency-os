// Säule 6 — Orchestrierung: Tickets/Tasks + Routinen (cron) + Wakeup-Loop.
import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { companies } from "./org";
import { agents } from "./agents";

export const taskStatus = pgEnum("task_status", ["backlog", "in_progress", "review", "done", "blocked"]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("backlog"),
    priority: integer("priority").notNull().default(2), // 0 (highest) – 4
    assigneeId: uuid("assignee_id").references(() => agents.id, { onDelete: "set null" }),
    createdBy: text("created_by"), // user | routine
    resultRef: text("result_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("tasks_company_idx").on(t.companyId),
    statusIdx: index("tasks_status_idx").on(t.status),
  }),
);

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cron: text("cron").notNull(), // z. B. "0 8 * * *"
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    taskTitleTemplate: text("task_title_template").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("routines_company_idx").on(t.companyId),
  }),
);
