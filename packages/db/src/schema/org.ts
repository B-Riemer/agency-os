// Säule 1 — Firmenstruktur: Company → Departments (Teams).
import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";

/** Mehrere Companies pro Deployment, vollständig isoliert über company_id (Säule 7). */
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Abteilung/Team — funktionaler Bereich (z. B. key="ENG"). Reine Org-Struktur, ≠ Berechtigung. */
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(), // kurzer Schlüssel, z. B. "ENG", "CONTENT"
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyIdx: index("departments_company_idx").on(t.companyId),
    keyUnique: unique("departments_company_key_unique").on(t.companyId, t.key),
  }),
);
