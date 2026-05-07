import { useEffect } from 'react';

import { subscribe } from '~/lib/realtime';
import { useNotificationsStore, type NotifKind } from '~/stores/notifications';

interface RouteOrderEventPayload {
  order_id?: number;
  order_number?: string;
  status?: string;
  amount_paid?: number;
  reason?: string;
  driver_name?: string;
  load_id?: number;
}

const ROUTE_EVENTS: { event: string; kind: NotifKind; render: (p: RouteOrderEventPayload) => { title: string; body?: string } }[] = [
  {
    event: 'routes.order.created',
    kind: 'route.order.created',
    render: (p) => ({ title: 'Pedido nuevo', body: p.order_number ? `${p.order_number}` : undefined }),
  },
  {
    event: 'routes.order.status-changed',
    kind: 'route.order.delivered',
    render: (p) => {
      const num = p.order_number ? ` ${p.order_number}` : '';
      if (p.status === 'delivered') return { title: `Entrega completada${num}`, body: p.amount_paid ? `Cobrado $${Math.round(p.amount_paid).toLocaleString('es-CL')}` : undefined };
      if (p.status === 'cancelled') return { title: `Entrega cancelada${num}`, body: p.reason ?? undefined };
      return { title: `Cambio de estado${num}`, body: p.status };
    },
  },
  {
    event: 'routes.load.created',
    kind: 'route.load.created',
    render: (p) => ({ title: 'Nueva carga asignada', body: p.driver_name ?? undefined }),
  },
  {
    event: 'routes.load.confirmed',
    kind: 'route.load.confirmed',
    render: (p) => ({ title: 'Carga confirmada', body: p.driver_name ?? undefined }),
  },
  {
    event: 'routes.load.closed',
    kind: 'route.load.closed',
    render: (p) => ({ title: 'Carga cerrada', body: p.driver_name ?? undefined }),
  },
];

/**
 * Suscribe al canal `tenant.{id}.routes` y empuja cada evento al store de
 * notificaciones in-app. Independiente de las invalidations de TanStack Query
 * — solo logging para que el ícono de campana muestre contador y feed.
 */
export function useRealtimeRouteNotifications(channel: string | null | undefined): void {
  const push = useNotificationsStore((s) => s.push);

  useEffect(() => {
    if (!channel) return;
    const subs = ROUTE_EVENTS.map(({ event, kind, render }) =>
      subscribe<RouteOrderEventPayload>(channel, event, (payload) => {
        const { title, body } = render(payload);
        // Refinar kind para order.status-changed según el status real
        let resolvedKind: NotifKind = kind;
        if (event === 'routes.order.status-changed') {
          if (payload.status === 'delivered') resolvedKind = 'route.order.delivered';
          else if (payload.status === 'cancelled') resolvedKind = 'route.order.cancelled';
        }
        push({
          kind: resolvedKind,
          title,
          body,
          payload: payload as unknown as Record<string, unknown>,
        });
      }),
    );
    return () => {
      subs.forEach((s) => s.unsubscribe());
    };
  }, [channel, push]);
}
