import { defineConfig } from "drizzle-kit";

// Drizzle-Kit liest DATABASE_URL aus der Umgebung (.env im Repo-Root).
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://agency:change_me_local@localhost:5432/agency_os",
  },
  verbose: true,
  strict: true,
});
