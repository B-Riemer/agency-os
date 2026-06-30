// CLI-Import: pflegt ein Company-Manifest direkt in die DB ein (serverseitig, ohne Auth).
// Nutzung:  pnpm --filter @agency-os/api import <manifest.json> [--replace]
//   --replace  ersetzt Agenten/Abteilungen DIESER Company (lässt User/Rollen/Skills unberührt)
import "./env.js"; // lädt .env (DATABASE_URL etc.), bevor die DB erstellt wird
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createDb } from "@agency-os/db";
import { ImportService, type ImportManifest } from "./import/import.service.js";

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    // eslint-disable-next-line no-console
    console.error("Nutzung: pnpm --filter @agency-os/api import <manifest.json> [--replace]");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(resolve(file), "utf-8")) as ImportManifest;
  const svc = new ImportService(createDb());
  const res = await svc.importCompany(manifest, { replaceAgents: replace });
  // eslint-disable-next-line no-console
  console.log("Import fertig:\n" + JSON.stringify(res, null, 2));
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
