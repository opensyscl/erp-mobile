/**
 * Factory central de query keys de TanStack Query.
 *
 * Reglas:
 *   - Toda pantalla usa estas keys — nada de arrays inline.
 *   - Las keys son jerárquicas: invalidar `routes.all` (['routes']) matchea
 *     today/my-orders/orders/fleet/etc por prefijo.
 *   - El mapa de invalidación realtime (src/realtime/invalidation.ts) invalida
 *     por estos prefijos; si agregás un dominio nuevo, colgalo del prefijo
 *     correcto o agregá la regla correspondiente.
 */
export const queryKeys = {
  routes: {
    all: ['routes'] as const,
    today: (driver: string | number = 'self') => ['routes', 'today', driver] as const,
    myOrders: (driver: string | number = 'self') => ['routes', 'my-orders', driver] as const,
    myLoads: (driver: string | number = 'self') => ['routes', 'my-loads', driver] as const,
    orders: ['routes', 'orders'] as const,
    ordersByTab: (tab: string) => ['routes', 'orders', tab] as const,
    ordersCount: (status: 'pending' | 'delivered') =>
      ['routes', 'orders', 'count', status] as const,
    order: (id: string | number) => ['routes', 'order', id] as const,
    load: (id: string | number) => ['routes', 'load', id] as const,
    loads: ['routes', 'loads'] as const,
    clients: (q: string) => ['routes', 'clients', q] as const,
    drivers: ['routes', 'drivers'] as const,
    fleet: ['routes', 'fleet'] as const,
    adminDashboard: ['routes', 'admin-dashboard'] as const,
    billing: ['routes', 'billing'] as const,
    production: ['routes', 'production'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filter: unknown, search: string) => ['products', { filter, search }] as const,
    search: (q: string) => ['products', 'search', q] as const,
  },
  // Detalle de producto vive bajo el prefijo singular 'product' (legado).
  // El mapa de invalidación realtime invalida ambos prefijos.
  product: {
    all: ['product'] as const,
    detail: (id: string | number) => ['product', String(id)] as const,
    barcode: (code: string) => ['product', 'barcode', code] as const,
  },
  pos: {
    categories: ['pos', 'categories'] as const,
    search: (q: string, categoryId: unknown) => ['pos', 'search', q, categoryId] as const,
  },
  sales: {
    all: ['sales'] as const,
    summary: (period: string) => ['sales', 'summary', period] as const,
  },
  cash: {
    all: ['cash'] as const,
    today: ['cash', 'today'] as const,
  },
  approvals: {
    all: ['approvals'] as const,
    list: (status: string) => ['approvals', status] as const,
    pendingCount: ['approvals', 'pending', 'count'] as const,
  },
  kpis: {
    all: ['kpis'] as const,
    today: ['kpis', 'today'] as const,
    // Feed "Actividad reciente" (últimas boletas). Cuelga de 'kpis' para que
    // el mapa de invalidación realtime lo refresque en cada venta nueva.
    activity: ['kpis', 'activity'] as const,
  },
  analytics: {
    year: ['analytics', 'year'] as const,
  },
} as const;
