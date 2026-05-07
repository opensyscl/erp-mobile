/* eslint-disable @typescript-eslint/no-explicit-any */
// El bundle CJS de pusher-js para RN expone la clase como `module.exports.Pusher`
// (named export), NO como default. Tras la transformación CJS→ESM de Metro
// nos quedan estos casos posibles según el bundler/version:
//   - PusherModule.Pusher  (lo más común con el bundle webpack actual)
//   - PusherModule.default (si Metro envuelve el módulo CJS como ESM)
//   - PusherModule         (si es CJS sin wrap, importable directo)
// Probamos en orden hasta encontrar algo callable.
import * as PusherModule from 'pusher-js/react-native';

import { resolveRealtime } from './env';
import { secureStorage, StorageKeys } from './storage';

function resolvePusherCtor(): any {
  const m: any = PusherModule;
  const candidates = [m?.Pusher, m?.default?.Pusher, m?.default, m];
  for (const c of candidates) {
    if (typeof c === 'function') return c;
  }
  // Si no encontramos nada callable lanzamos un error legible — no `constructor is not callable`.
  throw new Error(
    'pusher-js no expuso un constructor en ninguna forma reconocida (Pusher | default | namespace).',
  );
}

const PusherCtor: any = resolvePusherCtor();

interface PusherChannel {
  name: string;
  bind(event: string, handler: (data: any) => void): void;
  unbind(event: string, handler?: (data: any) => void): void;
}

interface PusherClient {
  subscribe(channel: string): PusherChannel;
  unsubscribe(channel: string): void;
  disconnect(): void;
}

/**
 * Cliente WebSocket compatible con Pusher protocol — apunta a Laravel Reverb del ERP.
 *
 * Estrategia:
 *   - 1 conexión por sesión, lazy (solo se crea cuando alguien se subscribe)
 *   - canales privados (`private-...`) auth via /broadcasting/auth con Bearer token
 *   - reconexión automática manejada por pusher-js
 *   - el cliente NO empuja estado, solo notifica "esto cambió" → consumidor invalida queries
 */

let pusher: PusherClient | null = null;
const channelCache = new Map<string, PusherChannel>();
const refCount = new Map<string, number>();

function ensureClient(): PusherClient | null {
  if (pusher) return pusher;
  const cfg = resolveRealtime();
  if (!cfg.host || !cfg.key) {
    console.warn('[realtime] No realtime config — host/key faltan');
    return null;
  }

  console.log(`[realtime] Conectando a ${cfg.scheme}://${cfg.host}:${cfg.port}`);

  pusher = new PusherCtor(cfg.key, {
    wsHost: cfg.host,
    wsPort: cfg.port,
    wssPort: cfg.port,
    forceTLS: cfg.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    cluster: '', // Reverb no usa cluster
    authorizer: (channel: { name: string }) => ({
      authorize: async (socketId: string, callback: (err: Error | null, data: any) => void) => {
        try {
          const token = await secureStorage.get(StorageKeys.AuthToken);
          const tenant = await secureStorage.get(StorageKeys.TenantSlug);
          const { resolveApiUrl } = await import('./env');
          const url = `${resolveApiUrl()}/broadcasting/auth`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Client': 'opensys-mobile',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(tenant ? { 'X-Tenant': tenant } : {}),
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
          });
          if (!res.ok) {
            console.warn(`[realtime] auth failed for ${channel.name}: ${res.status}`);
            callback(new Error(`broadcasting/auth ${res.status}`), null);
            return;
          }
          const data = await res.json();
          callback(null, data);
        } catch (err) {
          console.warn('[realtime] auth threw', err);
          callback(err as Error, null);
        }
      },
    }),
  });

  // Logs de estado de conexión — útil para debug del bell de notificaciones
  const conn = (pusher as any)?.connection;
  if (conn?.bind) {
    conn.bind('state_change', (states: { previous: string; current: string }) => {
      console.log(`[realtime] WS state: ${states.previous} → ${states.current}`);
    });
    conn.bind('error', (err: any) => {
      console.warn('[realtime] WS error', err);
    });
  }

  return pusher;
}

export interface SubscribeHandle {
  unsubscribe: () => void;
}

/**
 * Subscribirse a un evento de un canal. Soporta canales públicos y privados
 * (`private-...`). Devuelve un handle para limpiar.
 */
export function subscribe<TPayload = unknown>(
  channelName: string,
  eventName: string,
  handler: (payload: TPayload) => void,
): SubscribeHandle {
  const client = ensureClient();
  if (!client) {
    return { unsubscribe: () => undefined };
  }

  let channel = channelCache.get(channelName);
  if (!channel) {
    console.log(`[realtime] Suscribiendo a ${channelName}`);
    channel = client.subscribe(channelName);
    channelCache.set(channelName, channel);
    // Listeners de éxito/error de subscripción para canales privados
    (channel as any).bind?.('pusher:subscription_succeeded', () => {
      console.log(`[realtime] ✓ Subscrito a ${channelName}`);
    });
    (channel as any).bind?.('pusher:subscription_error', (err: any) => {
      console.warn(`[realtime] ✗ Falló subscripción a ${channelName}`, err);
    });
  }
  const ch = channel;
  refCount.set(channelName, (refCount.get(channelName) ?? 0) + 1);

  const wrappedHandler = (data: any) => {
    console.log(`[realtime] Evento "${eventName}" en ${channelName}`, data);
    handler(data as TPayload);
  };
  ch.bind(eventName, wrappedHandler);

  return {
    unsubscribe: () => {
      ch.unbind(eventName, wrappedHandler);
      const next = (refCount.get(channelName) ?? 1) - 1;
      if (next <= 0) {
        client.unsubscribe(channelName);
        channelCache.delete(channelName);
        refCount.delete(channelName);
      } else {
        refCount.set(channelName, next);
      }
    },
  };
}

/** Cierra la conexión WS (ej. al hacer logout). */
export function disconnectRealtime(): void {
  if (!pusher) return;
  pusher.disconnect();
  pusher = null;
  channelCache.clear();
  refCount.clear();
}

/**
 * Catálogo de canales — espejo cliente de `routes/channels.php` del ERP.
 * El prefijo `private-` lo agrega Pusher protocol automáticamente para
 * canales privados; el backend lo strip antes de matchear contra los
 * Broadcast::channel('tenant.{tenantId}', ...) callbacks.
 */
export const Channels = {
  tenant: (tenantId: number) => `private-tenant.${tenantId}`,
  tenantPos: (tenantId: number) => `private-tenant.${tenantId}.pos`,
  tenantSales: (tenantId: number) => `private-tenant.${tenantId}.sales`,
  tenantBranchPos: (tenantId: number, branchId: number) =>
    `private-tenant.${tenantId}.branch.${branchId}.pos`,
  tenantInventory: (tenantId: number) => `private-tenant.${tenantId}.inventory`,
  tenantRoutes: (tenantId: number) => `private-tenant.${tenantId}.routes`,
  tenantOnline: (tenantId: number) => `presence-tenant.${tenantId}.online`,
  user: (userId: number) => `private-App.Models.User.${userId}`,
} as const;

/**
 * Eventos broadcast — el `class` que devuelve `broadcastAs()` en Laravel.
 * Si un Event no implementa `broadcastAs`, Laravel usa el FQCN, p.ej.
 * `App\\Events\\Mobile\\ProductStockChanged`. Recomendado siempre definir
 * `broadcastAs()` para tener nombres estables y libres del namespace PHP.
 */
export const RealtimeEvents = {
  ProductStockChanged: 'product.stock.changed',
  SaleCreated: 'sale.created',
  SaleUpdated: 'sale.updated',
  CashDrawerChanged: 'cash.drawer.changed',
  NotificationReceived: 'notification.received',
  // Routes module
  RouteLoadCreated: 'routes.load.created',
  RouteLoadConfirmed: 'routes.load.confirmed',
  RouteLoadClosed: 'routes.load.closed',
  RouteOrderCreated: 'routes.order.created',
  RouteOrderStatusChanged: 'routes.order.status-changed',
  // Approvals
  ApprovalsChanged: 'approvals.changed',
} as const;
