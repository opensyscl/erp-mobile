/**
 * Catálogo tipado de canales y eventos realtime — espejo cliente del backend.
 *
 * Fuente de verdad (repo erp):
 *   - Canales:  routes/channels.php
 *   - Eventos:  app/Events/** — `broadcastAs()` define el nombre del evento,
 *     `broadcastWith()` el payload.
 *
 * Si tocás un evento en el backend, actualizá acá el nombre Y el payload.
 */

/**
 * Catálogo de canales — espejo cliente de `routes/channels.php` del ERP.
 * El prefijo `private-` lo agrega Pusher protocol automáticamente para
 * canales privados; el backend lo strip antes de matchear contra los
 * Broadcast::channel('tenant.{tenantId}', ...) callbacks.
 *
 * Autorización por canal (channels.php):
 *   - tenant            → cualquier miembro del tenant
 *   - tenantRoutes      → admin/manager/driver o permiso routes.view
 *   - tenantSales       → sales.view o pos.access (un driver NO pasa)
 *   - tenantInventory   → inventory.view (un driver NO pasa)
 *   - tenantBranchPos   → pos.access + pertenecer a la branch
 *   - user              → solo el propio usuario
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

// ——— Payloads — espejo de broadcastWith() en app/Events/** del ERP ———

/** app/Events/Tenant/Routes/RouteOrderCreated.php */
export interface RouteOrderCreatedPayload {
  order_id: number;
  order_number: string;
  driver_name: string | null;
  client_name: string | null;
  total: number;
}

/** app/Events/Tenant/Routes/RouteOrderStatusChanged.php */
export interface RouteOrderStatusChangedPayload {
  order_id: number;
  order_number: string;
  status: string;
  payment_status: string;
  amount_paid: number;
  reason: string | null;
}

/** app/Events/Tenant/Routes/RouteLoadCreated.php */
export interface RouteLoadCreatedPayload {
  load_id: number;
  driver_name: string | null;
  items_count: number;
  total_units: number;
}

/** app/Events/Tenant/Routes/RouteLoadConfirmed.php */
export interface RouteLoadConfirmedPayload {
  load_id: number;
  driver_name: string | null;
}

/** app/Events/Tenant/Routes/RouteLoadClosed.php */
export interface RouteLoadClosedPayload {
  load_id: number;
  driver_name: string | null;
}

/** app/Events/Tenant/Routes/DriverLocationUpdated.php — ping cada ~8s por driver */
export interface DriverLocationUpdatedPayload {
  driver_id: number;
  load_id: number | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

/** app/Events/SaleCreated.php — broadcastWith devuelve ['sale' => saleData] sin tipar */
export interface SaleCreatedPayload {
  sale: Record<string, unknown>;
}

/** app/Events/Tenant/POS/SaleCompleted.php */
export interface SaleCompletedPayload {
  sale_id: number;
  cash_register_id: number;
  user_id: number;
  user_name: string;
  receipt_number: string;
  total: number;
  payment_method: string;
  time: string;
}

/** app/Events/Tenant/POS/CashRegisterStatusChanged.php */
export interface CashRegisterStatusChangedPayload {
  status: string;
  cash_register_id: number;
  user_id: number;
  user_name: string;
}

/** app/Events/Mobile/ProductStockChanged.php */
export interface ProductStockChangedPayload {
  product_id: number;
  sku: string;
  new_stock: number;
  reason: string | null;
  changed_at: string;
}

/** app/Events/Tenant/Inventory/StockBelowThreshold.php */
export interface StockBelowThresholdPayload {
  product_id: number;
  product_name: string;
  current_stock: number;
  threshold: number;
}

/** app/Events/Tenant/Approvals/ExpenseRequestChanged.php */
export interface ExpenseRequestChangedPayload {
  request_id: number;
  status: string;
  action: string;
}

/**
 * Notificaciones de Laravel (`->notify()` con canal broadcast) llegan al canal
 * del usuario con el FQCN del evento como nombre — pusher-js lo recibe crudo.
 * Payload = toBroadcast() + { id, type } que Laravel agrega.
 */
export interface BroadcastNotificationPayload {
  id: string;
  type: string;
  title?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Mapa evento → payload. Da inferencia de tipos en subscribe()/useRealtime(). */
export interface RealtimeEventMap {
  'routes.order.created': RouteOrderCreatedPayload;
  'routes.order.status-changed': RouteOrderStatusChangedPayload;
  'routes.load.created': RouteLoadCreatedPayload;
  'routes.load.confirmed': RouteLoadConfirmedPayload;
  'routes.load.closed': RouteLoadClosedPayload;
  'routes.driver.location': DriverLocationUpdatedPayload;
  'sale.created': SaleCreatedPayload;
  'sale.completed': SaleCompletedPayload;
  'cash-register.status-changed': CashRegisterStatusChangedPayload;
  'product.stock.changed': ProductStockChangedPayload;
  'stock.below-threshold': StockBelowThresholdPayload;
  'approvals.changed': ExpenseRequestChangedPayload;
  'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated': BroadcastNotificationPayload;
}

export type RealtimeEventName = keyof RealtimeEventMap;

/**
 * Nombres estables que devuelve broadcastAs() en el backend.
 *
 * Removidos respecto al catálogo viejo (eran cables muertos):
 *   - 'sale.updated'        → ningún evento del backend lo emite
 *   - 'cash.drawer.changed' → el backend emite 'cash-register.status-changed'
 *   - 'notification.received' → Laravel emite el FQCN BroadcastNotificationCreated
 */
export const RealtimeEvents = {
  ProductStockChanged: 'product.stock.changed',
  StockBelowThreshold: 'stock.below-threshold',
  SaleCreated: 'sale.created',
  SaleCompleted: 'sale.completed',
  CashRegisterStatusChanged: 'cash-register.status-changed',
  // Routes module
  RouteLoadCreated: 'routes.load.created',
  RouteLoadConfirmed: 'routes.load.confirmed',
  RouteLoadClosed: 'routes.load.closed',
  RouteOrderCreated: 'routes.order.created',
  RouteOrderStatusChanged: 'routes.order.status-changed',
  RouteDriverLocation: 'routes.driver.location',
  // Approvals
  ApprovalsChanged: 'approvals.changed',
  // Laravel notifications (canal del usuario)
  BroadcastNotificationCreated:
    'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
} as const satisfies Record<string, RealtimeEventName>;
