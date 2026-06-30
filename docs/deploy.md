# Produktions-Deploy (VPS, HTTPS, Mehrbenutzer)

Dieser Stack bringt AIgency OS produktionsreif auf einen Server: **db + api + web hinter Caddy**
mit automatischem HTTPS (Let's Encrypt) und **Single-Origin** (Web unter `/`, API unter `/api`) —
dadurch entfallen CORS-/Cookie-Sonderfälle, und das OIDC-Session-Cookie funktioniert sauber.

## Voraussetzungen

- Ein Server (VPS) mit Docker + Docker Compose, öffentliche IP.
- Eine Domain, deren DNS-A/AAAA-Record auf den Server zeigt (z. B. `agency.deinedomain.tld`).
- Ein OIDC-Provider (empfohlen: self-hosted **Keycloak**/**Authentik**), erreichbar unter eigener Domain.

## 1. Code holen + Konfiguration

```bash
git clone https://github.com/B-Riemer/agency-os.git
cd agency-os
cp .env.prod.example .env.prod
nano .env.prod   # DOMAIN, Passwörter, Secrets, OIDC ausfüllen
```

Die zwei Geheimnisse erzeugst du mit:
```bash
openssl rand -base64 32   # für AUTH_SESSION_SECRET
openssl rand -base64 32   # für SECRETS_MASTER_KEY
```

## 2. Starten

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm api pnpm --filter @agency-os/db db:migrate
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm api pnpm --filter @agency-os/api seed
```

Caddy holt beim ersten Aufruf automatisch ein TLS-Zertifikat. Danach ist die App unter
`https://DEINE-DOMAIN` erreichbar; die API liegt same-origin unter `https://DEINE-DOMAIN/api`.

## 3. OIDC scharf schalten

`AUTH_MODE=strict` ist im Prod-Compose bereits gesetzt — d. h. ohne gültige Session/Key kein Zugriff.
Beim Identity-Provider eintragen:

- **Redirect-URI:** `https://DEINE-DOMAIN/api/auth/callback`
- Client-ID/Secret → in `.env.prod` (`OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET`).

Der erste Login legt den User automatisch mit der Rolle aus `OIDC_DEFAULT_ROLE` an. Den ersten
Owner/Admin hebst du danach einmalig per DB-Update auf `board` (oder seedest ihn mit passender E-Mail).

## 4. Betrieb

- **Logs:** `docker compose -f docker-compose.prod.yml logs -f api`
- **Update:** `git pull` → `… up -d --build` → bei Schema-Änderungen `… run --rm api pnpm --filter @agency-os/db db:migrate`
- **Backup:** regelmäßig das Volume `agency_os_pgdata` sichern (z. B. `pg_dump`).
- **Härtung:** siehe `SECURITY.md`. Secrets nur in `.env.prod` (nie committen), Firewall auf 80/443 begrenzen, DB nicht nach außen exponieren (ist im Compose bereits intern).

## Hinweise

- Der `db`-Dienst hat bewusst **keinen** öffentlichen Port — nur intern erreichbar.
- Für mehrere Instanzen/Skalierung: OIDC-`state` liegt aktuell im Prozess-Speicher (Single-Instance).
  Für horizontale Skalierung später einen geteilten Store (Redis) ergänzen.
