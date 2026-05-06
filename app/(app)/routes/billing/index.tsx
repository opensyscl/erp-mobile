import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, Receipt, Wallet } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface BillingData {
  kpis: {
    month_orders: number;
    month_total: number;
    month_paid: number;
    month_pending: number;
    collection_rate: number;
  };
  unpaid_orders: {
    id: number;
    order_number: string;
    client_name: string | null;
    driver_id: number | null;
    driver_name: string | null;
    total: number;
    amount_paid: number;
    pending: number;
    payment_status: 'unpaid' | 'partial';
    created_at: string | null;
  }[];
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export default function RoutesBillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);
  const safeBack = useSafeBack('/(app)/routes/admin');

  const queryKey = ['routes', 'billing'];
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: BillingData }>({
        method: 'GET',
        url: '/api/mobile/routes/billing',
      }).then((r) => r.data),
  });

  const ch = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(ch, RealtimeEvents.RouteOrderStatusChanged, [queryKey]);

  const k = data?.kpis;
  const unpaid = data?.unpaid_orders ?? [];

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
          Facturación
        </Text>
        <View style={{ width: 40 }} />
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
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="caption" tone="muted">
            Cobranza del mes
          </Text>
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 26,
              lineHeight: 36,
              letterSpacing: -0.6,
              color: colors.fg,
              marginTop: 4,
              includeFontPadding: false,
            } as never}
          >
            Facturación
          </Text>
        </Animated.View>

        {/* Hero card — total mes */}
        <Animated.View entering={FadeInDown.delay(60).duration(360)} className="mt-5">
          <View
            style={{
              backgroundColor: brand.brand,
              borderRadius: 22,
              padding: 20,
              shadowColor: brand.brand,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.medium,
                fontSize: 11,
                letterSpacing: 1.2,
                opacity: 0.7,
              }}
            >
              FACTURADO MES
            </Text>
            {isLoading || !k ? (
              <Skeleton className="h-9 w-44 mt-2" />
            ) : (
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 32,
                  lineHeight: 42,
                  letterSpacing: -0.8,
                  marginTop: 4,
                  fontVariant: ['tabular-nums'],
                  includeFontPadding: false,
                } as never}
              >
                {formatCLP(k.month_total)}
              </Text>
            )}
            <View
              className="mt-4"
              style={{
                height: 1,
                backgroundColor: brand.brandFg,
                opacity: 0.2,
              }}
            />
            <View className="flex-row mt-3">
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 10,
                    letterSpacing: 1,
                    opacity: 0.7,
                  }}
                >
                  COBRADO
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 17,
                    lineHeight: 24,
                    fontVariant: ['tabular-nums'],
                    marginTop: 2,
                    includeFontPadding: false,
                  } as never}
                >
                  {isLoading || !k ? '—' : formatCLP(k.month_paid)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 10,
                    letterSpacing: 1,
                    opacity: 0.7,
                  }}
                >
                  POR COBRAR
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 17,
                    lineHeight: 24,
                    fontVariant: ['tabular-nums'],
                    marginTop: 2,
                    includeFontPadding: false,
                  } as never}
                >
                  {isLoading || !k ? '—' : formatCLP(k.month_pending)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 10,
                    letterSpacing: 1,
                    opacity: 0.7,
                  }}
                >
                  TASA
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 17,
                    lineHeight: 24,
                    fontVariant: ['tabular-nums'],
                    marginTop: 2,
                    includeFontPadding: false,
                  } as never}
                >
                  {isLoading || !k ? '—' : `${k.collection_rate}%`}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Por cobrar */}
        <Animated.View entering={FadeInDown.delay(140).duration(360)} className="mt-6">
          <View className="flex-row items-baseline justify-between mb-3">
            <View>
              <Text variant="overline" tone="subtle">
                Por cobrar
              </Text>
              <Text variant="bodyStrong" className="mt-1">
                Pedidos pendientes
              </Text>
            </View>
            <Text variant="caption" tone="muted">
              {unpaid.length} órdenes
            </Text>
          </View>

          <View className="gap-2">
            {isLoading
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : unpaid.map((o, i) => (
                  <Animated.View
                    key={o.id}
                    entering={FadeIn.delay(Math.min(i * 25, 200)).duration(220)}
                  >
                    <Pressable
                      haptic="selection"
                      scale="subtle"
                      onPress={() =>
                        o.driver_id
                          ? router.push(`/(app)/routes?driver_id=${o.driver_id}` as never)
                          : router.push('/(app)/routes' as never)
                      }
                      style={{
                        backgroundColor: colors.bgElevated,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 14,
                      }}
                    >
                      <View className="flex-row items-start gap-3">
                        <View style={{ flex: 1 }}>
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
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 999,
                                backgroundColor:
                                  (o.payment_status === 'partial'
                                    ? colors.warning
                                    : colors.danger) + '18',
                              }}
                            >
                              <Text
                                variant="caption"
                                tone={o.payment_status === 'partial' ? 'warning' : 'danger'}
                                style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                              >
                                {o.payment_status === 'partial' ? 'PARCIAL' : 'SIN COBRAR'}
                              </Text>
                            </View>
                          </View>
                          <Text variant="bodyStrong" numberOfLines={1} className="mt-0.5">
                            {o.client_name ?? '—'}
                          </Text>
                          <Text variant="caption" tone="subtle" numberOfLines={1}>
                            {o.driver_name ?? '—'} · {formatDay(o.created_at)}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              fontFamily: Fonts.semibold,
                              fontSize: 15,
                              lineHeight: 22,
                              color: colors.danger,
                              fontVariant: ['tabular-nums'],
                              includeFontPadding: false,
                            } as never}
                          >
                            {formatCLP(o.pending)}
                          </Text>
                          <Text variant="caption" tone="subtle">
                            de {formatCLP(o.total)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}

            {!isLoading && unpaid.length === 0 ? (
              <Card variant="outlined" padding="lg">
                <View className="items-center py-6">
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 18,
                      backgroundColor: colors.success + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wallet size={26} color={colors.success} />
                  </View>
                  <Text variant="bodyStrong" className="mt-3">
                    Todo cobrado
                  </Text>
                  <Text variant="caption" tone="muted" className="mt-1 text-center">
                    No hay pedidos entregados sin pagar este mes.
                  </Text>
                </View>
              </Card>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
