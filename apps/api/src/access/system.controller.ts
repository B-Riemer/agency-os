import { Controller, Get } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RequirePermission } from "./permissions.decorator.js";

function readVersion(): string {
  try {
    const p = join(dirname(fileURLToPath(import.meta.url)), "../../package.json");
    return (JSON.parse(readFileSync(p, "utf8")).version as string) ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// System- & Sicherheits-Status (read-only) für den Einstellungen-Bereich.
@Controller()
export class SystemController {
  @Get("system/info")
  @RequirePermission("system", "manage")
  info() {
    return {
      version: readVersion(),
      authMode: process.env.AUTH_MODE ?? "local",
      schedulerEnabled: process.env.SCHEDULER_ENABLED !== "false",
      oidcEnabled: !!(
        process.env.OIDC_ISSUER &&
        process.env.OIDC_CLIENT_ID &&
        process.env.OIDC_REDIRECT_URI
      ),
      oidcIssuer: process.env.OIDC_ISSUER ?? null,
      cookieSecure: process.env.COOKIE_SECURE === "true",
    };
  }
}
