import { Tabs } from 'expo-router';

import { FloatingTabBar } from '~/components/dashboard/FloatingTabBar';
import { BarChart, Home, Package, Settings, ShoppingCart, Truck, Wallet } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';

/**
 * Las 7 pestañas de la app. Solo pestañas: las pantallas de detalle viven en
 * el Stack padre ((app)/_layout.tsx) y se pushean por encima de esta barra.
 */
export default function TabsLayout() {
  const tenant = useTenantStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);

  const modules = tenant?.modules ?? [];
  const hasRoutes = modules.includes('routes');
  const hasInventory = modules.includes('inventory');
  const hasAnalytics = modules.includes('analytics') || hasRoutes;
  const hasPos = modules.includes('pos') || modules.includes('sales') || hasInventory;
  const hasCash = modules.includes('cash') || hasPos;
  const isAdminLike = user?.role === 'tenant_admin' || user?.role === 'tenant_manager';
  const isDriver = user?.role === 'tenant_driver';
  const showHomeTab = true;
  // Driver: su Inicio YA es la vista de rutas (redirect en (tabs)/index.tsx). Ocultamos
  // la tab "Rutas" para no duplicar. Admin sigue viéndola para navegar drivers.
  const showRoutesTab = hasRoutes && !isDriver;
  const showPosTab = hasPos && !isDriver;
  const showCashTab = hasCash && !isDriver;
  const showInventoryTab = hasInventory && !hasRoutes;
  // Reportes muestra P&L del tenant (ingresos/gastos/utilidad) → solo dueño/manager.
  // Un repartidor NO debe ver las finanzas de la empresa.
  const showAnalyticsTab = hasAnalytics && isAdminLike;
  // El driver trabaja sobre sus pedidos: le damos "Pedidos" como 2ª pestaña
  // (su Inicio ya es el dashboard de ruta).
  const showDriverOrdersTab = isDriver && hasRoutes;

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
          href: showHomeTab ? '/(app)/(tabs)' : null,
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: showDriverOrdersTab ? '/(app)/(tabs)/orders' : null,
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => <Package size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="routes/index"
        options={{
          href: showRoutesTab ? '/(app)/(tabs)/routes' : null,
          title: 'Rutas',
          tabBarIcon: ({ color, size }) => <Truck size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          href: showPosTab ? '/(app)/(tabs)/pos' : null,
          title: 'POS',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="cash/index"
        options={{
          href: showCashTab ? '/(app)/(tabs)/cash' : null,
          title: 'Caja',
          tabBarIcon: ({ color, size }) => <Wallet size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: showInventoryTab ? '/(app)/(tabs)/inventory' : null,
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => <Package size={size - 2} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="analytics/index"
        options={{
          href: showAnalyticsTab ? '/(app)/(tabs)/analytics' : null,
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
    </Tabs>
  );
}
