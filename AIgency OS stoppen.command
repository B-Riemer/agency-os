#!/bin/bash
# AIgency OS — stoppt API + Datenbank (Daten bleiben erhalten).
cd "$(dirname "$0")"
source "$HOME/.zprofile" 2>/dev/null || true
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "■  Stoppe AIgency OS …"
lsof -ti:3100 | xargs kill -9 2>/dev/null || true   # API
docker compose down 2>/dev/null || true             # Datenbank (Volume/Daten bleiben)
echo "✔  Gestoppt. (Das App-Fenster ggf. normal schließen.)"
