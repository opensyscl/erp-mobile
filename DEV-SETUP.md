# Dev Setup — erp-mobile

La app usa `expo-dev-client` (tiene módulos nativos: `react-native-maps`,
`expo-notifications`, etc.) — **no corre en Expo Go**. Hace falta compilar e
instalar un dev client propio una vez; después el loop de desarrollo es
normal (`expo start --dev-client` + hot reload, sin recompilar).

Elegí tu sección según el SO:

- [Linux — Waydroid](#linux--waydroid) (recomendado si estás en Linux nativo)
- [Windows — WSL2 + emulador Android](#windows--wsl2--emulador-android)

---

## Linux — Waydroid

Waydroid corre Android como container LXC sobre el kernel del host (no
virtualiza hardware como un AVD normal) — arranca casi al instante y pesa
mucha menos RAM que el emulador de Android Studio. Ideal si tu máquina anda
justa de memoria.

### 0. Instalación y arranque de Waydroid (una sola vez por máquina)

```bash
# instalar (Ubuntu/Debian, ver https://docs.waydroid.id para otras distros)
sudo apt install waydroid

# inicializar el container (una sola vez)
sudo waydroid init

# arrancar la sesión
waydroid session start
```

Verificar que está arriba:

```bash
waydroid status
# Session: RUNNING / Container: RUNNING / IP address: 192.168.xxx.xxx
```

Anotá esa IP, es el "device" para adb.

### 1. Conectar adb y autorizar (una sola vez)

```bash
adb connect <IP-DE-WAYDROID>:5555
adb devices -l
```

La primera vez va a aparecer `unauthorized`. Hace falta ver el popup de
autorización RSA, que solo se muestra con la UI completa abierta:

```bash
waydroid show-full-ui &
```

Con la ventana de Waydroid visible, reconectá:

```bash
adb disconnect <IP-DE-WAYDROID>:5555
adb connect <IP-DE-WAYDROID>:5555
```

Ahí debería aparecer el diálogo "¿Permitir depuración USB?" en la ventana de
Waydroid — aceptalo a mano (es un diálogo de Android, no se puede confirmar
por script). Una vez aceptado queda guardada la key: no se vuelve a pedir
mientras no cambies de máquina.

Confirmar que quedó autorizado:

```bash
adb devices -l
# <IP>:5555   device   product:lineage_waydroid_x86_64 ...
```

### 2. Compilar e instalar el dev client (una vez, y cada vez que sumes una librería nativa nueva)

```bash
cd erp-mobile
ANDROID_SERIAL=<IP-DE-WAYDROID>:5555 npx expo run:android
```

> El flag `--device <ip>` de `expo run:android` NO funciona con un serial de
> red — hay que usar la variable de entorno `ANDROID_SERIAL`.

Tarda varios minutos la primera vez (Gradle). Si ya existía una instalación
previa con otra firma, vas a ver:

```
INSTALL_FAILED_UPDATE_INCOMPATIBLE: Existing package io.opensys.erp
signatures do not match newer version; ignoring!
```

Solución — desinstalar la vieja y reinstalar el APK que acaba de salir del build:

```bash
adb -s <IP-DE-WAYDROID>:5555 uninstall io.opensys.erp
adb -s <IP-DE-WAYDROID>:5555 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Loop de desarrollo (cada vez)

```bash
cd erp-mobile
ANDROID_SERIAL=<IP-DE-WAYDROID>:5555 npx expo start --dev-client
```

En otra terminal, mapear el puerto de Metro y abrir la app:

```bash
adb -s <IP-DE-WAYDROID>:5555 reverse tcp:8081 tcp:8081
adb -s <IP-DE-WAYDROID>:5555 shell am start -n io.opensys.erp/.MainActivity
```

De acá en más, cada cambio de código hace hot reload solo. Si la sesión de
Waydroid se reinició, repetir el paso 3 (el `adb reverse` se pierde).

### Si adb dice "unauthorized" de nuevo

Waydroid guarda la key entre sesiones, pero si igual pide autorización:
`waydroid show-full-ui &`, reconectar, aceptar el popup en la ventana.

---

## Windows — WSL2 + emulador Android

### Contexto

- Metro corre en **WSL2** (Ubuntu)
- El emulador Android (Pixel 7, API 34) corre en **Windows** vía `emulator.exe`
- La IP de WSL2 cambia en cada reinicio — no uses `REACT_NATIVE_PACKAGER_HOSTNAME`
- La ruta de red WSL2 → emulador es lenta (~400ms), causa timeout en Expo Go
- **Solución**: tunnel ADB que evita el routing de red por completo
- Waydroid no existe en Windows (usa containers LXC de Linux) — acá el
  camino es el emulador AVD normal de Android Studio.

### Arranque (cada vez)

#### 1. Verificar que el emulador está conectado

```bash
adb devices
# Debe mostrar: emulator-5554   device
```

Si no aparece, iniciá el emulador desde Android Studio o `emulator.exe` en Windows y esperá que bootee.

#### 2. Activar los tunnels ADB

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

#### 3. Arrancar Expo

```bash
npx expo start --localhost
```

El `--localhost` es obligatorio. Sin él, Expo usa la IP de WSL2 y el emulador no puede alcanzarla confiablemente.

#### 4. Abrir en el emulador

Con el foco en la terminal de Expo, presionar **`a`** para abrir en Android.

### Si la app deja de cargar en medio del desarrollo

El tunnel ADB se cayó (pasa si adb se reconecta). Repetir paso 2 y recargar la app (`r` en la terminal de Expo).

### Si el emulador no aparece en `adb devices`

Desde WSL2:

```bash
adb kill-server
adb start-server
adb devices
```

Si sigue sin aparecer, verificar que el emulador esté corriendo en Windows y que adb de WSL2 y de Windows no estén en conflicto (no tener dos instancias de adb corriendo).
