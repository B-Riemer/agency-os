# Bootstrap — AIgency OS auf deinem Mac

> Dieser Repo-Stand (M0) enthält den architektonischen Kern: **Datenmodell** (`packages/db`),
> **Adapter-Vertrag** (`packages/adapter-contract`) und **Infra** (`docker-compose.yml`).
> Die Framework-Apps werden mit den offiziellen Generatoren erzeugt — sie lassen sich nicht
> sinnvoll von Hand „erfinden". Unten die exakten Befehle.

## 0. Voraussetzungen

```bash
node -v        # >= 20
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm -v        # >= 9.15
docker -v      # Docker Desktop läuft
```

## 1. Repo an den Zielort (Q6: eigenes Repo)

Aktuell liegt der Code unter `…/AIgency OS Headquater/agency-os/`. Empfohlen: in ein eigenes Repo verschieben.

```bash
mv "~/Claude/Projects/AIgency OS Headquater/agency-os" ~/dev/agency-os
cd ~/dev/agency-os
git init && git add -A && git commit -m "M0: Fundament (Datenmodell, Adapter-Vertrag, Infra)"
```

## 2. Umgebung + Datenbank

```bash
cp .env.example .env
# Secrets erzeugen:
echo "AUTH_SESSION_SECRET=$(openssl rand -base64 32)" >> .env
echo "SECRETS_MASTER_KEY=$(openssl rand -base64 32)" >> .env
docker compose up -d                 # Postgres 17 + pgvector
docker compose ps                    # Status: healthy?
```

## 3. Workspace-Deps + Datenmodell migrieren

```bash
pnpm install
pnpm --filter @agency-os/db db:generate   # erzeugt SQL-Migration aus dem Drizzle-Schema
pnpm --filter @agency-os/db db:migrate     # spielt sie gegen Postgres ein
# Kontrolle: pnpm --filter @agency-os/db db:studio  (Drizzle Studio)
```

## 4. Apps sind bereits im Repo (M1) — nur starten

`apps/api` (NestJS + Fastify) und `apps/web` (React + Vite) sind **vorhanden** — sie müssen
nicht mehr mit Generatoren erzeugt werden. `pnpm install` (Schritt 3) hat ihre Abhängigkeiten
bereits installiert.

```bash
pnpm --filter @agency-os/api seed        # Demo-Company „AIgency" inkl. externer Engine
pnpm --filter @agency-os/api start:dev   # API → http://localhost:3100/api
# zweites Terminal:
cp apps/web/.env.example apps/web/.env    # VITE_API_URL zeigt auf die API
pnpm --filter @agency-os/web dev          # UI → http://localhost:5173
```

Module der API: `companies`, `agents`, `skills`, `access` (RBAC-Guard + Toggles),
`adapters` (USP-Run-Service), `governance`. Visual Language **Dark Command Center**
(siehe `../agency_os_masterplan.md`, Anhang B).

## 6. USP-Smoke-Test: Aigency-Engine als externer HTTP-Agent (Adapter-Verifikation D3)

```bash
# Terminal A — Engine starten:
cd ~/dev/aigency-engine
uv run uvicorn aigency_engine.status_app:app --port 8900
curl -s localhost:8900/health        # ⇒ {"status":"ok"}

# Contract-Probe (ohne teuren Lauf): leeres POST ⇒ 422 mit Diagnose
curl -s -X POST localhost:8900/wake -H 'content-type: application/json' -d '{}'
#   ⇒ {"status":"failed","received_keys":[...],"hint":"...task..."}

# Echter Lauf:
curl -s -X POST localhost:8900/wake -H 'content-type: application/json' \
  -d '{"runId":"smoke-1","task":"SEO-Audit https://b-riemer.dev"}'
#   ⇒ {"status":"completed","result":"...","final_path":"...","run_id":"smoke-1"}
```

Dieser `/wake`-Contract ist exakt das, was `@agency-os/adapter-contract/http` (`httpAdapter`)
sendet/erwartet. Sobald die API steht, wird daraus ein „eingestellter" externer Agent mit Akte.

## Nächste Meilensteine

`M1` Akte+Org-UI · `M2` Akte-Detail · `M3` Adapter+Onboarding (Engine andocken) ·
`M4` Skills+Toggles+RBAC · `M5` Orchestrierung (Issues/Routines/Heartbeat) · `M6` Governance.
Details: `../agency_os_masterplan.md` §7.1.
