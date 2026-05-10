import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { ArrowLeft, Package, Truck } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';
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

export default function LoadDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);
  const safeBack = useSafeBack('/(app)/');
  const router = useRouter();

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

  const [orderTab, setOrderTab] = useState<'pending' | 'delivered'>('pending');
  const allOrders = load?.orders ?? [];
  const pendingOrders = allOrders.filter(
    (o) => o.status === 'pending' || o.status === 'in_route',
  );
  const deliveredOrders = allOrders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled',
  );
  const visibleOrders = orderTab === 'pending' ? pendingOrders : deliveredOrders;

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
            <Card  padding="lg">
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
          <Text variant="overline" tone="subtle" style={{ marginBottom: 10 }}>
            Paradas
          </Text>

          {/* Tab switcher */}
          {load && allOrders.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bgMuted,
                borderRadius: 10,
                padding: 3,
                marginBottom: 14,
              }}
            >
              {([
                { key: 'pending', label: 'Pendientes', count: pendingOrders.length },
                { key: 'delivered', label: 'Entregadas', count: deliveredOrders.length },
              ] as const).map((t) => {
                const active = orderTab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    haptic="selection"
                    onPress={() => setOrderTab(t.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 8,
                      backgroundColor: active ? colors.bgElevated : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: active ? Fonts.semibold : Fonts.medium,
                        fontSize: 13,
                        color: active ? colors.fg : colors.fgMuted,
                        includeFontPadding: false,
                      } as never}
                    >
                      {t.label}
                    </Text>
                    <View
                      style={{
                        minWidth: 20,
                        height: 18,
                        paddingHorizontal: 6,
                        borderRadius: 9,
                        backgroundColor: active ? brand.brand : colors.bgSubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 10,
                          color: active ? brand.brandFg : colors.fgMuted,
                          fontVariant: ['tabular-nums'],
                          includeFontPadding: false,
                        } as never}
                      >
                        {t.count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {isLoading ? (
            <View className="gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </View>
          ) : !load || allOrders.length === 0 ? (
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
          ) : visibleOrders.length === 0 ? (
            <View
              style={{
                paddingVertical: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                backgroundColor: colors.bgSubtle,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
              }}
            >
              <Text variant="body" tone="muted">
                {orderTab === 'pending'
                  ? 'No quedan paradas pendientes.'
                  : 'Aún no hay paradas entregadas.'}
              </Text>
            </View>
          ) : (
            <View>
              {visibleOrders.map((o, i) => (
                <View key={o.id}>
                  <TimelineRow
                    order={o}
                    isLast={i === visibleOrders.length - 1}
                    onPress={() => router.push(`/(app)/routes/orders/${o.id}` as never)}
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

function TimelineRow({
  order,
  isLast,
  onPress,
}: {
  order: RouteOrder;
  isLast: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const accent =
    order.status === 'delivered'
      ? colors.success
      : order.status === 'cancelled'
        ? colors.danger
        : order.status === 'in_route'
          ? brand.brand
          : colors.warning;

  const itemsCount = order.items?.length ?? 0;
  const initial = (order.client?.name?.trim()[0] ?? '?').toUpperCase();
  const pending = Math.max(0, order.total - order.amount_paid);

  return (
    <View className="flex-row gap-3">
      {/* Timeline column */}
      <View className="items-center" style={{ width: 24 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: order.status === 'pending' ? colors.bgElevated : accent,
            borderWidth: 2,
            borderColor: accent,
            marginTop: 16,
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
        onPress={onPress}
        className="flex-1 mb-3"
        style={{
          backgroundColor: colors.bgElevated,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        }}
      >
        {/* Top: order number pill + status pill */}
        <View className="flex-row items-center justify-between">
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: withAlpha(brand.brand, 0.1),
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 10,
                letterSpacing: 0.4,
                color: brand.brand,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
              numberOfLines={1}
            >
              {order.order_number}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: withAlpha(accent, 0.12),
            }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: accent }} />
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 9,
                color: accent,
                letterSpacing: 0.4,
                includeFontPadding: false,
              } as never}
            >
              {STATUS_LABEL[order.status].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Client row con avatar */}
        <View className="flex-row items-center gap-2.5" style={{ marginTop: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: withAlpha(brand.brand, 0.1),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 13,
                color: brand.brand,
                includeFontPadding: false,
              } as never}
            >
              {initial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 14,
                lineHeight: 19,
                color: colors.fg,
                includeFontPadding: false,
              } as never}
              numberOfLines={1}
            >
              {order.client?.name ?? '—'}
            </Text>
            {order.client?.address ? (
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  color: colors.fgMuted,
                  includeFontPadding: false,
                } as never}
                numberOfLines={1}
              >
                {order.client.address}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Meta row: items + hora */}
        <View className="flex-row items-center gap-4" style={{ marginTop: 10 }}>
          <View className="flex-row items-center gap-1.5">
            <Package size={12} color={colors.fgSubtle} strokeWidth={1.6} />
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 11,
                color: colors.fgSubtle,
                includeFontPadding: false,
              } as never}
            >
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          {order.created_at ? (
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: colors.fgSubtle,
                opacity: 0.6,
              }}
            />
          ) : null}
          {order.created_at ? (
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 11,
                color: colors.fgSubtle,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {formatTime(order.created_at)}
            </Text>
          ) : null}
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: colors.border,
            marginTop: 12,
            marginBottom: 10,
          }}
        />

        {/* Footer: monto + cobrado */}
        <View className="flex-row items-center justify-between">
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 16,
              lineHeight: 20,
              letterSpacing: -0.3,
              color: colors.fg,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never}
          >
            {formatCLP(order.total)}
          </Text>
          {order.amount_paid > 0 ? (
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 11,
                color: pending > 0 ? colors.warning : colors.success,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {pending > 0
                ? `${formatCLP(pending)} por cobrar`
                : `✓ ${formatCLP(order.amount_paid)} cobrado`}
            </Text>
          ) : order.status === 'delivered' || order.status === 'cancelled' ? (
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 11,
                color: colors.fgSubtle,
                includeFontPadding: false,
              } as never}
            >
              sin cobro
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
