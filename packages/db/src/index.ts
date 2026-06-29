// Öffentliche API des DB-Pakets: Drizzle-Client-Factory + komplettes Schema.
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

export * from "./schema/index";
export { schema };

/**
 * Erzeugt einen typsicheren Drizzle-Client gegen Postgres.
 * `connectionString` defaultet auf DATABASE_URL.
 */
const DEFAULT_URL = "postgres://agency:change_me_local@localhost:5432/agency_os";

export function createDb(connectionString = process.env.DATABASE_URL ?? DEFAULT_URL) {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
}

export type Db = ReturnType<typeof createDb>;
