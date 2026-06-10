---
name: run-dev-stack
description: Levantar el stack completo de dev de erp-mobile (API Laravel + Reverb + Expo LAN con QR) y probar en el teléfono. Usar cuando pidan correr/ejecutar/levantar la app, el QR, o testear realtime end-to-end.
---

# Levantar el stack de dev

## Camino rápido (un comando)

```bash
~/root/josbert-dev/erp-mobile/scripts/dev-stack.sh
```

Idempotente: levanta lo que falte y deja Expo en foreground con QR interactivo.
- API Laravel → `http://192.168.100.125:8000` (repo backend: `~/root/bookforce/erp`)
- Reverb (websockets) → `ws://192.168.100.125:8080`
- Metro/Expo LAN → `exp://192.168.100.125:8081`

El teléfono debe estar en la misma WiFi (`192.168.100.x`). Escanear con Expo Go,
o "Enter URL manually" con la URL exp:// de arriba.

## Manual (si el script no aplica)

```bash
cd ~/root/bookforce/erp && php artisan serve --host=0.0.0.0 --port=8000   # API
cd ~/root/bookforce/erp && php artisan reverb:start                        # WS
cd ~/root/josbert-dev/erp-mobile && npx expo start --port 8081             # Metro
```

NO usar `CI=1` con expo start si se va a editar código: CI deshabilita el
watch mode y Metro sirve bundles viejos.

## Cuentas demo (password única: `12345678`)

| Rol | Tenant | Email |
|---|---|---|
| Driver (Carlos, ruta del día) | `ferreteria-routes` | `driver.routes@demo.cl` |
| Admin con módulo routes | `ferreteria-routes` | `ferreteria.routes@demo.cl` |
| Admin pelado (dashboard general) | `ferreteria-starter` | `ferreteria.starter@demo.cl` |

En dev el login viene precargado con el driver. El sheet "Ver cuentas demo"
lista todo y hace auto-login.

## Regenerar data de routes

```bash
cd ~/root/bookforce/erp && php artisan app:demo:routes --slug=ferreteria-routes
```

Ojo: sortea 2-4 drivers al azar para la ruta de HOY — si Carlos queda sin
ruta, correrlo de nuevo. El seeder NO limpia `route_driver_locations`
(pings GPS huérfanos quedan; bug conocido).

## Pitfalls conocidos

- **Eventos de ventas/stock/caja no llegan**: verificar que los Events del
  backend usen `ShouldBroadcastNow` (la cola `database` no tiene worker).
- **El ERP web tira errores de WS a otro puerto**: assets Vite viejos con
  el puerto horneado — `cd ~/root/bookforce/erp && npm run build` y
  hard-refresh.
- **El emulador Android corre en Windows** (ver DEV-SETUP.md): necesita
  `adb reverse tcp:8081 tcp:8081` y `expo start --localhost`. El flujo QR
  por LAN NO usa nada de eso.
- Web del backend local: `http://localhost:8000/tenant/ferreteria-routes/...`
