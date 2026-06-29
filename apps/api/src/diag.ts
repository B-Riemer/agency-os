// Diagnose: prüft alle Abfragen, die die Web-UI beim Start macht.
import { createDb, companies, departments, agents, auditLog } from "@agency-os/db";
import { desc, eq } from "drizzle-orm";

async function check(name: string, fn: () => Promise<unknown[]>) {
  try {
    const rows = await fn();
    console.log(`OK  ${name}: ${rows.length} Zeilen`);
  } catch (e: any) {
    console.error(`FEHLER ${name}: ${e?.message} (code ${e?.code})`);
    console.error(e);
  }
}

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL ?? "(default) localhost:5432/agency_os");
  const db = createDb();
  const cs = await db.select().from(companies);
  console.log("companies:", cs.length);
  const cid = cs[0]?.id;
  if (cid) {
    await check("departments", () => db.select().from(departments).where(eq(departments.companyId, cid)));
    await check("agents", () => db.select().from(agents).where(eq(agents.companyId, cid)));
    await check("audit", () =>
      db.select().from(auditLog).where(eq(auditLog.companyId, cid)).orderBy(desc(auditLog.createdAt)).limit(50),
    );
  }
  process.exit(0);
}
main();
