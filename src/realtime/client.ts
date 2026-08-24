 
// El bundle CJS de pusher-js para RN expone la clase como `module.exports.Pusher`
// (named export), NO como default. Tras la transformación CJS→ESM de Metro
// nos quedan estos casos posibles según el bundler/version:
//   - PusherModule.Pusher  (lo más común con el bundle webpack actual)
//   - PusherModule.default (si Metro envuelve el módulo CJS como ESM)
//   - PusherModule         (si es CJS sin wrap, importable directo)
// Probamos en orden hasta encontrar algo callable.
import * as PusherModule from 'pusher-js/react-native';

import type { RealtimeEventMap, RealtimeEventName } from './events';
import { resolveRealtime } from '~/lib/env';
import { secureStorage, StorageKeys } from '~/lib/storage';

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
 *   - canales privados (`private-...`) auth via /api/mobile/broadcasting/auth con Bearer token
 *   - reconexión automática manejada por pusher-js
 *   - el cliente NO empuja estado, solo notifica "esto cambió" → consumidor invalida queries
 *   - tras una reconexión, los eventos emitidos durante la desconexión se PERDIERON:
 *     registrá un callback con onReconnected() para resincronizar (invalidar queries).
 */

let pusher: PusherClient | null = null;
const channelCache = new Map<string, PusherChannel>();
const refCount = new Map<string, number>();
const reconnectedListeners = new Set<() => void>();

/** Estado del socket, observable desde la UI (ej. panel de conexión en Ajustes). */
export type RealtimeState =
  | 'initialized'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'failed'
  | 'disconnected';

let currentState: RealtimeState = 'initialized';
const stateListeners = new Set<(s: RealtimeState) => void>();

/** Último estado conocido del WebSocket. */
export function getRealtimeState(): RealtimeState {
  return currentState;
}

/** Se suscribe a cambios de estado del WebSocket. Devuelve el unsubscribe. */
export function onRealtimeStateChange(cb: (s: RealtimeState) => void): () => void {
  stateListeners.add(cb);
  return () => {
    stateListeners.delete(cb);
  };
}

function setRealtimeState(s: RealtimeState): void {
  currentState = s;
  stateListeners.forEach((cb) => cb(s));
}

function debugLog(...args: unknown[]): void {
  if (__DEV__) console.log(...args);
}

/**
 * Registra un callback que corre cada vez que el socket se RECONECTA
 * (no en la primera conexión). Devuelve la función para desregistrarlo.
 */
export function onReconnected(cb: () => void): () => void {
  reconnectedListeners.add(cb);
  return () => {
    reconnectedListeners.delete(cb);
  };
}

function ensureClient(): PusherClient | null {
  if (pusher) return pusher;
  const cfg = resolveRealtime();
  if (!cfg.host || !cfg.key) {
    console.warn('[realtime] No realtime config — host/key faltan');
    return null;
  }

  debugLog(`[realtime] Conectando a ${cfg.scheme}://${cfg.host}:${cfg.port}`);

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
          const { resolveApiUrl } = await import('~/lib/env');
          // Usamos el endpoint API mobile (NO /broadcasting/auth) porque
          // ese tiene middleware 'web' que redirige 302 al login con Bearer
          // tokens. /api/mobile/broadcasting/auth replica la lógica con
          // sólo auth:sanctum + IdentifyTenantApi.
          const url = `${resolveApiUrl()}/api/mobile/broadcasting/auth`;
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

  // Estado de conexión: logs de debug + detección de reconexión para resync.
  const conn = (pusher as any)?.connection;
  if (conn?.bind) {
    let wasConnected = false;
    conn.bind('state_change', (states: { previous: string; current: string }) => {
      debugLog(`[realtime] WS state: ${states.previous} → ${states.current}`);
      setRealtimeState(states.current as RealtimeState);
      if (states.current === 'connected') {
        if (wasConnected) {
          // Reconexión real: lo emitido mientras estuvimos caídos se perdió.
          debugLog('[realtime] Reconectado — disparando resync');
          reconnectedListeners.forEach((cb) => cb());
        }
        wasConnected = true;
      }
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
 *
 * El payload se infiere del nombre del evento vía RealtimeEventMap; para
 * eventos fuera del catálogo el payload es `unknown`.
 */
export function subscribe<E extends string>(
  channelName: string,
  eventName: E,
  handler: (payload: E extends RealtimeEventName ? RealtimeEventMap[E] : unknown) => void,
): SubscribeHandle {
  const client = ensureClient();
  if (!client) {
    return { unsubscribe: () => undefined };
  }

  let channel = channelCache.get(channelName);
  if (!channel) {
    debugLog(`[realtime] Suscribiendo a ${channelName}`);
    channel = client.subscribe(channelName);
    channelCache.set(channelName, channel);
    // Listeners de éxito/error de subscripción para canales privados
    (channel as any).bind?.('pusher:subscription_succeeded', () => {
      debugLog(`[realtime] ✓ Subscrito a ${channelName}`);
    });
    (channel as any).bind?.('pusher:subscription_error', (err: any) => {
      console.warn(`[realtime] ✗ Falló subscripción a ${channelName}`, err);
    });
  }
  const ch = channel;
  refCount.set(channelName, (refCount.get(channelName) ?? 0) + 1);

  const wrappedHandler = (data: any) => {
    debugLog(`[realtime] Evento "${eventName}" en ${channelName}`, data);
    handler(data);
  };
  ch.bind(eventName, wrappedHandler);

  return {
    unsubscribe: () => {
      // Handle de una sesión anterior: si el cliente global ya no es el que
      // capturó este closure (logout / cambio de entorno entre medio), los
      // mapas pertenecen a la sesión nueva — no hay nada que limpiar acá.
      if (pusher !== client) return;
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

/** Cierra la conexión WS (ej. al hacer logout o cambiar de entorno dev). */
export function disconnectRealtime(): void {
  if (!pusher) return;
  // Soltar los listeners de conexión antes de descartar la instancia — si no,
  // un state_change tardío del socket viejo puede disparar un falso resync.
  const conn = (pusher as any)?.connection;
  conn?.unbind?.('state_change');
  conn?.unbind?.('error');
  pusher.disconnect();
  pusher = null;
  channelCache.clear();
  refCount.clear();
}
