<div align="center">

# Agency OS

**The self-hostable control plane for running a company of AI agents.**

Org chart · personnel files · skills · permission toggles · budgets · governance · orchestration —
with **bring-your-own external agents** as a first-class citizen.

`Apache-2.0` · `self-hosted` · `keyless · no phone-home` · `model-agnostic`

</div>

---

## Why

Tools like **Paperclip** (org/HR/orchestration) and **Langdock** (governance/RAG/API depth) inspired this,
but none let you run a company where **your own, external agents** — a custom runtime, an MCP server,
a Claude/Codex CLI, an HTTP/webhook agent — are *real employees* with the same file, skills, rights,
budget and audit trail as internal ones. Agency OS makes "bring your own agent" first class.

Unlike LangGraph's server (Elastic-2.0 + license key + beacon), Agency OS is **Apache-2.0 with
real, keyless, air-gappable self-hosting** — that's a feature, not an afterthought.

## Core idea: Agent = employee with a file

Every agent has a **personnel file**: identity (role, department, reporting line), origin
(internal *or* external + adapter type), skills (versioned, policy auto/approval), access
(per-tool/integration/secret toggles, default-deny), properties (model, budget/cost-cap,
knowledge folders), status lifecycle, and an append-only history.

## Features

- **Org chart** — company → departments → agents, glowing reporting lines, `external` badges.
- **Personnel file** — identity, skills, access toggles, properties, origin, audit stream; versioned (promote/rollback).
- **Bring-your-own agents** — HTTP/Webhook (shipped), plus process/CLI, MCP, OpenAI-compatible (planned), via a unified adapter contract. The core *enforces* the file: it filters tools/skills, injects only allowed secrets as env (never into prompts), checks budget, and audits every action.
- **Orchestration** — tickets/tasks board, routines (cron), wakeup runs.
- **Governance** — budgets & cost-caps (auto-pause or graceful fallback), approvals, append-only audit, fleet-insights, live heartbeats.
- **Permission-mirroring RAG** — agents see only the knowledge folders they're granted.
- **Security** — API-key/OIDC auth (dev-open, `AUTH_MODE=strict` to enforce), role-based access, AES-256-GCM secrets, sovereignty levels + token-scoped credentials for external agents.
- **OpenAI-/Anthropic-compatible endpoint** — `POST /api/v1/chat/completions` runs an agent; existing tools (Cursor, LangChain, n8n) dock without changes.

## Architecture

```
agency-os/  (pnpm monorepo)
├─ packages/db               Drizzle schema = the data model (Postgres + pgvector)
├─ packages/adapter-contract Unified AgentAdapter contract + HTTP adapter
├─ apps/api                  NestJS (Fastify) — companies, agents, adapters/runs,
│                            access, skills, governance, rag, tasks, routines, secrets, compat
└─ apps/web                  React + Vite — "Dark Command Center" UI
```

Stack: Node 20+ · TypeScript · NestJS/Fastify · PostgreSQL + pgvector + Drizzle · React + Vite.
Model-agnostic (Anthropic/OpenAI/Google/local). Self-hosted; EU data residency in your hands.

## Quickstart (local dev)

Prereqs: Node 20+, pnpm 9.15+, Docker.

```bash
cp .env.example .env
docker compose up -d                                   # Postgres + pgvector
pnpm install
pnpm --filter @agency-os/db db:generate
pnpm --filter @agency-os/db db:migrate
pnpm --filter @agency-os/api seed                       # demo company "AIgency"
pnpm --filter @agency-os/api start:dev                  # API  → http://localhost:3100/api
# second terminal:
cp apps/web/.env.example apps/web/.env
pnpm --filter @agency-os/web dev                        # UI   → http://localhost:5173
```

Bring your own agent: run any HTTP agent that answers `POST /wake` with
`{"status":"completed","result":"…"}`, then add it via **+ Agent einstellen** (adapter `http`).

## Deploy (Docker, full stack)

```bash
docker compose -f docker-compose.full.yml up -d --build   # db + api + web
docker compose -f docker-compose.full.yml run --rm api pnpm --filter @agency-os/db db:migrate
docker compose -f docker-compose.full.yml run --rm api pnpm --filter @agency-os/api seed
```
> The Docker setup is a deploy scaffold — review env/secrets before production. See `SECURITY.md`.

## Status

M1 (research preview): plan + verified competitor research in `docs/masterplan.md`; working app
(org/people/skills/orchestration/governance, full personnel file, onboarding wizard, USP runtime).
Planned: deeper auth (OIDC/SCIM), more adapters (process/MCP/OpenAI), a cron scheduler, the final
icon set.

## License

[Apache-2.0](./LICENSE) — keyless, self-hostable, no phone-home. Contributions welcome — see
[CONTRIBUTING.md](./CONTRIBUTING.md).
