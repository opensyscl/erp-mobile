#!/usr/bin/env bash
# Levanta el stack de dev para PROBAR EN TELÉFONO FÍSICO vía tunnels (WSL2).
#   - Docker (ERP API :8000, Reverb :8080, MySQL)
#   - Tunnel cloudflared de la API → escribe EXPO_PUBLIC_API_URL en .env
#   - Expo con --tunnel (QR interactivo para el iPhone)
# Uso:  bash scripts/dev-tunnel.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"

echo "→ Docker (ERP)…"
docker start erp_app erp_nginx erp_mysql >/dev/null 2>&1 || true

echo "→ Tunnel API (cloudflared :8000)…"
CF_LOG="$(mktemp)"
setsid cloudflared tunnel --url http://localhost:8000 >"$CF_LOG" 2>&1 </dev/null &
API=""
for _ in $(seq 1 25); do
  API="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1 || true)"
  [ -n "$API" ] && break
  sleep 2
done

if [ -n "$API" ]; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$API|" .env
  echo "   API → $API"
  curl -s -o /dev/null -w "   API /login → HTTP %{http_code}\n" "$API/login" || true
else
  echo "   ⚠ no se pudo crear el tunnel de la API (revisá cloudflared)"
fi

echo "→ Expo (--tunnel). Escaneá el QR con la cámara del iPhone."
echo "   (logueado en Expo como: $(npx expo whoami 2>/dev/null || echo '???'))"
exec npx expo start --tunnel --port 19000
