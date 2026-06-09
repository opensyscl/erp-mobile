#!/usr/bin/env bash
# Levanta el stack completo de dev para erp-mobile:
#   API Laravel (:8000, 0.0.0.0 para que el teléfono llegue por LAN)
#   Reverb websockets (:8080)
#   Expo en foreground (QR + teclas interactivas)
# Idempotente: si un puerto ya está escuchando, lo salta.
set -euo pipefail

ERP="$HOME/root/bookforce/erp"
MOBILE="$HOME/root/josbert-dev/erp-mobile"

if ! ss -tln | grep -q ':8000 '; then
  (cd "$ERP" && nohup php artisan serve --host=0.0.0.0 --port=8000 > /tmp/erp-api.log 2>&1 &)
  echo "✓ API Laravel → http://192.168.100.125:8000 (log: /tmp/erp-api.log)"
else
  echo "• API ya escucha en :8000"
fi

if ! ss -tln | grep -q ':8080 '; then
  (cd "$ERP" && nohup php artisan reverb:start > /tmp/erp-reverb.log 2>&1 &)
  echo "✓ Reverb → ws://192.168.100.125:8080 (log: /tmp/erp-reverb.log)"
else
  echo "• Reverb ya escucha en :8080"
fi

echo
echo "Arrancando Expo (LAN) — escaneá el QR con Expo Go…"
cd "$MOBILE"
exec npx expo start --port 8081
