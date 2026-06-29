# @agency-os/api — NestJS (Fastify) Backend, M1

Self-hosted API für Agency OS. NestJS auf Fastify (D6), Drizzle/Postgres (D4), ESM/TypeScript.

## Module (M1)

| Modul | Zweck | Endpunkte (Auszug) |
|---|---|---|
| `database` | Drizzle-Client (DI-Token `DRIZZLE`) aus `@agency-os/db` | — |
| `agents` | Personalakte (Säule 2): CRUD + Status-Lifecycle | `GET/POST /companies/:c/agents`, `GET /…/:id`, `PATCH /…/:id/status` |
| `access` | Toggles + RBAC-Guard (Säule 3) | (intern: `TogglesService`, `RbacGuard`) |
| `adapters` | **USP-Laufzeit**: Registry + Run-Service | `GET /adapters`, `POST /agents/:id/run`, `POST /agents/:id/test` |
| `skills` | Skill-Katalog + Zuweisung (Säule 4) | `GET /companies/:c/skills`, `POST /agents/:id/skills`, `PATCH /agents/:id/skills/:s` |
| `governance` | Audit, Cost, Budgets, Approvals (Säule 7) | `GET /…/governance/{audit,costs,budgets,approvals}`, `POST /approvals/:id/decide` |

## Der USP-Pfad (so erzwingt der Kern die Akte)

`POST /agents/:id/run` → `RunsService.run()`:
1. Agent laden, Status- und **Budget-Gate** prüfen.
2. Adapter aus der `AdapterRegistry` holen (`http` = Bring-your-own, z. B. Aigency-Engine).
3. **Allowlist bauen**: `TogglesService.allowedTools()` ∩ freigeschaltete Skills.
4. `ExecutionContext` (gefilterte Tools/Skills, Budget-Rest, Audit-Senke) an `adapter.execute()`.
5. Ergebnis → **Kosten buchen** (`cost_events`, `spent_monthly_cents`) + **append-only Audit**.

→ Ein externer Agent ist damit nicht privilegierter als ein interner.

## Lokal starten (Mac)

```bash
# Postgres läuft (docker compose up -d) und Schema ist migriert (siehe ../../BOOTSTRAP.md)
pnpm --filter @agency-os/api seed        # Demo-Company „AIgency" + externe Engine
pnpm --filter @agency-os/api start:dev   # http://localhost:3100/api

# USP-Smoke-Test (Engine muss auf :8900 laufen):
curl -X POST http://localhost:3100/api/agents/<ENGINE_ID>/test
curl -X POST http://localhost:3100/api/agents/<ENGINE_ID>/run -H 'content-type: application/json' -d '{"task":"SEO-Audit https://b-riemer.dev"}'
```

## Offene Punkte (bewusst M2+)

- Auth/OIDC + echte RBAC-Auswertung im `RbacGuard` (M4) — aktuell permissiv.
- Secrets-Sidecar-Injection in `ExecutionContext.injectedEnv` (M6) — aktuell leer.
- `process`/`mcp`/`openai`-Adapter registrieren (Registry ist vorbereitet).
- Validierung (class-validator) + Audit-Interceptor global.
- **ESM/NestJS:** Paket ist `type: module`, NodeNext. Beim ersten `pnpm install` ggf. kleine Build-Tweaks nötig (tsx/tsc); Code ist darauf ausgelegt.
