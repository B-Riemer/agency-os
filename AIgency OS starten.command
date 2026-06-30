#!/bin/bash
# AIgency OS — Ein-Klick-Start (macOS). Einfach im Finder doppelklicken.
# Fährt Docker-Datenbank + API im Hintergrund hoch und öffnet die App.
cd "$(dirname "$0")"   # = agency-os/

# Login-Shell-PATH laden, damit node/pnpm/docker gefunden werden
source "$HOME/.zprofile" 2>/dev/null || true
source "$HOME/.zshrc" 2>/dev/null || true
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

echo "▶  AIgency OS wird gestartet …"

# 1) Docker Desktop sicherstellen
if ! docker info >/dev/null 2>&1; then
  echo "   • Starte Docker Desktop … (kann beim ersten Mal etwas dauern)"
  open -a Docker || true
  until docker info >/dev/null 2>&1; do sleep 2; done
fi

# 2) Datenbank
echo "   • Datenbank …"
docker compose up -d >/dev/null

# 3) API (nur, wenn nicht schon erreichbar)
if curl -fs http://localhost:3100/api/companies >/dev/null 2>&1; then
  echo "   • API läuft bereits."
else
  echo "   • Starte API im Hintergrund …"
  nohup pnpm --filter @agency-os/api start:dev >/tmp/aigency-api.log 2>&1 &
  printf "     warte auf API "
  for i in $(seq 1 90); do
    curl -fs http://localhost:3100/api/companies >/dev/null 2>&1 && break
    printf "."; sleep 1
  done
  echo ""
fi

# 4) App öffnen — gebaute .app bevorzugt, sonst Dev-Fenster
echo "   • Öffne App …"
if open -a "AIgency OS" 2>/dev/null; then
  true
elif [ -d "apps/desktop/src-tauri/target/release/bundle/macos/AIgency OS.app" ]; then
  open "apps/desktop/src-tauri/target/release/bundle/macos/AIgency OS.app"
else
  echo "   • (Noch keine gebaute App gefunden — öffne Dev-Fenster.)"
  pnpm --filter @agency-os/desktop dev
fi

echo "✔  Bereit. Dieses Fenster kannst du jetzt schließen."
