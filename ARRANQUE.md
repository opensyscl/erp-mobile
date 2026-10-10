# Arranque rápido — erp-mobile (WSL2)

> Cómo levantar todo desde cero en una sesión nueva.
> Setup: emulador Android **nativo en WSL2** (KVM + WSLg) con **RTX 3060**.
> El *porqué* de este setup está en [DEV-SETUP.md](DEV-SETUP.md).

---

## TL;DR — dos comandos

```bash
rn          # emulador + tunnels + Metro (deja la terminal ocupada)
rn-open     # en OTRA terminal: abre la app en el emulador
```

Listo. Si algo falla, seguí leyendo.

---

## Arranque paso a paso

### 1. Emulador

```bash
emu                        # levanta el AVD erp_pixel con la RTX 3060
adb wait-for-device        # espera a que aparezca
```

Verificá que agarró la GPU correcta:

```bash
grep -m1 'Graphics Adapter Android' /tmp/emulator-erp_pixel.log
# Debe decir: D3D12 (NVIDIA GeForce RTX 3060)
```

Si dice **Intel UHD 730**, agarró la integrada — falta
`MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA` (ya está en el helper `emu`).

### 2. Tunnels ADB

```bash
rn-tunnels
```

Hacen que `localhost` dentro del emulador apunte a WSL2, así el `.env` usa
`localhost` sin IPs que cambian:

| Puerto | Servicio |
|--------|----------|
| 8081   | Metro |
| 8082   | Metro (secundario) |
| 8000   | API del ERP (`EXPO_PUBLIC_API_URL`) |
| 8080   | Reverb / websockets |

> Se pierden cada vez que el emulador reinicia. Volvé a correr `rn-tunnels`.

### 3. Metro

```bash
cd ~/dev/erp-mobile
npx expo start --go --offline --port 8081
```

**El `--offline` es obligatorio.** Ver "Trampa #1".

### 4. Abrir la app

```bash
rn-open
```

O a mano:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "exp://127.0.0.1:8081" host.exp.exponent
```

---

## Las tres trampas que cuestan horas

### #1 — `--offline` es obligatorio

Sin él, `expo start` **mata a Metro** al servir el manifest:

```
CommandError: Input is required, but 'npx expo' is in non-interactive mode.
```

Pasa porque `app.json` tiene `extra.eas.projectId` y no hay sesión de Expo.
En el emulador se ve como `UpdateFailedToLoad` / *"Something went wrong"*, que
parece problema de red — **no lo es**.

Arreglo permanente: `npx expo login`.

### #2 — Bundle clavado en un % = Metro MUERTO, no lento

Si la barra queda fija (ej. `98.01%`) más de un minuto, Expo Go está mostrando
pantalla cacheada. Comprobalo:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8081
```

- `200` → Metro vivo, esperá
- `000` → **Metro muerto**

Metro se cae al reiniciar el emulador y deja procesos `node` zombis:

```bash
pgrep -f 'node.*expo start'     # ver los PIDs
kill <PIDs>                      # matarlos por PID
```

> No uses `pkill -f 'expo start'` — el patrón coincide con el propio comando y
> se mata a sí mismo.

Después relanzá Metro normalmente.

### #3 — Editá `~/dev/erp-mobile`, NO `~/erp-mobile`

Existen dos copias. `~/erp-mobile` es vieja (último commit 2026-06-08) y no se usa.

---

## Rendimiento

Ya aplicado en el AVD:

| Ajuste | Valor |
|--------|-------|
| GPU | `host` → RTX 3060 vía D3D12 |
| Resolución | 720×1600 @ 320 dpi (56 % menos píxeles que 1080×2400) |
| RAM | 6 GB |
| Cores | 8 |
| Teclado físico | activado |

**Las animaciones se resetean en cada cold boot.** Volvé a apagarlas:

```bash
for s in window_animation_scale transition_animation_scale animator_duration_scale; do
  adb shell settings put global $s 0
done
```

Eso solo cambia muchísimo la sensación de fluidez.

---

## Limitación de Expo Go

`expo-notifications` **no soporta push remoto en Expo Go** desde el SDK 53.
Para probar notificaciones necesitás un development build:

```bash
npx expo run:android      # usa el JDK 17 ya instalado
```

---

## Diagnóstico rápido

```bash
adb devices                                                     # emulator-5554  device
adb reverse --list                                              # los 4 puertos
curl -s -o /dev/null -w '%{http_code}\n' localhost:8081          # 200
grep -m1 'Graphics Adapter Android' /tmp/emulator-erp_pixel.log  # RTX 3060
java -version                                                   # 17.x
```

---

## Sobre el kernel custom

WSL corre un kernel compilado a mano
(`6.18.33.2-microsoft-standard-WSL2-binder+`) con binder, hecho para intentar
Waydroid. **Waydroid no funcionó** (SurfaceFlinger no arranca: los nodos DRM son
`faux_driver`, sin GPU real detrás). El kernel quedó porque es inofensivo — y de
hecho fue útil: creó los nodos `/dev/dri` que destaparon el acceso a la GPU.

Para volver al kernel de Microsoft: borrá la línea `kernel=` de
`C:\Users\Jos\.wslconfig` (hay backup en `.wslconfig.bak`) y corré
`wsl --shutdown`. El emulador funciona igual con cualquiera de los dos.
