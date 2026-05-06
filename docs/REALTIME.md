# Realtime · Web ↔ Mobile sync

Cuando alguien cambia un dato en el ERP web (Filament admin, Inertia controllers, scripts), la app móvil lo refleja sin pull-to-refresh. Y viceversa.

## Stack

- **Backend:** [Laravel Reverb](https://reverb.laravel.com/) (WebSocket server compatible con Pusher protocol). Ya instalado en `composer.json` del ERP.
- **Cliente mobile:** [`pusher-js`](https://github.com/pusher/pusher-js) en `src/lib/realtime.ts`.
- **Auth de canales privados:** `POST /broadcasting/auth` con Bearer token Sanctum.

## Patrón

```
Acción en web/server          Reverb broadcast              Mobile escucha
─────────────────────         ─────────────────             ──────────────
Action.handle()      ─────►   broadcast(new Event(...))  ─► useRealtime
                                                              ↓
                                                          queryClient.invalidate
                                                              ↓
                                                          fetch refetch
                                                              ↓
                                                          UI update
```

**Regla clave:** los eventos NO transportan estado completo, solo dicen "esto cambió, refetcha". Esto evita que mobile y web tengan reglas distintas sobre qué datos son válidos. La fuente de verdad sigue siendo la API REST.

## Catálogo de canales

Mantener en sincronía entre `routes/channels.php` (backend) y `src/lib/realtime.ts → Channels` (mobile).

| Canal | Tipo | Quién puede subscribirse |
|---|---|---|
| `tenant.{tenantId}` | private | Cualquier usuario del tenant |
| `tenant.{tenantId}.pos` | private | Usuario con `pos.access` |
| `tenant.{tenantId}.branch.{branchId}.pos` | private | Usuario con `pos.access` y asignado a esa sucursal |
| `tenant.{tenantId}.inventory` | private | Usuario con `inventory.view` |
| `tenant.{tenantId}.routes` | private | Admin/manager/driver del tenant |
| `tenant.{tenantId}.online` | presence | Cualquier usuario del tenant (publica `{id, name, photo, role}`) |
| `App.Models.User.{userId}` | private | Solo ese usuario (notificaciones broadcast de Laravel) |

Pusher protocol agrega automáticamente `private-` / `presence-` como prefijo al subscribir desde el cliente — el backend lo strip antes de matchear contra los callbacks de `Broadcast::channel()`.

## Catálogo de eventos

| Evento (broadcastAs) | Canal donde se emite | Trigger backend |
|---|---|---|
| `product.stock.changed` | `tenant.{id}.inventory` | Cualquier mutación de stock (venta, compra, ajuste, devolución) |
| `sale.created` | `tenant.{id}.pos` | POS crea boleta |
| `sale.updated` | `tenant.{id}.pos` | POS modifica boleta (anulación, devolución) |
| `cash.drawer.changed` | `tenant.{id}.pos` | Apertura/cierre de caja, depósito, retiro |
| `notification.received` | `App.Models.User.{userId}` | Laravel `Notification::send($user)` con channel `broadcast` |

Más detalle del payload en cada Event class de `app/Events/Mobile/`.

## Cómo agregar un evento nuevo (full flow)

### 1. Backend — crear el Event

```bash
php artisan make:event Mobile/SaleCreated
```

Implementa así (espejo de [`ProductStockChanged`](../../../bookforce/erp/app/Events/Mobile/ProductStockChanged.php)):

```php
class SaleCreated implements ShouldBroadcast
{
    public function __construct(
        public readonly int $tenantId,
        public readonly int $saleId,
        public readonly int $branchId,
        public readonly int $totalCents,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("tenant.{$this->tenantId}.pos")];
    }

    public function broadcastAs(): string
    {
        return 'sale.created';
    }

    public function broadcastWith(): array
    {
        return [
            'sale_id' => $this->saleId,
            'branch_id' => $this->branchId,
            'total_cents' => $this->totalCents,
        ];
    }
}
```

### 2. Backend — disparar desde el Action

```php
public function handle(User $user, array $data): Sale
{
    $sale = Sale::create([...]);
    broadcast(new SaleCreated(
        tenantId: $sale->tenant_id,
        saleId: $sale->id,
        branchId: $sale->branch_id,
        totalCents: $sale->total_cents,
    ))->toOthers();
    return $sale;
}
```

`->toOthers()` evita que el cliente que originó la venta reciba su propio evento (ya tiene el dato fresco).

### 3. Mobile — agregar al catálogo

`src/lib/realtime.ts`:

```ts
export const RealtimeEvents = {
  // ...
  SaleCreated: 'sale.created',
} as const;
```

Si el canal es nuevo:

```ts
export const Channels = {
  // ...
  tenantPos: (tenantId: number) => `private-tenant.${tenantId}.pos`,
} as const;
```

### 4. Mobile — escuchar en la pantalla

```tsx
useRealtimeInvalidate(
  tenant ? Channels.tenantPos(tenant.id) : null,
  RealtimeEvents.SaleCreated,
  [['kpis', 'today'], ['sales']],
);
```

## Debugging

### "El evento no llega al mobile"

1. Verifica que Reverb esté corriendo: `ps aux | grep reverb`
2. `php artisan reverb:debug` muestra conexiones activas
3. En el cliente: `pusher.connection.bind('connected', ...)` para confirmar conexión
4. Verifica que `EXPO_PUBLIC_REVERB_KEY` matchea con `REVERB_APP_KEY` del backend
5. Si broadcast falla auth: revisar que el endpoint `/broadcasting/auth` está registrado con `auth:sanctum` en `bootstrap/app.php`

### "El canal autoriza pero el evento no llega"

- Verifica `broadcastAs()` — el cliente escucha por ese string, no por el FQCN
- Confirma que `broadcast()` se está llamando (no `event()`, que no broadcastea)
- Revisa logs de Reverb: `tail -f storage/logs/laravel.log`

### "Demasiados invalidates → fetches duplicados"

- Junta varias invalidaciones en una sola key prefix: `[['products']]` en vez de `[['products', 'list'], ['products', 'detail']]`
- TanStack Query `staleTime: 30s` ya evita hammers innecesarios
