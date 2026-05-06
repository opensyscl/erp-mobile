import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { apiRequest } from '~/lib/api';
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface SaleSummary {
  id: number;
  receipt_number: number | null;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  status: string;
  created_at: string | null;
}

interface TopProduct {
  product_id: number;
  name: string;
  qty: number;
  total: number;
  pct: number;
}

interface SummaryData {
  period: 'today' | 'week' | 'month';
  total: number;
  count: number;
  cogs: number;
  margin_pct: number;
  delta_pct: number;
  trend: { label: string; total: number }[];
  by_method: Record<string, { count: number; total: number }>;
  top_products: TopProduct[];
  sales: SaleSummary[];
  as_of: string;
}

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
] as const;

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
};

const METHOD_COLOR_KEY: Record<string, 'brand' | 'accent' | 'success' | 'purple'> = {
  cash: 'success',
  debit: 'brand',
  credit: 'purple',
  transfer: 'accent',
};

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function SalesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const QUERY_KEY = ['sales', 'summary', period] as const;

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      apiRequest<{ data: SummaryData }>({
        method: 'GET',
        url: `/api/mobile/sales/summary?period=${period}`,
      }).then((r) => r.data),
  });

  // Realtime
  const ch = tenant ? Channels.tenantSales(tenant.id) : null;
  useRealtimeInvalidate(ch, RealtimeEvents.SaleCreated, [QUERY_KEY]);
  useRealtimeInvalidate(ch, RealtimeEvents.SaleUpdated, [QUERY_KEY]);

  const isPositive = (data?.delta_pct ?? 0) >= 0;
  const trendMax = data ? Math.max(...data.trend.map((b) => b.total), 1) : 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            haptic="selection"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-subtle border border-border"
          >
            <ArrowLeft size={18} color={colors.fg} />
          </Pressable>
          <Text variant="overline" tone="subtle">
            Ventas
          </Text>
          <View className="h-10 w-10" />
        </View>

        {/* Period tabs */}
        <View
          className="flex-row mt-3 p-1 rounded-full self-center"
          style={{ backgroundColor: colors.bgSubtle }}
        >
          {PERIODS.map((p) => {
            const active = period === p.id;
            return (
              <Pressable
                key={p.id}
                haptic="selection"
                onPress={() => setPeriod(p.id)}
                className="px-5 rounded-full"
                style={{
                  height: 32,
                  justifyContent: 'center',
                  backgroundColor: active ? colors.bgElevated : 'transparent',
                  shadowColor: active ? '#0a0d14' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: active ? 0.06 : 0,
                  shadowRadius: 4,
                  elevation: active ? 1 : 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: -0.1,
                    color: active ? colors.fg : colors.fgMuted,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Hero KPI */}
        <Animated.View entering={FadeInDown.duration(360)}>
          <Card variant="elevated" padding="lg">
            <Text variant="overline" tone="brand">
              Ingresos
            </Text>
            {isLoading ? (
              <Skeleton className="h-12 w-56 mt-3" />
            ) : (
              <View className="flex-row items-baseline gap-3 mt-2">
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 38,
                    lineHeight: 44,
                    letterSpacing: -1.4,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCLP(data?.total ?? 0)}
                </Text>
                {data && data.count > 0 ? (
                  <View
                    className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: isPositive ? colors.success + '20' : colors.danger + '20' }}
                  >
                    {isPositive ? (
                      <ArrowUpRight size={12} color={colors.success} />
                    ) : (
                      <ArrowDownRight size={12} color={colors.danger} />
                    )}
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 11,
                        color: isPositive ? colors.success : colors.danger,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {isPositive ? '+' : ''}
                      {data.delta_pct}%
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            <Text variant="caption" tone="muted" className="mt-1">
              {data?.count ?? 0} {data?.count === 1 ? 'boleta' : 'boletas'} ·{' '}
              {data ? `${data.margin_pct}% margen` : '—'}
            </Text>

            {/* Trend */}
            {data && data.trend.length > 0 ? (
              <View className="mt-5">
                <View className="flex-row items-end gap-1.5" style={{ height: 64 }}>
                  {data.trend.map((b, i, arr) => {
                    const ratio = trendMax > 0 ? b.total / trendMax : 0;
                    const isLast = i === arr.length - 1;
                    return (
                      <View
                        key={i}
                        style={{ flex: 1, height: `${Math.max(ratio, 0.04) * 100}%` }}
                        className={`rounded-sm ${isLast ? 'bg-brand' : 'bg-brand-subtle'}`}
                      />
                    );
                  })}
                </View>
                <View className="flex-row justify-between mt-2">
                  {data.trend.map((b, i) => (
                    <Text
                      key={i}
                      variant="caption"
                      tone={i === data.trend.length - 1 ? 'default' : 'subtle'}
                      style={{ fontSize: 9, fontFamily: Fonts.medium }}
                    >
                      {b.label}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {/* Top productos */}
        {data && data.top_products.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(80).duration(360)} className="mt-5">
            <Text variant="overline" tone="subtle" className="mb-3">
              Top productos
            </Text>
            <Card variant="outlined" padding="md">
              {data.top_products.map((p, i) => (
                <Animated.View
                  key={p.product_id}
                  entering={FadeIn.delay(Math.min(i * 40, 240)).duration(280)}
                  style={
                    i < data.top_products.length - 1
                      ? { paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }
                      : undefined
                  }
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, marginRight: 12 }}>
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 14,
                        letterSpacing: -0.2,
                        color: colors.fg,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatCLP(p.total)}
                    </Text>
                  </View>
                  {/* Bar */}
                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.bgMuted,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${Math.min(p.pct * 2, 100)}%`,
                        backgroundColor: brand.brand,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-1.5">
                    <Text variant="caption" tone="subtle" style={{ fontVariant: ['tabular-nums'] }}>
                      {p.qty} {p.qty === 1 ? 'unidad' : 'unidades'}
                    </Text>
                    <Text variant="caption" tone="muted" style={{ fontFamily: Fonts.medium, fontVariant: ['tabular-nums'] }}>
                      {p.pct}%
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </Card>
          </Animated.View>
        ) : null}

        {/* By payment method */}
        {data && Object.keys(data.by_method).length > 0 ? (
          <Animated.View entering={FadeInDown.delay(160).duration(360)} className="mt-6">
            <Text variant="overline" tone="subtle" className="mb-3">
              Por método de pago
            </Text>
            <View className="gap-2">
              {Object.entries(data.by_method).map(([method, stats]) => {
                const colorKey = METHOD_COLOR_KEY[method] ?? 'brand';
                const dotColor = colors[colorKey];
                return (
                  <Card key={method} variant="outlined" padding="md">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-3">
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
                        <View>
                          <Text variant="bodyStrong">
                            {METHOD_LABEL[method] ?? method}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {stats.count} {stats.count === 1 ? 'boleta' : 'boletas'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: Fonts.medium,
                          fontSize: 16,
                          letterSpacing: -0.3,
                          color: colors.fg,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatCLP(stats.total)}
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* Boletas recientes */}
        {data && data.sales.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(220).duration(360)} className="mt-6">
            <Text variant="overline" tone="subtle" className="mb-3">
              Boletas recientes
            </Text>
            <Card variant="outlined" padding="none">
              {data.sales.slice(0, 20).map((s, i, arr) => (
                <View
                  key={s.id}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={
                    i < arr.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                      : undefined
                  }
                >
                  <View>
                    <Text variant="bodyStrong">
                      #{s.receipt_number ?? s.id}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {formatTime(s.created_at)} ·{' '}
                      {METHOD_LABEL[s.payment_method] ?? s.payment_method}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 15,
                      letterSpacing: -0.2,
                      color: colors.fg,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatCLP(s.total)}
                  </Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}

        <Pressable
          haptic="selection"
          onPress={() => refetch()}
          className="self-center mt-7 px-4 rounded-full"
          style={{ height: 32, justifyContent: 'center', backgroundColor: colors.bgMuted }}
        >
          <Text variant="caption" tone="muted">
            Actualizar
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
