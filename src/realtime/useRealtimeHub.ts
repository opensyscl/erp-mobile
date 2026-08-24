import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { onReconnected, subscribe, type SubscribeHandle } from './client';
import {
  Channels,
  RealtimeEvents,
  type BroadcastNotificationPayload,
  type RouteOrderStatusChangedPayload,
} from './events';
import { channelAccess, invalidationRules } from './invalidation';
import { isOwnSale } from './ownSales';
import { toast } from '~/components/Toast';
import { formatCLP } from '~/lib/format';
import { useAuthStore } from '~/stores/auth';
import { useNotificationsStore, type NotifKind } from '~/stores/notifications';
import { useTenantStore } from '~/stores/tenant';

/**
 * Hub realtime único de la app — montar UNA vez en (app)/_layout.tsx.
 *
 * Centraliza todo el consumo de sockets:
 *   1. Invalidación de queries según el mapa de invalidation.ts — las
 *      pantallas no cablean sockets ni declaran qué keys invalidar.
 *   2. Feed de notificaciones in-app (bell): eventos de Routes, ventas y
 *      avisos del sistema (canal del usuario).
 *   3. Resync tras reconexión WS: lo emitido durante una desconexión se
 *      pierde — invalidamos todas las queries activas al volver.
 */
export function useRealtimeHub(): void {
  const tenantId = useTenantStore((s) => s.tenant?.id ?? null);
  const branchId = useTenantStore((s) => s.currentBranchId);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const userName = useAuthStore((s) => s.user?.name ?? null);
  const permissions = useAuthStore((s) => s.user?.permissions);
  const queryClient = useQueryClient();
  const pushNotif = useNotificationsStore((s) => s.push);

  // 1. Invalidaciones centralizadas
  useEffect(() => {
    if (!tenantId) return;
    const subs = invalidationRules({
      tenantId,
      branchId,
      role,
      permissions: permissions ?? [],
    }).map((rule) =>
      subscribe(rule.channel, rule.event, () => {
        rule.keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as unknown[] });
        });
      }),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [tenantId, branchId, role, permissions, queryClient]);

  // 2. Feed de notificaciones in-app (bell)
  useEffect(() => {
    if (!tenantId) return;
    const routesChannel = Channels.tenantRoutes(tenantId);
    const access = channelAccess({ role, permissions: permissions ?? [] });
    const subs: SubscribeHandle[] = [
      subscribe(routesChannel, RealtimeEvents.RouteOrderCreated, (p) => {
        pushNotif({
          kind: 'route.order.created',
          title: 'Pedido nuevo',
          body: p.order_number || undefined,
          payload: p as unknown as Record<string, unknown>,
        });
      }),
      subscribe(routesChannel, RealtimeEvents.RouteOrderStatusChanged, (p) => {
        const { kind, title, body } = renderOrderStatusChanged(p);
        pushNotif({ kind, title, body, payload: p as unknown as Record<string, unknown> });
      }),
      subscribe(routesChannel, RealtimeEvents.RouteLoadCreated, (p) => {
        pushNotif({
          kind: 'route.load.created',
          title: 'Nueva carga asignada',
          body: p.driver_name ?? undefined,
          payload: p as unknown as Record<string, unknown>,
        });
        // Noti visible para el driver dueño de la carga (no solo el bell)
        if (isOwnLoad(role, userName, p.driver_name)) {
          toast.success('Nueva carga asignada', `${p.items_count} items · ${p.total_units} unidades`);
        }
      }),
      subscribe(routesChannel, RealtimeEvents.RouteLoadConfirmed, (p) => {
        pushNotif({
          kind: 'route.load.confirmed',
          title: 'Carga confirmada',
          body: p.driver_name ?? undefined,
          payload: p as unknown as Record<string, unknown>,
        });
        if (isOwnLoad(role, userName, p.driver_name)) {
          toast.success('Carga confirmada', 'Tu ruta está lista para salir.');
        }
      }),
      subscribe(routesChannel, RealtimeEvents.RouteLoadClosed, (p) => {
        pushNotif({
          kind: 'route.load.closed',
          title: 'Carga cerrada',
          body: p.driver_name ?? undefined,
          payload: p as unknown as Record<string, unknown>,
        });
      }),
    ];

    // Ventas → badge del bell (antes vivía en admin-general y solo contaba
    // con esa pantalla montada). Mismo gating de canal que invalidation.ts.
    if (access.sales) {
      subs.push(
        subscribe(Channels.tenantSales(tenantId), RealtimeEvents.SaleCreated, (p) => {
          const sale = (p as { sale?: Record<string, unknown> }).sale ?? {};
          const id = typeof sale.id === 'number' ? sale.id : null;
          const total = typeof sale.total === 'number' ? sale.total : null;
          const amount = total != null ? formatCLP(total) : undefined;
          pushNotif({ kind: 'sale.created', title: 'Venta nueva', body: amount });
          // Toast visible SOLO si la venta no se hizo en este dispositivo — si
          // fue acá, ya viste la confirmación del POS (no duplicar).
          if (id == null || !isOwnSale(id)) {
            toast.success('Venta nueva', amount);
          }
        }),
      );
    }

    // Avisos del sistema → canal privado del usuario. Laravel emite las
    // notificaciones broadcast con el FQCN como nombre de evento.
    if (userId != null) {
      subs.push(
        subscribe(
          Channels.user(userId),
          RealtimeEvents.BroadcastNotificationCreated,
          (p: BroadcastNotificationPayload) => {
            pushNotif({
              kind: 'system.alert',
              title: p.title ?? 'Aviso',
              body: p.message,
              payload: p,
            });
          },
        ),
      );
    }

    return () => subs.forEach((s) => s.unsubscribe());
  }, [tenantId, userId, role, userName, permissions, pushNotif]);

  // 3. Resync tras reconexión WS
  useEffect(() => {
    return onReconnected(() => {
      queryClient.invalidateQueries({ refetchType: 'active' });
    });
  }, [queryClient]);
}

function renderOrderStatusChanged(p: RouteOrderStatusChangedPayload): {
  kind: NotifKind;
  title: string;
  body?: string;
} {
  const num = p.order_number ? ` ${p.order_number}` : '';
  if (p.status === 'delivered') {
    return {
      kind: 'route.order.delivered',
      title: `Entrega completada${num}`,
      body: p.amount_paid
        ? `Cobrado $${Math.round(p.amount_paid).toLocaleString('es-CL')}`
        : undefined,
    };
  }
  if (p.status === 'cancelled') {
    return {
      kind: 'route.order.cancelled',
      title: `Entrega cancelada${num}`,
      body: p.reason ?? undefined,
    };
  }
  return { kind: 'route.order.delivered', title: `Cambio de estado${num}`, body: p.status };
}

/**
 * ¿La carga del evento es del usuario actual? El payload trae driver_name
 * (no id), así que matcheamos por nombre — suficiente para no toastear a
 * otros drivers del tenant. Sin nombre en el payload: toast solo si es driver.
 */
function isOwnLoad(role: string | null, userName: string | null, driverName: string | null): boolean {
  if (role !== 'tenant_driver') return false;
  if (!driverName || !userName) return true;
  return driverName.trim().toLowerCase() === userName.trim().toLowerCase();
}
