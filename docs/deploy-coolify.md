# Deploy auf Coolify

Auf einem Coolify-Server übernimmt **Coolify + Traefik** Routing und HTTPS. AIgency OS läuft
ohne eigenen Proxy und ohne Host-Ports — `web` liefert die SPA und leitet `/api` intern an `api`
weiter (Single-Origin). Verwendet wird `docker-compose.coolify.yml`.

## Voraussetzungen
- Coolify erreichbar (z. B. `panel.b-riemer.dev`).
- DNS: `aigency.b-riemer.dev` zeigt auf den Server (per Wildcard bereits abgedeckt).

## Schritte (Coolify-UI)
1. **Projekt** wählen/anlegen → Environment **Production** → **+ New** → **Public Repository**.
2. Repo: `https://github.com/B-Riemer/agency-os` · Branch `main`.
3. Build Pack: **Docker Compose** · Compose-Datei: `docker-compose.coolify.yml`.
4. **Environment Variables** setzen:
   - `POSTGRES_PASSWORD` = (starkes Passwort)
   - `AUTH_SESSION_SECRET` = `openssl rand -base64 32`
   - `SECRETS_MASTER_KEY` = `openssl rand -base64 32`
   - `WEB_URL` = `https://aigency.b-riemer.dev`
   - `AUTH_MODE` = `local` (für den ersten Start; später `strict` + OIDC)
5. **Domain** auf den Dienst **web** setzen: `https://aigency.b-riemer.dev` (Port 80).
6. **Deploy**. Coolify baut die Images, startet alles und holt automatisch das HTTPS-Zertifikat.

## Nach dem ersten Deploy: DB migrieren + seeden
Im Coolify-Terminal des **api**-Containers (oder „Execute Command"):
```bash
pnpm --filter @agency-os/db db:migrate
pnpm --filter @agency-os/api seed
```

## Härtung (danach)
- OIDC: Keycloak/Authentik betreiben, dann `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`,
  `OIDC_REDIRECT_URI=https://aigency.b-riemer.dev/api/auth/callback` setzen und `AUTH_MODE=strict`.
- Redeploy in Coolify.
