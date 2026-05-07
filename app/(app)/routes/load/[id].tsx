import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderPattern } from '~/components/HeaderPattern';
import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight, Package, Truck } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import type { RouteLoad, RouteOrder } from '~/types/routes';

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

const STATUS_LABEL: Record<RouteOrder['status'], string> = {
  pending: 'Pendiente',
  in_route: 'En ruta',
  delivered: 'Entregada',
  cancelled: 'No entregada',
};

const STATUS_TONE: Record<RouteOrder['status'], 'warning' | 'success' | 'danger' | 'brand'> = {
  pending: 'warning',
  in_route: 'brand',
  delivered: 'success',
  cancelled: 'danger',
};

export default function LoadDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);
  const safeBack = useSafeBack('/(app)/');

  const queryKey = ['routes', 'load', params.id];
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: RouteLoad }>({
        method: 'GET',
        url: `/api/mobile/routes/loads/${params.id}`,
      }).then((r) => r.data),
    enabled: !!params.id,
  });

  const ch = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(ch, RealtimeEvents.RouteOrderStatusChanged, [queryKey]);
  useRealtimeInvalidate(ch, RealtimeEvents.RouteLoadClosed, [queryKey]);
  useRealtimeInvalidate(ch, RealtimeEvents.RouteLoadConfirmed, [queryKey]);

  const load = data ?? null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
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
        {/* Hero brand bg */}
        <View
          className="overflow-hidden px-5 pb-20"
          style={{
            backgroundColor: brand.brand,
            paddingTop: insets.top + 12,
          }}
        >
          <HeaderPattern color={brand.brandFg} intensity={1.0} />
          <Animated.View entering={FadeInDown.duration(220)}>
            <View className="flex-row items-center justify-between">
              <Pressable
                haptic="selection"
                onPress={safeBack}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <ArrowLeft size={18} color={brand.brandFg} />
              </Pressable>
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                Detalle de carga
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <View className="mt-7">
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                {load ? formatDay(load.created_at) : '—'}
              </Text>
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 30,
                  lineHeight: 40,
                  letterSpacing: -0.8,
                  marginTop: 4,
                  includeFontPadding: false,
                } as never}
              >
                {load
                  ? `${load.progress.delivered} de ${load.progress.total} entregas`
                  : 'Cargando…'}
              </Text>
              {load ? (
                <Text
                  style={{
                    color: brand.brandFg,
                    opacity: 0.78,
                    fontFamily: Fonts.regular,
                    fontSize: 13,
                    marginTop: 6,
                  }}
                >
                  {load.driver?.name ?? '—'}
                  {load.branch?.name ? ` · ${load.branch.name}` : ''}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>

        {/* Hero Card flotante con métricas */}
        {load ? (
          <Animated.View
            entering={FadeInUp.delay(120).duration(220)}
            className="mx-5"
            style={{ marginTop: -56 }}
          >
            <Card variant="elevated" padding="lg">
              <View className="flex-row gap-3">
                <Metric label="Cobrado" value={formatCLP(load.amounts.collected)} accent={colors.success} />
                <DividerVertical color={colors.border} />
                <Metric label="Por cobrar" value={formatCLP(load.amounts.pending)} accent={colors.warning} />
                <DividerVertical color={colors.border} />
                <Metric label="Total" value={formatCLP(load.amounts.total)} accent={colors.fg} />
              </View>

              {/* Progress bar */}
              <View
                className="mt-4 overflow-hidden"
                style={{ height: 6, borderRadius: 999, backgroundColor: colors.bgMuted }}
              >
                <View
                  className="h-full"
                  style={{
                    width: `${load.progress.pct}%`,
                    backgroundColor: brand.brand,
                  }}
                />
              </View>
              <View className="flex-row justify-between mt-1.5">
                <Text variant="caption" tone="subtle">
                  {load.progress.pct}% completado
                </Text>
                <Text variant="caption" tone="subtle">
                  {load.status === 'open' ? 'En ruta' : 'Cerrada'}
                </Text>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {/* Timeline de paradas */}
        <View className="mt-6 px-5">
          <Text variant="overline" tone="subtle" className="mb-3">
            Paradas ({load?.orders.length ?? 0})
          </Text>

          {isLoading ? (
            <View className="gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </View>
          ) : !load || load.orders.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <View className="items-center py-4">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: colors.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={22} color={colors.fgSubtle} />
                </View>
                <Text variant="bodyStrong" className="mt-3">
                  Sin paradas en esta carga
                </Text>
              </View>
            </Card>
          ) : (
            <View>
              {load.orders.map((o, i) => (
                <View key={o.id}>
                  <TimelineRow
                    order={o}
                    isLast={i === load.orders.length - 1}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View className="flex-1">
      <Text variant="overline" tone="subtle">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 16,
          lineHeight: 22,
          color: accent,
          marginTop: 4,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function DividerVertical({ color }: { color: string }) {
  return <View style={{ width: 1, backgroundColor: color }} />;
}

function TimelineRow({ order, isLast }: { order: RouteOrder; isLast: boolean }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const dotColor =
    order.status === 'delivered'
      ? colors.success
      : order.status === 'cancelled'
        ? colors.danger
        : brand.brand;

  const itemsCount = order.items?.length ?? 0;

  return (
    <View className="flex-row gap-3">
      {/* Timeline column */}
      <View className="items-center" style={{ width: 24 }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: order.status === 'pending' ? colors.bgElevated : dotColor,
            borderWidth: 2,
            borderColor: dotColor,
            marginTop: 12,
          }}
        />
        {!isLast ? (
          <View
            className="flex-1"
            style={{
              width: 2,
              backgroundColor: colors.border,
              marginTop: 4,
              marginBottom: -2,
            }}
          />
        ) : null}
      </View>

      {/* Card */}
      <Pressable
        haptic="selection"
        scale="subtle"
        className="flex-1 mb-3"
        style={{
          backgroundColor: colors.bgElevated,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
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
                {order.order_number}
              </Text>
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor:
                    (STATUS_TONE[order.status] === 'success'
                      ? colors.success
                      : STATUS_TONE[order.status] === 'warning'
                        ? colors.warning
                        : colors.danger) + '18',
                }}
              >
                <Text
                  variant="caption"
                  tone={STATUS_TONE[order.status]}
                  style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                >
                  {STATUS_LABEL[order.status]}
                </Text>
              </View>
            </View>
            <Text variant="bodyStrong" numberOfLines={1} className="mt-1">
              {order.client?.name ?? '—'}
            </Text>
            {order.client?.address ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {order.client.address}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-3 mt-2">
              <View className="flex-row items-center gap-1">
                <Package size={12} color={colors.fgSubtle} strokeWidth={1.6} />
                <Text variant="caption" tone="subtle">
                  {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              {order.created_at ? (
                <Text variant="caption" tone="subtle">
                  {formatTime(order.created_at)}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="items-end">
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 14,
                lineHeight: 20,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {formatCLP(order.total)}
            </Text>
            {order.amount_paid > 0 ? (
              <Text
                variant="caption"
                tone="success"
                style={{ fontFamily: Fonts.medium, marginTop: 2 }}
              >
                {formatCLP(order.amount_paid)}
              </Text>
            ) : (
              <ArrowRight size={14} color={colors.fgSubtle} />
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
