#!/usr/bin/env bash
# Helper para arrancar el Android Emulator + Expo apuntando a él.
# Uso: ./scripts/start-android.sh

set -e

# Env (en caso de que .zshrc no se haya cargado en este shell)
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export JAVA_HOME="${JAVA_HOME:-$HOME/.sdkman/candidates/java/current}"

AVD_NAME="${AVD_NAME:-Pixel7}"

echo "→ Arrancando emulator $AVD_NAME (cold boot, puede tardar 30-60s)…"
echo "  Cuando veas la home de Android, vuelve aquí y sigue."
echo

# Lanzamos el emulator en una nueva sesión para que no muera con el script
nohup "$ANDROID_HOME/emulator/emulator" \
  -avd "$AVD_NAME" \
  -no-snapshot-load \
  -no-boot-anim \
  -gpu auto \
  > /tmp/emulator.log 2>&1 &

EMU_PID=$!
echo "  PID: $EMU_PID — log: /tmp/emulator.log"
echo

# Esperar a que el dispositivo esté en adb
echo -n "→ Esperando device en adb"
for i in $(seq 1 30); do
  if adb get-state 2>/dev/null | grep -q "^device$"; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 2
done

# Esperar boot completo
echo -n "→ Esperando boot del sistema"
for i in $(seq 1 60); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r ')" = "1" ]; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 2
done

echo
echo "✅ Emulator listo. Lanzando Expo apuntando al emulator…"
echo
echo "Tip: en el panel de Expo, presiona 'a' para abrir la app en el emulator."
echo

cd "$(dirname "$0")/.."
exec npx expo start --android --clear
