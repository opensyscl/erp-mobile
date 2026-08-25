# Dev Setup — erp-mobile (emulador NATIVO en WSL2)

> Reemplaza el setup anterior de "emulador en Windows + tunnels frágiles".
> Ahora **todo corre dentro de WSL2**: emulador, adb y Metro.

## Por qué cambió

WSL2 expone `/dev/kvm` y WSLg, así que el emulador de Android corre **nativo en
Linux con aceleración por hardware** y su ventana aparece en Windows sola.
Se acabaron: la IP de WSL2 que cambia, los ~400 ms de latencia y los conflictos
entre el adb de Windows y el de Linux.

## Arranque

```bash
rn      # levanta emulador + tunnels + Metro (todo en uno)
```

En otra terminal, para abrir la app:

```bash
rn-open
```

Los helpers `rn`, `rn-open`, `rn-tunnels`, `emu` y `emu-stop` viven en `~/.zshrc`.

## Los dos detalles que rompen todo

### 1. `--offline` es obligatorio

El proyecto tiene `extra.eas.projectId` en `app.json`. Sin sesión de Expo, al
servir el manifest el CLI pide login, y en modo no interactivo **mata a Metro**
con:

```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
```

El síntoma en el emulador es engañoso: `UpdateFailedToLoad` / "Something went
wrong", que parece un problema de red pero no lo es.

Dos salidas — cualquiera sirve:

```bash
npx expo start --go --offline    # lo que hace el helper `rn`
npx expo login                   # arregla la causa de raíz, permanente
```

### 2. Los tunnels ADB deben existir antes de abrir la app

`adb reverse` hace que `localhost` dentro del emulador apunte a WSL2, así el
`.env` usa `localhost` tal cual sin IPs que cambian:

| Puerto | Servicio |
|--------|----------|
| 8081   | Metro |
| 8082   | Metro (secundario) |
| 8000   | API del ERP (`EXPO_PUBLIC_API_URL`) |
| 8080   | Reverb / websockets |

```bash
rn-tunnels    # re-arma los cuatro
```

Se pierden si el emulador reinicia o adb se reconecta. Si la app deja de cargar
a mitad del desarrollo, corré `rn-tunnels` y recargá.

## Limitación conocida de Expo Go

`expo-notifications` **no** soporta push remoto en Expo Go desde el SDK 53. Para
probar notificaciones necesitás un development build:

```bash
npx expo run:android     # requiere JDK 17
```

## Requisitos

- JDK 17 — `sudo apt install openjdk-17-jdk` (solo para builds de Gradle;
  Expo Go **no** lo necesita)
- Android SDK en `~/Android/Sdk` (ya instalado)
- AVD `erp_pixel`: Android 14, x86_64, 4 GB RAM, teclado físico activado

## Diagnóstico rápido

```bash
adb devices                 # emulator-5554  device
adb reverse --list          # los cuatro puertos
curl -s -o /dev/null -w '%{http_code}\n' localhost:8081   # 200
```
