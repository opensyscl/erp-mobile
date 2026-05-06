# API Contract

Endpoints del ERP OpenSys que la app móvil consume. Espejo de los Resources de Laravel.

> Para activar estos endpoints en el backend, ver [`bookforce/erp/docs/mobile-api-integration.md`](../../../bookforce/erp/docs/mobile-api-integration.md).

## Headers comunes

Toda request mobile envía:

```
Accept: application/json
Content-Type: application/json
X-Client: opensys-mobile
X-Tenant: {slug}                       # excepto cuando ya viaja por subdominio
Authorization: Bearer {sanctum_token}  # excepto en /auth/login
```

## Resolución de tenant

Dos modos soportados, configurable via `EXPO_PUBLIC_TENANT_MODE`:

| Modo | Cómo se envía | Cuándo usar |
|---|---|---|
| `header` (default) | `X-Tenant: cafenuevo` con baseURL fija | Producción multi-tenant |
| `subdomain` | URL `cafenuevo.app.opensys.cl` | Cuando wildcard SSL ya está |

## Endpoints

### POST `/api/mobile/auth/login`

**Body:**
```json
{
  "email": "josbert@cafenuevo.cl",
  "password": "******",
  "device_name": "iPhone 15 — Josbert"
}
```

**Response 200:**
```json
{
  "token": "1|XXXXXX...",
  "user": {
    "id": 1,
    "name": "Josbert Lara",
    "email": "josbert@cafenuevo.cl",
    "role": "tenant_admin",
    "avatar_url": null,
    "permissions": ["pos.access", "inventory.view", "..."]
  },
  "tenant": {
    "id": 7,
    "slug": "cafenuevo",
    "name": "Café Nuevo",
    "logo_url": null,
    "brand_color": "#3D63DD",
    "timezone": "America/Santiago",
    "currency": "CLP",
    "modules": ["pos", "inventory", "billing"]
  },
  "branches": [
    { "id": 1, "name": "Sucursal Centro", "address": "Ahumada 123", "is_default": true },
    { "id": 2, "name": "Providencia", "address": null, "is_default": false }
  ]
}
```

**Errores:**
- `401` — credenciales incorrectas
- `422` — validación (email format, missing fields, tenant no resuelto)

### POST `/api/mobile/auth/logout`

Revoca el token Sanctum actual. Auth requerido.

**Response 200:** `{ "message": "logged_out" }`

### GET `/api/mobile/auth/me`

Re-hidrata user + tenant + branches del usuario activo. Auth requerido.

**Response 200:** Mismo shape que `login` pero sin `token`.

---

## Endpoints futuros (a implementar)

Esta es la lista de endpoints que las pantallas mobile necesitan. Se irán implementando por vertical.

| Pantalla | Endpoint | Método | Nota |
|---|---|---|---|
| Home / KPIs | `/api/mobile/dashboard/today` | GET | Devuelve `{ sales_total, sales_count, ticket_avg, margin_pct, trend[] }` |
| Inventario list | `/api/mobile/products` | GET | Paginado, soporta `?search=` y `?status=low\|out\|all` |
| Inventario detalle | `/api/mobile/products/{id}` | GET | |
| Scanner | `/api/mobile/products/by-barcode/{code}` | GET | Quick lookup para POS móvil |
| Aprobaciones | `/api/mobile/approvals` | GET | Lista de pendientes del usuario |
| Aprobar gasto | `/api/mobile/approvals/{id}/approve` | POST | |
| Cuadre caja | `/api/mobile/cash-drawers/current` | GET | |

Cada endpoint nuevo agregar al group `mobile` de `routes/api.php` y a `docs/mobile-api-integration.md` del backend.

---

## Convención de paginación

```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 30,
    "total": 142
  }
}
```

Reflejado en `src/types/api.ts → PaginatedResponse<T>`.

## Convención de errores

Todos los errores devuelven JSON con esta forma — `ApiError` los normaliza:

```json
{
  "message": "Credenciales incorrectas.",
  "code": "auth.invalid",
  "errors": { "email": ["..."], "password": ["..."] }
}
```

`code` opcional. `errors` solo en 422.
