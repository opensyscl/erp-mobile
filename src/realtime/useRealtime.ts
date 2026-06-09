import { useEffect, useRef } from 'react';

import { subscribe } from './client';
import type { RealtimeEventMap, RealtimeEventName } from './events';

/**
 * Suscribirse a un evento WS para consumir su PAYLOAD (posiciones live,
 * contadores, etc). El payload se infiere del nombre del evento.
 *
 * Para invalidar queries NO uses esto: la invalidación es central y vive en
 * src/realtime/invalidation.ts (la maneja useRealtimeHub).
 *
 * @example
 * useRealtime(channel, RealtimeEvents.RouteDriverLocation, (p) => {
 *   setPosition({ lat: p.lat, lng: p.lng });
 * });
 */
export function useRealtime<E extends RealtimeEventName>(
  channel: string | null | undefined,
  event: E,
  handler: (payload: RealtimeEventMap[E]) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channel) return;
    const sub = subscribe(channel, event, (payload) => {
      handlerRef.current(payload as RealtimeEventMap[E]);
    });
    return () => sub.unsubscribe();
  }, [channel, event]);
}
