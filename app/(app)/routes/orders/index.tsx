import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, Package, Plus } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface OrderRow {
  id: number;
  order_number: string;
  client_id: number;
  client_name: string | null;
  client_address: string | null;
  driver_id: number | null;
  driver_name: string | null;
  status: 'pending' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total: number;
  amount_paid: number;
  created_at: string | null;
}

const TABS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'delivered', label: 'Entregados' },
] as const;

const STATUS_TONE: Record<OrderRow['status'], 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<OrderRow['status'], string> = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  cancelled: 'No entregado',
};

const PAYMENT_TONE: Record<OrderRow['payment_status'], 'success' | 'warning' | 'subtle'> = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'subtle',
};

const PAYMENT_LABEL: Record<OrderRow['payment_status'], string> = {
  paid: 'Pagado',
  partial: 'Parcial',
  unpaid: 'Sin cobrar',
};

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function RoutesOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const safeBack = useSafeBack('/(app)/routes/admin');

  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('pending');

  const queryKey = queryKeys.routes.ordersByTab(tab);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: OrderRow[] }>({
        method: 'GET',
        url: `/api/mobile/routes/orders?status=${tab}`,
      }).then((r) => r.data),
  });

  // Counts para badges en los tabs
  const { data: pendingCount } = useQuery({
    queryKey: queryKeys.routes.ordersCount('pending'),
    queryFn: () =>
      apiRequest<{ data: OrderRow[] }>({
        method: 'GET',
        url: '/api/mobile/routes/orders?status=pending',
      }).then((r) => r.data.length),
  });
  const { data: deliveredCount } = useQuery({
    queryKey: queryKeys.routes.ordersCount('delivered'),
    queryFn: () =>
      apiRequest<{ data: OrderRow[] }>({
        method: 'GET',
        url: '/api/mobile/routes/orders?status=delivered',
      }).then((r) => r.data.length),
  });
  const counts: Record<(typeof TABS)[number]['id'], number | undefined> = {
    pending: pendingCount,
    delivered: deliveredCount,
  };

  const orders = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          haptic="selection"
          onPress={safeBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-bg-subtle border border-border"
        >
          <ArrowLeft size={18} color={colors.fg} />
        </Pressable>
        <Text variant="overline" tone="subtle">
          Pedidos
        </Text>
        <Pressable
          haptic="medium"
          onPress={() => router.push('/(app)/routes/orders/new' as never)}
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: brand.brand,
          }}
        >
          <Plus size={18} color={brand.brandFg} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Tabs sticky bajo el header */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = counts[t.id];
          return (
            <Pressable
              key={t.id}
              haptic="selection"
              onPress={() => setTab(t.id)}
              style={{
                flex: 1,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: active ? brand.brand : 'transparent',
                marginBottom: -1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={{
                    fontFamily: active ? Fonts.semibold : Fonts.medium,
                    fontSize: 13,
                    color: active ? colors.fg : colors.fgMuted,
                    letterSpacing: -0.1,
                    includeFontPadding: false,
                  } as never}
                >
                  {t.label}
                </Text>
                {typeof count === 'number' ? (
                  <View
                    style={{
                      paddingHorizontal: 6,
                      minWidth: 20,
                      height: 18,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? brand.brand : colors.bgMuted,
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
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
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
        <View className="gap-2">
          {isLoading
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            : orders.map((o, i) => (
                <Animated.View key={o.id}>
                  <Pressable
                    haptic="selection"
                    scale="subtle"
                    onPress={() => router.push(`/(app)/routes/orders/${o.id}` as never)}
                    style={{
                      backgroundColor: colors.bgElevated,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                    }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View style={{ flex: 1.4 }}>
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
                            {o.order_number}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 999,
                              backgroundColor:
                                (STATUS_TONE[o.status] === 'success'
                                  ? colors.success
                                  : STATUS_TONE[o.status] === 'warning'
                                    ? colors.warning
                                    : colors.danger) + '18',
                            }}
                          >
                            <Text
                              variant="caption"
                              tone={STATUS_TONE[o.status]}
                              style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                            >
                              {STATUS_LABEL[o.status]}
                            </Text>
                          </View>
                        </View>
                        <Text variant="bodyStrong" numberOfLines={1} className="mt-0.5">
                          {o.client_name ?? '—'}
                        </Text>
                        {o.client_address ? (
                          <Text variant="caption" tone="muted" numberOfLines={1}>
                            {o.client_address}
                          </Text>
                        ) : null}
                        <Text variant="caption" tone="subtle" numberOfLines={1} className="mt-1">
                          {o.driver_name ?? 'Sin asignar'} · {formatTime(o.created_at)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={{
                            fontFamily: Fonts.semibold,
                            fontSize: 15,
                            lineHeight: 22,
                            color: colors.fg,
                            fontVariant: ['tabular-nums'],
                            includeFontPadding: false,
                          } as never}
                        >
                          {formatCLP(o.total)}
                        </Text>
                        <Text
                          variant="caption"
                          tone={PAYMENT_TONE[o.payment_status]}
                          className="mt-1"
                          style={{ fontFamily: Fonts.medium }}
                        >
                          {PAYMENT_LABEL[o.payment_status]}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}

          {!isLoading && orders.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <View className="items-center py-6">
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: colors.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={26} color={colors.fgSubtle} />
                </View>
                <Text variant="bodyStrong" className="mt-3">
                  Sin pedidos en este filtro
                </Text>
                <Text variant="caption" tone="muted" className="mt-1 text-center">
                  Crea uno con el botón + arriba.
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
