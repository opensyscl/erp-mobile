import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { subscribe } from '~/lib/realtime';

/**
 * Suscribirse a un evento WS. Cuando llega, ejecuta el handler.
 *
 * @example
 * useRealtime('private-tenant.7', 'product.stock.changed', (payload) => {
 *   queryClient.invalidateQueries({ queryKey: ['products'] });
 * });
 */
export function useRealtime<TPayload = unknown>(
  channel: string | null | undefined,
  event: string,
  handler: (payload: TPayload) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channel) return;
    const sub = subscribe<TPayload>(channel, event, (payload) => handlerRef.current(payload));
    return () => sub.unsubscribe();
  }, [channel, event]);
}

/**
 * Atajo para invalidar queries de TanStack Query cuando llega un evento WS.
 *
 * @example
 * useRealtimeInvalidate(channel, 'sale.created', [['sales'], ['kpis', 'today']]);
 */
export function useRealtimeInvalidate(
  channel: string | null | undefined,
  event: string,
  queryKeys: ReadonlyArray<readonly unknown[]>,
): void {
  const queryClient = useQueryClient();
  useRealtime(channel, event, () => {
    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key as unknown[] });
    });
  });
}
