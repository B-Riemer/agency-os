# AIgency OS — Desktop (Tauri)

Native Desktop-Hülle für die Web-Oberfläche. Lädt dieselbe React-App wie der Browser,
aber als eigenständiges Fenster/App-Icon (macOS `.app`, Windows `.exe`, Linux `.deb/.AppImage`).

> Die App ist nur die **Oberfläche**. Das „Gehirn" (API + Postgres) muss laufen —
> lokal (`docker compose up -d` + `pnpm --filter @agency-os/api start:dev`) oder auf einem Server.
> Die API-URL steckt im Web-Build (`VITE_API_URL`, Default `http://localhost:3100/api`).

## Einmalige Voraussetzungen (Mac)

1. **Rust-Toolchain** (für Tauri nötig):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   (Xcode Command Line Tools werden ggf. mitinstalliert: `xcode-select --install`.)
2. **Tauri-CLI** (über pnpm, bereits als Dev-Dependency deklariert):
   ```bash
   pnpm install
   ```
3. **App-Icons** aus dem Platzhalter erzeugen (einmalig, legt `src-tauri/icons/` an):
   ```bash
   pnpm --filter @agency-os/desktop icon
   ```
   (entspricht `tauri icon app-icon.png` im Ordner `apps/desktop`).

## Entwickeln (Hot-Reload-Fenster)

```bash
# API + DB separat starten (anderes Terminal):
docker compose up -d
pnpm --filter @agency-os/api start:dev

# Desktop-App im Dev-Modus (startet automatisch den Web-Dev-Server + öffnet das Fenster):
pnpm --filter @agency-os/desktop dev
```

## Auslieferbares Paket bauen

```bash
pnpm --filter @agency-os/desktop build
```
Ergebnis unter `apps/desktop/src-tauri/target/release/bundle/` (z. B. `macos/AIgency OS.app`,
`dmg/AIgency OS_0.1.0_aarch64.dmg`).

## Auf einen Server zeigen lassen

Soll die Desktop-App eine entfernte API nutzen, beim Web-Build die URL setzen:
```bash
VITE_API_URL=https://api.deinedomain.tld/api pnpm --filter @agency-os/desktop build
```

## Hinweise

- Icon später durch das finale (Stitch-)Motiv ersetzen: neues `app-icon.png` ablegen, `tauri icon` erneut laufen lassen.
- Für Produktion `app.security.csp` in `src-tauri/tauri.conf.json` enger fassen (statt `null`)
  und die erlaubte API-Origin in `connect-src` aufnehmen.
