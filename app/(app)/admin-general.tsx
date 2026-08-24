import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityRow, type ActivityItem } from '~/components/dashboard/ActivityRow';
import { ApprovalsCard } from '~/components/dashboard/ApprovalsCard';
import { BalanceCard } from '~/components/dashboard/BalanceCard';
import { QuickActionCircle } from '~/components/dashboard/QuickActionCircle';
import { SalesByDayCard } from '~/components/dashboard/SalesByDayCard';
import { SoftHeader } from '~/components/dashboard/SoftHeader';
import { NotificationsSheet } from '~/components/NotificationsSheet';
import { Pressable, Text } from '~/components/ui';
import { useNotificationsStore, useUnseenCount } from '~/stores/notifications';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest } from '~/lib/api';
import { formatActivityDate } from '~/lib/format';
import {
  ArrowUpRight,
  BarChart,
  Package,
  Receipt,
  ScanLine,
  ShoppingCart,
  Wallet,
} from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { palette, withAlpha } from '~/theme/tokens';
import type { DailyKPIs, RecentActivityResponse } from '~/types/api';

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
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const tenant = useTenantStore((s) => s.tenant);
  const branches = useTenantStore((s) => s.branches);
  const branchId = useTenantStore((s) => s.currentBranchId);
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];
  // Reportes = P&L del negocio (analytics), gateado a admin/manager en el
  // backend. Un cajero/staff no lo ve para no toparse con un 403.
  const isAdminLike = user?.role === 'tenant_admin' || user?.role === 'tenant_manager';

  // Refrescar user/tenant en cada mount del dashboard — barato y arregla casos
  // donde el cache local quedó con avatar_url null antes de un fix del backend.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const { data: kpis, isLoading } = useQuery({
    queryKey: queryKeys.kpis.today,
    queryFn: fetchDailyKPIs,
  });

  const { data: approvalsData } = useQuery({
    queryKey: queryKeys.approvals.pendingCount,
    queryFn: async () =>
      apiRequest<{ counts: { pending: number; mine_pending: number } }>({
        method: 'GET',
        url: '/api/mobile/approvals?status=pending',
      }),
  });
  const approvalsPending = approvalsData?.counts.pending ?? 0;

  // Actividad reciente = últimas boletas del tenant. Cuelga de kpis.activity,
  // que el hub realtime invalida en cada sale.created → se refresca en vivo.
  const { data: activityData } = useQuery({
    queryKey: queryKeys.kpis.activity,
    queryFn: () =>
      apiRequest<RecentActivityResponse>({
        method: 'GET',
        url: '/api/mobile/dashboard/activity',
      }),
  });

  // Contador de notificaciones unificado: el hub realtime (useRealtimeHub en
  // _layout.tsx) pushea al store los eventos de rutas y sale.created.
  const markAllSeen = useNotificationsStore((s) => s.markAllSeen);
  const unseenCount = useUnseenCount();

  const notifSheet = useRef<BottomSheetModalType>(null);

  const firstName = (user?.name ?? 'Equipo').split(' ')[0] ?? 'Equipo';
  const initial = firstName[0]?.toUpperCase() ?? 'O';

  const recentActivity: ActivityItem[] = (activityData?.items ?? []).map((it) => ({
    id: it.id,
    title: it.title,
    sub: it.receipt ? `${it.receipt} · ${formatActivityDate(it.created_at)}` : formatActivityDate(it.created_at),
    amount: it.amount,
    imageUrl: it.image_url,
  }));

  // Trend de últimos 7 días viene del endpoint /api/mobile/dashboard/today
  // como array de 7 floats: [hace 6d, hace 5d, ..., hoy]. Mapeamos cada
  // índice a su día de la semana real y al último le marcamos `current`.
  const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const trend = kpis?.trend ?? [0, 0, 0, 0, 0, 0, 0];
  const weekly = trend.map((value, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      label: WEEKDAY_LABELS[date.getDay()]!,
      value,
      current: i === trend.length - 1,
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSubtle }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <SoftHeader
        greeting={`${getGreeting()},`}
        name={firstName}
        initial={initial}
        // Preferimos el logo del negocio sobre el avatar del user — más relevante
        // en un dashboard de tenant que las iniciales generadas del admin.
        photo={tenant?.logo_url ?? user?.avatar_url}
        avatarColor={brand.brand}
        hasNotifications={unseenCount > 0 || approvalsPending > 0}
        notificationCount={unseenCount}
        onBellPress={() => {
          markAllSeen();
          notifSheet.current?.present();
        }}
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
            delta={
              kpis
                ? {
                    value: kpis.delta_pct,
                    label: 'vs ayer',
                    baseline: (kpis.yesterday_total ?? 0) > 0,
                  }
                : undefined
            }
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

        {/* Quick actions — scroll horizontal con fade en el borde para señalar
            que hay más (antes se cortaba el último ítem sin affordance). */}
        <Animated.View entering={FadeInUp.delay(160).duration(360)} className="mt-6">
          <View style={{ position: 'relative' }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}
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
              {isAdminLike ? (
                <QuickActionCircle
                  label="Reportes"
                  icon={<BarChart size={20} color={colors.fg} strokeWidth={1.7} />}
                  onPress={() => router.push('/(app)/analytics' as never)}
                />
              ) : null}
            </ScrollView>
            {/* Fade derecho: indica scrolleable sin cortar de golpe. */}
            <LinearGradient
              colors={[withAlpha(colors.bgSubtle, 0), colors.bgSubtle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              pointerEvents="none"
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28 }}
            />
          </View>
        </Animated.View>

        {/* Aprobaciones de gastos — entrada a la pantalla (antes huérfana) */}
        <Animated.View entering={FadeInUp.delay(160).duration(360)} className="mx-5 mt-6">
          <ApprovalsCard
            pending={approvalsPending}
            onPress={() => router.push('/(app)/approvals' as never)}
          />
        </Animated.View>

        {/* Ventas por día (semana) */}
        <Animated.View entering={FadeInUp.delay(200).duration(360)} className="mx-5 mt-6">
          <SalesByDayCard
            title="Ventas en la semana"
            // Sin base de comparación (ayer = 0) no mostramos el % — coherente
            // con el chip "sin ventas ayer" del hero.
            delta={(kpis?.yesterday_total ?? 0) > 0 ? kpis?.delta_pct : undefined}
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
                  onPress={() => router.push(`/(app)/sales/${item.id}` as never)}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <NotificationsSheet ref={notifSheet} />
    </View>
  );
}
