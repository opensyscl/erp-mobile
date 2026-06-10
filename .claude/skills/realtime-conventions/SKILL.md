---
name: realtime-conventions
description: Arquitectura realtime de erp-mobile (hub central, eventos Reverb, invalidación de queries). Usar al agregar/modificar eventos websocket, suscripciones, notificaciones del bell, o debuggear por qué un dato no refresca en vivo.
---

# Capa realtime — convenciones

## Arquitectura (no desviarse)

Todo el consumo de sockets vive en `src/realtime/` y se monta UNA vez vía
`useRealtimeHub()` en `app/(app)/_layout.tsx`. **Las pantallas NO cablean
sockets ni declaran qué invalidar** — eso es del mapa central.

| Archivo | Rol |
|---|---|
| `src/realtime/events.ts` | Catálogo tipado: canales + nombres de evento + payloads. Espejo 1:1 del backend (`broadcastAs()` / `broadcastWith()`) |
| `src/realtime/client.ts` | Cliente pusher-js → Reverb. Singleton lazy, auth por `/api/mobile/broadcasting/auth`, `onReconnected()` para resync |
| `src/realtime/invalidation.ts` | Mapa evento → query keys (prefijos) + gating por permisos espejo de `routes/channels.php` |
| `src/realtime/useRealtimeHub.ts` | Invalidaciones + feed del bell + resync tras reconexión |
| `src/lib/queryKeys.ts` | Factory de query keys — toda pantalla usa estas, nada inline |

## Agregar un evento nuevo (end-to-end)

1. **Backend** (`~/root/bookforce/erp/app/Events/...`): implementar
   `ShouldBroadcastNow` (NUNCA `ShouldBroadcast` — no hay queue worker en
   staging/prod), definir `broadcastAs()` (nombre estable tipo
   `dominio.cosa.accion`) y `broadcastWith()`.
2. **Canal**: verificar callback de auth en `routes/channels.php`.
3. **events.ts**: agregar la interface del payload (espejo exacto de
   `broadcastWith`, nullabilidad incluida) + entrada en `RealtimeEventMap`
   + constante en `RealtimeEvents`.
4. **invalidation.ts**: regla `{channel, event, keys}` — keys de la factory,
   por PREFIJO (ej `queryKeys.routes.all` cubre todo `['routes', ...]`).
   Respetar el gating de `channelAccess()` (permisos Spatie del login).
5. Si va al bell: suscripción en el efecto 2 del hub con su `NotifKind`
   (union en `src/stores/notifications.ts` + ícono en `NotificationsSheet`).

## Reglas duras

- Eventos de alta frecuencia (ej `routes.driver.location`, ping cada ~8s)
  NO van al mapa de invalidación — consumirlos con `useRealtime()` puntual.
- Payloads = señal de "esto cambió". El estado real se refetchea; no empujar
  estado desde el socket.
- `SaleCompleted` tipa `branch_id` int no-nulo — guard antes de dispatch.
- Tras reconexión WS los eventos perdidos NO se recuperan: el hub ya invalida
  todo lo activo vía `onReconnected`. No agregar polling.

## Debug

- App en `__DEV__` loggea `[realtime] WS state / Evento / Suscripción`.
- Terminal de Reverb muestra cada broadcast entrante.
- Si el evento sale en Reverb pero no llega: revisar nombre exacto del
  evento (`broadcastAs` vs catálogo) y auth del canal (403 en el warn).
- Si no sale en Reverb: el dispatch del backend falta o usa cola.
- Paridad conocida pendiente: `updateStatus` del web NO broadcastea
  `RouteOrderStatusChanged` (solo el mobile lo hace).
