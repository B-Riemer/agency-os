// Nutzer auflisten / Rolle vergeben (serverseitig, ohne Auth — Bootstrap für RBAC).
// Auflisten:  pnpm --filter @agency-os/api exec tsx src/grant-role-cli.ts
// Vergeben:   pnpm --filter @agency-os/api exec tsx src/grant-role-cli.ts <email> <board|admin|member>
import "./env.js";
import { and, eq } from "drizzle-orm";
import { createDb, users, roles, userRoles } from "@agency-os/db";

async function main() {
  const db = createDb();
  const [emailArg, roleArg] = process.argv.slice(2);

  // Ohne Argumente: alle Nutzer + ihre Rollen zeigen.
  if (!emailArg) {
    const us = await db.select().from(users);
    const urs = await db.select().from(userRoles);
    const rs = await db.select().from(roles);
    const roleKeyById = new Map(rs.map((r) => [r.id, r.key]));
    // eslint-disable-next-line no-console
    console.log("Nutzer (E-Mail · Rollen · Name):");
    for (const u of us) {
      const myRoles = urs
        .filter((x) => x.userId === u.id)
        .map((x) => roleKeyById.get(x.roleId))
        .filter(Boolean);
      // eslint-disable-next-line no-console
      console.log(`  ${u.email}  ·  [${myRoles.join(", ") || "—"}]  ·  ${u.displayName ?? ""}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      "\nRolle vergeben:\n  pnpm --filter @agency-os/api exec tsx src/grant-role-cli.ts <email> <board|admin|member>",
    );
    process.exit(0);
  }

  const email = emailArg.toLowerCase();
  const roleKey = roleArg ?? "board";
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    // eslint-disable-next-line no-console
    console.error(`Kein Nutzer mit E-Mail '${email}' gefunden.`);
    process.exit(1);
  }
  const targetRoles = (await db.select().from(roles)).filter((r) => r.key === roleKey);
  if (!targetRoles.length) {
    // eslint-disable-next-line no-console
    console.error(`Keine Rolle '${roleKey}' gefunden (erwartet: board | admin | member).`);
    process.exit(1);
  }
  let granted = 0;
  for (const role of targetRoles) {
    const dup = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, user.id), eq(userRoles.roleId, role.id)));
    if (dup.length) continue;
    await db.insert(userRoles).values({ userId: user.id, roleId: role.id, companyId: role.companyId });
    granted++;
  }
  // eslint-disable-next-line no-console
  console.log(`OK: '${email}' hat jetzt Rolle '${roleKey}' (neu in ${granted} Company/Companies). Bitte neu einloggen.`);
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
