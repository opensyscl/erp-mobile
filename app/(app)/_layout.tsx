import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';

import { FloatingTabBar } from '~/components/dashboard/FloatingTabBar';
import { useDriverLocationTracking } from '~/hooks/useDriverLocationTracking';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useRealtimeRouteNotifications } from '~/hooks/useRealtimeNotifications';
import { apiRequest } from '~/lib/api';
import { BarChart, Home, Package, Settings, ShoppingCart, Truck, Wallet } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';

export default function AppLayout() {
  const tenant = useTenantStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);

  // Suscripción global a eventos de Routes — vive mientras el usuario
  // esté autenticado, así el bell se actualiza desde cualquier pantalla.
  const routesChannelName = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeRouteNotifications(routesChannelName);

  // GPS tracking del driver — solo cuando es driver y tiene una ruta activa.
  // El backend deduce el load_id si no lo pasamos, pero lo precargamos para
  // que el primer ping ya quede asociado correctamente.
  const isDriverRole = user?.role === 'tenant_driver';
  const todayLoadKey = ['routes', 'today', 'self'] as const;
  const { data: todayLoad } = useQuery({
    queryKey: todayLoadKey,
    queryFn: () =>
      apiRequest<{ data: { id: number } | null }>({
        method: 'GET',
        url: '/api/mobile/routes/today',
      }),
    enabled: isDriverRole,
    // SOLO realtime — sin polling. Reverb dispara la invalidación cuando
    // hay routes.load.created / confirmed / closed (suscripción abajo).
    refetchInterval: false,
  });
  // Invalida la query del load del día cuando llegan eventos del canal
  // tenant.{id}.routes — así el badge y la card del driver actualizan
  // sin polling.
  useRealtimeInvalidate(routesChannelName, RealtimeEvents.RouteLoadCreated, [todayLoadKey]);
  useRealtimeInvalidate(routesChannelName, RealtimeEvents.RouteLoadConfirmed, [todayLoadKey]);
  useRealtimeInvalidate(routesChannelName, RealtimeEvents.RouteLoadClosed, [todayLoadKey]);
  useDriverLocationTracking({
    enabled: isDriverRole && !!todayLoad?.data?.id,
    loadId: todayLoad?.data?.id ?? null,
    intervalMs: 30_000,
  });

  const modules = tenant?.modules ?? [];
  const hasRoutes = modules.includes('routes');
  const hasInventory = modules.includes('inventory');
  const hasAnalytics = modules.includes('analytics') || hasRoutes;
  const hasPos = modules.includes('pos') || modules.includes('sales') || hasInventory;
  const hasCash = modules.includes('cash') || hasPos;
  const isAdminLike = user?.role === 'tenant_admin' || user?.role === 'tenant_manager';
  const isDriver = user?.role === 'tenant_driver';
  const showHomeTab = true;
  // Driver: su Inicio YA es la vista de rutas (redirect en (app)/index.tsx). Ocultamos
  // la tab "Rutas" para no duplicar. Admin sigue viéndola para navegar drivers.
  const showRoutesTab = hasRoutes && !isDriver;
  const showPosTab = hasPos && !isDriver;
  const showCashTab = hasCash && !isDriver;
  const showInventoryTab = hasInventory && !hasRoutes;
  const showAnalyticsTab = hasAnalytics && (isAdminLike || isDriver);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: showHomeTab ? '/(app)/' : null,
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="routes/index"
        options={{
          href: showRoutesTab ? '/(app)/routes' : null,
          title: 'Rutas',
          tabBarIcon: ({ color, size }) => <Truck size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          href: showPosTab ? '/(app)/pos' : null,
          title: 'POS',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="cash/index"
        options={{
          href: showCashTab ? '/(app)/cash' : null,
          title: 'Caja',
          tabBarIcon: ({ color, size }) => <Wallet size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: showInventoryTab ? '/(app)/inventory' : null,
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => <Package size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="analytics/index"
        options={{
          href: showAnalyticsTab ? '/(app)/analytics' : null,
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => <BarChart size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      {/* Pantallas anidadas: visibles vía router.push pero NUNCA en tab bar */}
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="admin-general" options={{ href: null }} />
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
      <Tabs.Screen name="approvals/index" options={{ href: null }} />
      <Tabs.Screen name="sales/index" options={{ href: null }} />
      <Tabs.Screen name="routes/admin" options={{ href: null }} />
      <Tabs.Screen name="routes/orders/index" options={{ href: null }} />
      <Tabs.Screen name="routes/orders/new" options={{ href: null }} />
      <Tabs.Screen name="routes/orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="routes/loads/index" options={{ href: null }} />
      <Tabs.Screen name="routes/drivers/index" options={{ href: null }} />
      <Tabs.Screen name="routes/clients/index" options={{ href: null }} />
      <Tabs.Screen name="routes/production/index" options={{ href: null }} />
      <Tabs.Screen name="routes/billing/index" options={{ href: null }} />
      <Tabs.Screen name="routes/load/[id]" options={{ href: null }} />
    </Tabs>
  );
}
