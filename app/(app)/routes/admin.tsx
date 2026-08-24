import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Dimensions, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YearBarsChart } from '~/components/charts/YearBarsChart';
import { RouteLiveMap } from '~/components/RouteLiveMap';
import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useFleetLocations } from '~/hooks/useFleetLocations';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest } from '~/lib/api';
import { ArrowRight, BarChart, Package, PackageReceive, Plus, Truck, User as UserIcon, UserGroup, Wallet } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette, withAlpha } from '~/theme/tokens';

interface DashboardData {
  kpis: {
    orders_today: number;
    delivered: number;
    pending: number;
    collected: number;
  };
  fleet: {
    active_loads: number;
    active_drivers: number;
  };
  income_by_day: { label: string; date: string; amount: number; is_today: boolean }[];
  week_total: number;
  top_drivers: {
    driver_id: number;
    name: string;
    total_orders: number;
    delivered: number;
    collected: number;
  }[];
  recent_orders: {
    id: number;
    order_number: string;
    client_name: string | null;
    driver_id: number | null;
    driver_name: string | null;
    status: 'pending' | 'delivered' | 'cancelled';
    total: number;
    created_at: string | null;
  }[];
  as_of: string;
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function RoutesAdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const me = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const screenW = Dimensions.get('window').width;

  const firstName = (me?.name ?? 'Equipo').split(' ')[0] ?? 'Admin';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.routes.adminDashboard,
    queryFn: () =>
      apiRequest<{ data: DashboardData }>({
        method: 'GET',
        url: '/api/mobile/routes/admin-dashboard',
      }).then((r) => r.data),
  });

  // Flota en vivo: posiciones de drivers (REST + WS routes.driver.location).
  const fleet = useFleetLocations();

  const STATUS_TONE: Record<DashboardData['recent_orders'][number]['status'], 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    delivered: 'success',
    cancelled: 'danger',
  };

  const STATUS_LABEL: Record<DashboardData['recent_orders'][number]['status'], string> = {
    pending: 'Pendiente',
    delivered: 'Entregada',
    cancelled: 'No entregada',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={brand.brand}
            colors={[brand.brand]}
          />
        }
      >
        {/* Greeting + CTA */}
        <Animated.View entering={FadeInDown.duration(360)} className="flex-row items-start justify-between gap-3">
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              {greeting()},
            </Text>
            <View className="flex-row items-baseline gap-1.5 mt-0.5">
              <Text
                style={{
                  fontFamily: Fonts.semibold,
                  fontSize: 28,
                lineHeight: 38,
                  letterSpacing: -0.7,
                  color: colors.fg,
                }}
              >
                {firstName}
              </Text>
              <Text style={{ fontSize: 22 }}>👋</Text>
            </View>
            <Text variant="caption" tone="subtle" className="mt-1">
              Panel de control · {tenant?.name ?? 'Routes'}
            </Text>
          </View>
          <Pressable
            haptic="medium"
            onPress={() => router.push('/(app)/routes' as never)}
            style={{
              backgroundColor: brand.brand,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...brandShadow(brand.brand, 'md'),
            }}
          >
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.semibold,
                fontSize: 12,
                lineHeight: 18,
                letterSpacing: -0.1,
                includeFontPadding: false,
              } as never}
            >
              Ver Dashboard de Rutas
            </Text>
            <ArrowRight size={14} color={brand.brandFg} />
          </Pressable>
        </Animated.View>

        {/* Accesos rápidos */}
        <Animated.View entering={FadeInDown.delay(40).duration(360)} className="mt-5 -mx-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            <QuickAction
              label="Nuevo Pedido"
              icon={<Plus size={20} color={brand.brandFg} strokeWidth={2.4} />}
              bg={brand.brand}
              fg={brand.brandFg}
              onPress={() => router.push('/(app)/routes/orders/new' as never)}
            />
            <QuickAction
              label="Pedidos"
              icon={<Package size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/orders' as never)}
            />
            <QuickAction
              label="Clientes"
              icon={<UserIcon size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/clients' as never)}
            />
            <QuickAction
              label="Producción"
              icon={<PackageReceive size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/production' as never)}
            />
            <QuickAction
              label="Cargas"
              icon={<Truck size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/loads' as never)}
            />
            <QuickAction
              label="Ruteros"
              icon={<UserGroup size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/drivers' as never)}
            />
            <QuickAction
              label="Facturación"
              icon={<Wallet size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/routes/billing' as never)}
            />
            <QuickAction
              label="Reportes"
              icon={<BarChart size={20} color={colors.fg} strokeWidth={1.6} />}
              bg={colors.bgElevated}
              fg={colors.fg}
              onPress={() => router.push('/(app)/analytics' as never)}
            />
          </ScrollView>
        </Animated.View>

        {/* 4 KPI cards en grid 2x2 */}
        <Animated.View entering={FadeInDown.delay(80).duration(360)} className="mt-6">
          <View className="flex-row gap-2.5">
            <KpiCard label="Pedidos Hoy" value={data?.kpis.orders_today} loading={isLoading} />
            <KpiCard
              label="Entregados"
              value={data?.kpis.delivered}
              loading={isLoading}
              accent={colors.success}
            />
          </View>
          <View className="flex-row gap-2.5 mt-2.5">
            <KpiCard
              label="Pendientes"
              value={data?.kpis.pending}
              loading={isLoading}
              accent={brand.brand}
            />
            <KpiCard
              label="Ingresos Hoy"
              value={isLoading ? undefined : formatCLP(data?.kpis.collected ?? 0)}
              loading={isLoading}
              isMoney
            />
          </View>
        </Animated.View>

        {/* Fleet cards */}
        <Animated.View entering={FadeInDown.delay(160).duration(360)} className="mt-3 gap-2.5">
          <FleetCard
            label="Cargas activas"
            value={data?.fleet.active_loads ?? 0}
            sub="camiones en ruta"
            icon={<Package size={18} color={brand.brand} />}
            iconBg={brand.brandSubtle}
            onPress={() => router.push('/(app)/routes' as never)}
            loading={isLoading}
          />
          <FleetCard
            label="Repartidores activos"
            value={data?.fleet.active_drivers ?? 0}
            sub="trabajando hoy"
            icon={<UserIcon size={18} color={colors.warning} />}
            iconBg={withAlpha(colors.warning, 0.13)}
            loading={isLoading}
          />
        </Animated.View>

        {/* Flota en vivo — pines de drivers que se mueven por realtime. */}
        <Animated.View entering={FadeInDown.delay(200).duration(360)} className="mt-3">
          <Card variant="outlined" padding="md">
            <View className="flex-row items-center justify-between mb-3">
              <Text variant="overline" tone="subtle">
                Flota en vivo
              </Text>
              <View className="flex-row items-center gap-1.5">
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }}
                />
                <Text variant="caption" tone="muted">
                  {fleet.length} {fleet.length === 1 ? 'en línea' : 'en línea'}
                </Text>
              </View>
            </View>
            {fleet.length > 0 ? (
              <RouteLiveMap
                stops={[]}
                drivers={fleet.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, label: d.name ?? undefined }))}
                brand={brand.brand}
                height={220}
              />
            ) : (
              <View
                style={{
                  height: 120,
                  borderRadius: 16,
                  backgroundColor: colors.bgMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" tone="muted">
                  Ningún repartidor compartiendo ubicación ahora.
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Income chart 7 días */}
        <Animated.View entering={FadeInDown.delay(240).duration(360)} className="mt-5">
          <Card variant="outlined" padding="md">
            <View className="flex-row items-baseline justify-between">
              <View>
                <Text variant="overline" tone="subtle">
                  Últimos 7 días
                </Text>
                <Text variant="bodyStrong" className="mt-1">
                  Ingresos por día
                </Text>
              </View>
              <View className="items-end">
                <Text variant="overline" tone="subtle">
                  Total semana
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 16,
                    lineHeight: 24,
                    color: colors.success,
                    fontVariant: ['tabular-nums'],
                    marginTop: 2,
                    includeFontPadding: false,
                  } as never}
                >
                  {formatCLP(data?.week_total ?? 0)}
                </Text>
              </View>
            </View>

            {isLoading ? (
              <Skeleton className="h-44 mt-3" />
            ) : (
              <View className="mt-3">
                <YearBarsChart
                  months={
                    data?.income_by_day.map((d) => ({
                      label: d.label,
                      value: d.amount,
                      isCurrent: d.is_today,
                    })) ?? []
                  }
                  width={screenW - 64}
                  height={200}
                  brand={brand.brand}
                  brandSubtle={brand.brandSubtle}
                  fg={colors.fg}
                  fgSubtle={colors.fgSubtle}
                  border={colors.border}
                  showAverage={false}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Top Repartidores */}
        <Animated.View entering={FadeInDown.delay(320).duration(360)} className="mt-5">
          <Card variant="outlined" padding="md">
            <Text variant="overline" tone="subtle">
              Ranking del día
            </Text>
            <Text variant="bodyStrong" className="mt-1">
              Top Repartidores
            </Text>

            {isLoading ? (
              <View className="mt-3 gap-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </View>
            ) : (data?.top_drivers ?? []).length === 0 ? (
              <Text variant="caption" tone="muted" className="mt-3">
                Sin actividad de repartidores hoy.
              </Text>
            ) : (
              <View className="mt-3 gap-2.5">
                {data!.top_drivers.map((d, i) => (
                  <Animated.View
                    key={d.driver_id}

                  >
                    <Pressable
                      haptic="selection"
                      onPress={() =>
                        router.push(`/(app)/routes?driver_id=${d.driver_id}` as never)
                      }
                      scale="subtle"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: i === 0 ? brand.brandSubtle : colors.bgMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: Fonts.semibold,
                            fontSize: 12,
                            lineHeight: 18,
                            color: i === 0 ? brand.brand : colors.fgMuted,
                            includeFontPadding: false,
                          } as never}
                        >
                          {i + 1}°
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {d.name}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {d.delivered}/{d.total_orders} entregas · {formatCLP(d.collected)}
                        </Text>
                      </View>
                      <ArrowRight size={16} color={colors.fgSubtle} />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Actividad reciente */}
        <Animated.View entering={FadeInDown.delay(400).duration(360)} className="mt-5">
          <View className="flex-row items-baseline justify-between mb-2">
            <View>
              <Text variant="overline" tone="subtle">
                Actividad reciente
              </Text>
              <Text variant="bodyStrong" className="mt-1">
                Últimos pedidos
              </Text>
            </View>
            <Pressable
              haptic="selection"
              onPress={() => router.push('/(app)/routes' as never)}
            >
              <Text style={{ color: brand.brand, fontFamily: Fonts.medium, fontSize: 13, lineHeight: 20, includeFontPadding: false } as never}>
                Ver todos →
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </View>
          ) : (data?.recent_orders ?? []).length === 0 ? (
            <Card variant="outlined" padding="md">
              <Text variant="body" tone="muted" className="text-center">
                No hay pedidos del día todavía.
              </Text>
            </Card>
          ) : (
            <Card variant="outlined" padding="none">
              {data!.recent_orders.map((o, i, arr) => (
                <Pressable
                  key={o.id}
                  haptic="selection"
                  scale="subtle"
                  onPress={() =>
                    o.driver_id
                      ? router.push(`/(app)/routes?driver_id=${o.driver_id}` as never)
                      : router.push('/(app)/routes' as never)
                  }
                  style={
                    i < arr.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                      : undefined
                  }
                  className="px-4 py-3 flex-row items-center gap-3"
                >
                  <View style={{ flex: 1.4 }}>
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 12,
                        lineHeight: 18,
                        color: brand.brand,
                        letterSpacing: 0.2,
                        includeFontPadding: false,
                      } as never}
                    >
                      {o.order_number}
                    </Text>
                    <Text variant="caption" tone="default" numberOfLines={1} className="mt-0.5">
                      {o.client_name ?? '—'}
                    </Text>
                    <Text variant="caption" tone="subtle" numberOfLines={1}>
                      {o.driver_name ?? '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor:
                          withAlpha((STATUS_TONE[o.status] === 'warning'
                            ? colors.warning
                            : STATUS_TONE[o.status] === 'success'
                              ? colors.success
                              : colors.danger), 0.09),
                      }}
                    >
                      <View
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor:
                            STATUS_TONE[o.status] === 'warning'
                              ? colors.warning
                              : STATUS_TONE[o.status] === 'success'
                                ? colors.success
                                : colors.danger,
                        }}
                      />
                      <Text
                        variant="caption"
                        tone={STATUS_TONE[o.status]}
                        style={{ fontFamily: Fonts.medium }}
                      >
                        {STATUS_LABEL[o.status]}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14,
                        lineHeight: 22,
                        color: colors.fg,
                        fontVariant: ['tabular-nums'],
                        marginTop: 4,
                        includeFontPadding: false,
                      } as never}
                    >
                      {formatCLP(o.total)}
                    </Text>
                    <Text variant="caption" tone="subtle">
                      {formatTime(o.created_at)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── KPI card ─── */

function KpiCard({
  label,
  value,
  loading,
  accent,
  isMoney,
}: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
  accent?: string;
  isMoney?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text variant="overline" tone="subtle">
        {label}
      </Text>
      {loading ? (
        <Skeleton className="h-8 w-20 mt-2" />
      ) : (
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: isMoney ? 22 : 30,
            lineHeight: isMoney ? 32 : 42,
            letterSpacing: isMoney ? -0.4 : -0.9,
            color: accent ?? colors.fg,
            fontVariant: ['tabular-nums'],
            marginTop: 6,
            includeFontPadding: false,
          } as never}
        >
          {value ?? 0}
        </Text>
      )}
    </View>
  );
}

/* ─── Quick action ─── */

function QuickAction({
  label,
  icon,
  bg,
  fg,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        width: 96,
        height: 96,
        borderRadius: 18,
        backgroundColor: bg,
        borderWidth: bg === colors.bgElevated ? 1 : 0,
        borderColor: colors.border,
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: bg === colors.bgElevated ? colors.bgMuted : 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 12,
          lineHeight: 16,
          color: fg,
          letterSpacing: -0.1,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─── Fleet card ─── */

function FleetCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  onPress,
  loading,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress?: () => void;
  loading: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const inner = (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <View className="flex-row items-baseline gap-1.5">
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 24,
                lineHeight: 34,
                letterSpacing: -0.6,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {value}
            </Text>
            <Text variant="caption" tone="muted">
              {sub}
            </Text>
          </View>
        )}
      </View>
      {onPress ? <ArrowRight size={16} color={colors.fgSubtle} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable haptic="selection" onPress={onPress} scale="subtle">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
