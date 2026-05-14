import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityRow, type ActivityItem } from '~/components/dashboard/ActivityRow';
import { BalanceCard } from '~/components/dashboard/BalanceCard';
import { QuickActionCircle } from '~/components/dashboard/QuickActionCircle';
import { SalesByDayCard } from '~/components/dashboard/SalesByDayCard';
import { SoftHeader } from '~/components/dashboard/SoftHeader';
import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { apiRequest } from '~/lib/api';
import {
  ArrowUpRight,
  BarChart,
  Package,
  Receipt,
  ScanLine,
  ShoppingCart,
  Wallet,
} from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { palette } from '~/theme/tokens';
import type { DailyKPIs } from '~/types/api';

const KPI_QUERY_KEY = ['kpis', 'today'] as const;

async function fetchDailyKPIs(): Promise<DailyKPIs> {
  return apiRequest<DailyKPIs>({ method: 'GET', url: '/api/mobile/dashboard/today' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * AdminGeneralDashboard — vista por defecto para usuarios que no son driver
 * ni admin con módulo Routes. Patrón fintech: header soft, hero card con
 * gradient pastel, atajos circulares, actividad reciente.
 *
 * El redirect según rol vive en `app/(app)/index.tsx`.
 */
export default function AdminGeneralDashboard() {
  const router = useRouter();
  const brand = useBrand();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const branches = useTenantStore((s) => s.branches);
  const branchId = useTenantStore((s) => s.currentBranchId);
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];

  const { data: kpis, isLoading } = useQuery({
    queryKey: KPI_QUERY_KEY,
    queryFn: fetchDailyKPIs,
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['approvals', 'pending', 'count'],
    queryFn: async () =>
      apiRequest<{ counts: { pending: number; mine_pending: number } }>({
        method: 'GET',
        url: '/api/mobile/approvals?status=pending',
      }),
  });
  const approvalsPending = approvalsData?.counts.pending ?? 0;

  const salesChannel = tenant ? Channels.tenantSales(tenant.id) : null;
  const inventoryChannel = tenant ? Channels.tenantInventory(tenant.id) : null;
  useRealtimeInvalidate(salesChannel, RealtimeEvents.SaleCreated, [KPI_QUERY_KEY]);
  useRealtimeInvalidate(salesChannel, RealtimeEvents.SaleUpdated, [KPI_QUERY_KEY]);
  useRealtimeInvalidate(inventoryChannel, RealtimeEvents.ProductStockChanged, [['products']]);

  const firstName = (user?.name ?? 'Equipo').split(' ')[0] ?? 'Equipo';
  const initial = firstName[0]?.toUpperCase() ?? 'O';

  // Mock placeholder de actividad reciente — reemplazar cuando exista endpoint.
  const recentActivity: ActivityItem[] = [];

  // Mock placeholder de ventas por día — reemplazar cuando exista endpoint
  // `/api/mobile/dashboard/weekly-sales`. Marcamos el día actual con `current`.
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Lun=0
  const weekly = [
    { label: 'Lun', value: 0 },
    { label: 'Mar', value: 0 },
    { label: 'Mié', value: 0 },
    { label: 'Jue', value: 0 },
    { label: 'Vie', value: 0 },
    { label: 'Sáb', value: 0 },
    { label: 'Dom', value: 0 },
  ].map((d, i) =>
    i === todayIdx
      ? { ...d, value: kpis?.sales_total ?? 0, current: true }
      : d,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSubtle }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <SoftHeader
        greeting={`${getGreeting()},`}
        name={firstName}
        initial={initial}
        avatarColor={brand.brand}
        hasNotifications={approvalsPending > 0}
        onBellPress={() => router.push('/(app)/approvals' as never)}
        topInset={insets.top}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero: BalanceCard estilo fintech */}
        <Animated.View entering={FadeInUp.delay(80).duration(360)} className="mx-5">
          <BalanceCard
            amount={kpis?.sales_total ?? 0}
            count={kpis?.sales_count ?? 0}
            countLabel={kpis && kpis.sales_count === 1 ? 'Boleta' : 'Boletas'}
            delta={kpis ? { value: kpis.delta_pct, label: 'vs ayer' } : undefined}
            contextLabel={branch?.name ?? tenant?.name ?? 'Sucursal'}
            onContextPress={() => router.push('/(app)/settings' as never)}
            primary={{
              label: 'Nueva venta',
              icon: <ArrowUpRight size={16} color={colors.bgElevated} strokeWidth={2.2} />,
              onPress: () => router.push('/(app)/pos' as never),
            }}
            secondary={{
              label: 'Historial',
              icon: <Receipt size={16} color={colors.fg} strokeWidth={1.8} />,
              onPress: () => router.push('/(app)/sales' as never),
            }}
            menu={{ onPress: () => router.push('/(app)/settings' as never) }}
            loading={isLoading}
          />
        </Animated.View>

        {/* Quick actions row — chips circulares */}
        <Animated.View entering={FadeInUp.delay(160).duration(360)} className="mt-6">
          <View
            className="flex-row items-start justify-between px-5"
          >
            <QuickActionCircle
              label="Escanear"
              icon={<ScanLine size={20} color={colors.fg} strokeWidth={1.7} />}
              onPress={() => router.push('/(app)/scan' as never)}
            />
            <QuickActionCircle
              label="POS"
              icon={<ShoppingCart size={20} color={colors.fg} strokeWidth={1.7} />}
              onPress={() => router.push('/(app)/pos' as never)}
            />
            <QuickActionCircle
              label="Caja"
              icon={<Wallet size={20} color={colors.fg} strokeWidth={1.7} />}
              onPress={() => router.push('/(app)/cash' as never)}
            />
            <QuickActionCircle
              label="Stock"
              icon={<Package size={20} color={colors.fg} strokeWidth={1.7} />}
              onPress={() => router.push('/(app)/inventory' as never)}
            />
            <QuickActionCircle
              label="Reportes"
              icon={<BarChart size={20} color={colors.fg} strokeWidth={1.7} />}
              onPress={() => router.push('/(app)/analytics' as never)}
            />
          </View>
        </Animated.View>

        {/* Ventas por día (semana) */}
        <Animated.View entering={FadeInUp.delay(200).duration(360)} className="mx-5 mt-6">
          <SalesByDayCard
            title="Ventas en la semana"
            delta={kpis?.delta_pct}
            data={weekly}
            onSeeAll={() => router.push('/(app)/analytics' as never)}
          />
        </Animated.View>

        {/* Actividad reciente */}
        <Animated.View entering={FadeInUp.delay(280).duration(360)} className="mt-7">
          <View className="flex-row items-center justify-between px-5 mb-2">
            <Text variant="bodyStrong">Actividad reciente</Text>
            <Pressable haptic="selection" onPress={() => router.push('/(app)/sales' as never)}>
              <Text
                style={
                  {
                    fontFamily: 'system',
                    fontSize: 13,
                    lineHeight: 18,
                    color: colors.fgMuted,
                    textDecorationLine: 'underline',
                  } as never
                }
              >
                Ver todo
              </Text>
            </Pressable>
          </View>
          <View
            style={{
              backgroundColor: colors.bgElevated,
              marginHorizontal: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {recentActivity.length === 0 ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={20} color={colors.fgMuted} strokeWidth={1.5} />
                </View>
                <Text variant="body" tone="muted">
                  Aún no hay ventas hoy
                </Text>
                <Text variant="caption" tone="subtle">
                  Las nuevas boletas aparecerán acá en tiempo real
                </Text>
              </View>
            ) : (
              recentActivity.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  onPress={() => router.push('/(app)/sales' as never)}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
