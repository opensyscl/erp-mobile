# Cuentas demo (mobile)

Los 4 tenants demo que muestra el sheet **"Ver cuentas demo"** del login.
Todos **activos**, password única **`12345678`**.

El endpoint `GET /api/__dev/demos` filtra por slug `opendemo` → solo se ven estos.

| Tenant | Slug | Módulos | Usuarios | Dashboard |
|---|---|---|---|---|
| OpenDemo Routes | `opendemo-routes` | routes, inventory, sales, analytics | `driver.routes@demo.cl` (Carlos) + 3 drivers · `admin@opendemo-routes.cl` | **Driver** (reparto con rutas del día) / Admin |
| OpenDemo ERP | `opendemo-erp` | inventory, sales, pos, analytics | `admin@opendemo-erp.cl` | Admin (ERP general) |
| OpenDemo POS | `opendemo-pos` | pos, sales, inventory | `admin@opendemo-pos.cl` | Admin (punto de venta) |
| OpenDemo Full | `opendemo-full` | todo | `admin@opendemo-full.cl` | Admin (todo habilitado) |

En el sheet cada usuario tiene un **badge de rol**: `Admin` (índigo) / `Driver` (verde).

## Recrear los demos

En el repo del ERP (`~/root/bookforce/erp`):

```bash
php artisan app:demo:opendemo
```

Idempotente: crea los que falten y actualiza config/passwords de los existentes.
Los de routes además corren `app:demo:routes` (drivers + 14 días de loads/orders).

## Levantar el stack

```bash
~/root/josbert-dev/erp-mobile/scripts/dev-stack.sh   # API 0.0.0.0:8000 + Reverb + Expo LAN
```

El `.env` del mobile debe apuntar al backend (`EXPO_PUBLIC_API_URL`). Para local:
`http://<IP-LAN>:8000` + `EXPO_PUBLIC_REVERB_HOST=<IP-LAN>`, `SCHEME=http`, `KEY=reverb-key`.
