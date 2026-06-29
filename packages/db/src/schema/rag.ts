// Säule 4/5 — Wissensordner (RAG) + Permission-Mirroring (Zylon/companyGPT-Idee):
// ein Agent „sieht" nur die Wissensordner, die ihm explizit freigeschaltet sind.
import { pgTable, uuid, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./org";
import { agents } from "./agents";

export const knowledgeFolders = pgTable(
  "knowledge_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // Sensibilität für Mirroring-Logik (z. B. public | internal | confidential).
    sensitivity: text("sensitivity").notNull().default("internal"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyNameUnique: unique("knowledge_folders_company_name_unique").on(t.companyId, t.name),
  }),
);

/** Zugriff Agent → Wissensordner (default-deny; enabled steuert Sichtbarkeit zur Laufzeit). */
export const agentKnowledgeFolders = pgTable(
  "agent_knowledge_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => knowledgeFolders.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    agentIdx: index("agent_knowledge_folders_agent_idx").on(t.agentId),
    pairUnique: unique("agent_knowledge_folders_unique").on(t.agentId, t.folderId),
  }),
);
