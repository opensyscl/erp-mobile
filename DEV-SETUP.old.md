# Dev Setup — erp-mobile (WSL2 + Emulador Windows)

## Contexto

- Metro corre en **WSL2** (Ubuntu)
- El emulador Android (Pixel 7, API 34) corre en **Windows** vía `emulator.exe`
- La IP de WSL2 cambia en cada reinicio — no uses `REACT_NATIVE_PACKAGER_HOSTNAME`
- La ruta de red WSL2 → emulador es lenta (~400ms), causa timeout en Expo Go
- **Solución**: tunnel ADB que evita el routing de red por completo

---

## Arranque (cada vez)

### 1. Verificar que el emulador está conectado

```bash
adb devices
# Debe mostrar: emulator-5554   device
```

Si no aparece, iniciá el emulador desde Android Studio o `emulator.exe` en Windows y esperá que bootee.

### 2. Activar los tunnels ADB

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8082 tcp:8082
```

Verificar que quedaron:

```bash
adb reverse --list
# Debe mostrar ambos puertos
```

> Los tunnels se pierden si el emulador se reinicia o adb se reconecta. Repetir este paso si la app deja de cargar.

### 3. Arrancar Expo

```bash
npx expo start --localhost
```

El `--localhost` es obligatorio. Sin él, Expo usa la IP de WSL2 y el emulador no puede alcanzarla confiablemente.

### 4. Abrir en el emulador

Con el foco en la terminal de Expo, presionar **`a`** para abrir en Android.

---

## Si la app deja de cargar en medio del desarrollo

El tunnel ADB se cayó (pasa si adb se reconecta). Repetir paso 2 y recargar la app (`r` en la terminal de Expo).

## Si el emulador no aparece en `adb devices`

Desde WSL2:

```bash
adb kill-server
adb start-server
adb devices
```

Si sigue sin aparecer, verificar que el emulador esté corriendo en Windows y que adb de WSL2 y de Windows no estén en conflicto (no tener dos instancias de adb corriendo).
