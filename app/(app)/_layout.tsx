import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { useRealtimeRouteNotifications } from '~/hooks/useRealtimeNotifications';
import { BarChart, Home, Package, ScanLine, Settings, Truck } from '~/lib/icons';
import { Channels } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { palette } from '~/theme/tokens';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';

export default function AppLayout() {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);

  // Suscripción global a eventos de Routes — vive mientras el usuario
  // esté autenticado, así el bell se actualiza desde cualquier pantalla.
  const routesChannelName = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeRouteNotifications(routesChannelName);

  const modules = tenant?.modules ?? [];
  const hasRoutes = modules.includes('routes');
  const hasInventory = modules.includes('inventory');
  const hasAnalytics = modules.includes('analytics') || hasRoutes;
  const isAdminLike = user?.role === 'tenant_admin' || user?.role === 'tenant_manager';
  const isDriver = user?.role === 'tenant_driver';
  const showHomeTab = true;
  // Driver: su Inicio YA es la vista de rutas (redirect en (app)/index.tsx). Ocultamos
  // la tab "Rutas" para no duplicar. Admin sigue viéndola para navegar drivers.
  const showRoutesTab = hasRoutes && !isDriver;
  const showInventoryTab = hasInventory && !hasRoutes;
  const showScanTab = hasInventory && !hasRoutes;
  const showAnalyticsTab = hasAnalytics && (isAdminLike || isDriver);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: brand.brand,
        tabBarInactiveTintColor: colors.fgSubtle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : colors.bgElevated,
          elevation: 0,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.bgElevated }} />
          ),
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
        name="analytics/index"
        options={{
          href: showAnalyticsTab ? '/(app)/analytics' : null,
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => <BarChart size={size - 2} color={color} strokeWidth={1.6} />,
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
        name="scan"
        options={{
          href: showScanTab ? '/(app)/scan' : null,
          title: 'Escanear',
          tabBarIcon: ({ color, size }) => <ScanLine size={size - 2} color={color} strokeWidth={1.6} />,
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
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
      <Tabs.Screen name="pos" options={{ href: null }} />
      <Tabs.Screen name="approvals/index" options={{ href: null }} />
      <Tabs.Screen name="cash/index" options={{ href: null }} />
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
