import type { QueryKey } from '@tanstack/react-query';

import { Channels, RealtimeEvents, type RealtimeEventName } from './events';
import { queryKeys } from '~/lib/queryKeys';

export interface RealtimeContext {
  tenantId: number;
  branchId: number | null;
  role: string | null;
  /** Nombres Spatie que devuelve el login (MobileUserResource → getAllPermissions). */
  permissions: readonly string[];
}

export interface InvalidationRule {
  channel: string;
  event: RealtimeEventName;
  keys: readonly QueryKey[];
}

/**
 * ¿A qué canales puede suscribirse este usuario? Espejo exacto de los
 * callbacks de autorización en routes/channels.php del ERP — suscribirse a un
 * canal sin permiso genera un 403 en cada intento de auth.
 */
export function channelAccess(ctx: Pick<RealtimeContext, 'role' | 'permissions'>) {
  const can = (perm: string) => ctx.permissions.includes(perm);
  return {
    routes:
      ctx.role === 'tenant_admin' ||
      ctx.role === 'tenant_manager' ||
      ctx.role === 'tenant_driver' ||
      can('routes.view'),
    // tenant_admin bypassa por rol en el backend (routes/channels.php) — sin
    // este OR, un admin sin el permiso puntual nunca se suscribe y NO recibe
    // ventas/stock desde la web (web→mobile quedaba muerto).
    sales: ctx.role === 'tenant_admin' || can('sales.view') || can('pos.access'),
    inventory: ctx.role === 'tenant_admin' || can('inventory.view'),
    branchPos: ctx.role === 'tenant_admin' || can('pos.access'),
  };
}

/**
 * Mapa central evento → query keys. El hub (useRealtimeHub) mantiene UNA
 * suscripción por (canal, evento) para toda la app — las pantallas no
 * cablean sockets.
 *
 * Notas:
 *   - Las keys son prefijos: invalidateQueries matchea jerárquicamente, así
 *     ['routes'] cubre today/my-orders/orders/fleet/etc. Solo las queries
 *     ACTIVAS refetchean; las inactivas quedan stale y refetchean al montar.
 *   - routes.driver.location queda FUERA a propósito: un ping cada ~8s por
 *     driver invalidando ['routes'] sería una tormenta de refetches. Quien
 *     necesite posiciones live consume el payload con useRealtime().
 *   - sale.created sale del modelo Sale (dispatchesEvents) → cubre TODA venta,
 *     web o mobile, sin depender de branch. sale.completed y
 *     cash-register.status-changed llegan por el canal de branch y solo suman
 *     frescura POS/caja cuando hay branch activa — no son la red de seguridad.
 */
export function invalidationRules(ctx: RealtimeContext): InvalidationRule[] {
  const access = channelAccess(ctx);
  const rules: InvalidationRule[] = [];

  // ——— tenant.{id} — cualquier miembro del tenant ———
  rules.push({
    channel: Channels.tenant(ctx.tenantId),
    event: RealtimeEvents.ApprovalsChanged,
    keys: [queryKeys.approvals.all],
  });

  // ——— tenant.{id}.routes ———
  if (access.routes) {
    const routesChannel = Channels.tenantRoutes(ctx.tenantId);
    const routeEvents = [
      RealtimeEvents.RouteOrderCreated,
      RealtimeEvents.RouteOrderStatusChanged,
      RealtimeEvents.RouteLoadCreated,
      RealtimeEvents.RouteLoadConfirmed,
      RealtimeEvents.RouteLoadClosed,
    ] as const;
    for (const event of routeEvents) {
      rules.push({ channel: routesChannel, event, keys: [queryKeys.routes.all] });
    }
  }

  // ——— tenant.{id}.sales ———
  if (access.sales) {
    rules.push({
      channel: Channels.tenantSales(ctx.tenantId),
      event: RealtimeEvents.SaleCreated,
      keys: [queryKeys.sales.all, queryKeys.cash.all, queryKeys.kpis.all, queryKeys.pos.all],
    });
  }

  // ——— tenant.{id}.inventory ———
  if (access.inventory) {
    const inventoryChannel = Channels.tenantInventory(ctx.tenantId);
    rules.push(
      {
        channel: inventoryChannel,
        event: RealtimeEvents.ProductStockChanged,
        // Tres prefijos a propósito: el listado vive bajo ['products'], el
        // detalle bajo ['product', id] (legado) y el buscador del POS bajo
        // ['pos'] — todos muestran stock. Ver queryKeys.ts.
        keys: [queryKeys.products.all, queryKeys.product.all, queryKeys.pos.all],
      },
      {
        channel: inventoryChannel,
        event: RealtimeEvents.StockBelowThreshold,
        keys: [queryKeys.products.all, queryKeys.pos.all],
      },
    );
  }

  // ——— tenant.{id}.branch.{branchId}.pos ———
  if (access.branchPos && ctx.branchId != null) {
    const branchPos = Channels.tenantBranchPos(ctx.tenantId, ctx.branchId);
    rules.push(
      {
        channel: branchPos,
        event: RealtimeEvents.SaleCompleted,
        keys: [queryKeys.sales.all, queryKeys.cash.all, queryKeys.kpis.all, queryKeys.pos.all],
      },
      {
        channel: branchPos,
        event: RealtimeEvents.CashRegisterStatusChanged,
        keys: [queryKeys.cash.all],
      },
    );
  }

  return rules;
}
