# Agency OS

> Steuerungs- und Personalwirtschafts-System für eine KI-Agentur.
> Best-of-Merge aus **Langdock** (Governance/RAG/API-Tiefe) und **Paperclip** (Org-/HR-/Orchestrierung).
> **USP:** eigene/externe Agenten (Aigency-Engine, Claude-Agents, MCP, HTTP, lokale CLIs) sind *erste Klasse*.

Vollständiger Plan inkl. Begründungen, Feature-Matrix und Roadmap: `../agency_os_masterplan.md`.

## Status

**M0 — Fundament (in Arbeit).** Dieser Commit enthält den architektonischen Kern:
Datenmodell (Drizzle), Adapter-Vertrag (inkl. HTTP-Adapter für die Aigency-Engine), Infra (Postgres+pgvector).
Die Framework-Apps (NestJS-API, React/Vite-Web) werden mit den offiziellen Generatoren initialisiert — siehe `BOOTSTRAP.md`.

## Architektur-Eckpfeiler (festgelegt im Plan)

| Entscheidung | Wahl |
|---|---|
| Fundament | Neubau, Paperclip-kompatibles Daten-/Adapter-Modell (Option C) |
| Backend | **NestJS** (Fastify-Adapter), TypeScript |
| Frontend | **React + Vite** (Visual Language: „Dark Command Center") |
| DB | **PostgreSQL 17 + pgvector**, Drizzle ORM — self-hosted (kein Supabase) |
| Auth | **OIDC-Fundament**; lokaler Login im MVP, SSO/SCIM später einsteckbar |
| Secrets | AES `local_encrypted`, Sidecar-ENV — **nie in Prompts** |
| Orchestrierung | Issues/Tasks · Routines (cron) · Heartbeat-Wakeup-Loop |
| MVP-Umfang | M0–M6 inkl. voller Governance |

## Monorepo-Layout

```
agency-os/
├─ packages/
│  ├─ db/                 # Drizzle-Schema = das Datenmodell (Agenten-Akte, Org, Skills, RBAC, Governance, Secrets)
│  └─ adapter-contract/   # einheitlicher AgentAdapter-Vertrag + HTTP-Adapter (Bring-your-own-Agent)
├─ apps/
│  ├─ api/                # NestJS — via `nest new` (siehe BOOTSTRAP.md)
│  └─ web/                # React+Vite — via `npm create vite` (siehe BOOTSTRAP.md)
├─ docker-compose.yml     # Postgres 17 + pgvector
├─ .env.example
├─ pnpm-workspace.yaml
└─ drizzle.config.ts
```

## Schnellstart (auf dem Mac)

```bash
cp .env.example .env            # Werte anpassen
docker compose up -d            # Postgres + pgvector
pnpm install                    # Workspace-Deps
# Apps initialisieren: siehe BOOTSTRAP.md
pnpm --filter @agency-os/db db:generate && pnpm --filter @agency-os/db db:migrate
```

## Sicherheit / DSGVO

Self-hosted, EU-Datenresidenz in deiner Hand. Secrets verschlüsselt at rest, nur als ENV in Agenten-Prozesse injiziert, nie in Prompts/Logs. Append-only Audit. Company-Isolation per `company_id`.
