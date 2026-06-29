// .env laden, BEVOR andere Module evaluiert werden (ESM-Imports laufen vor Body-Code).
// Node-Bordmittel (process.loadEnvFile), keine Dependency. tsx lädt .env nicht automatisch.
// Reihenfolge: Repo-Root zuerst, lokales apps/api/.env überschreibt ggf.
import path from "node:path";

for (const p of ["../../.env", "./.env"]) {
  try {
    (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(
      path.resolve(process.cwd(), p),
    );
  } catch {
    /* Datei nicht vorhanden — ignorieren */
  }
}
