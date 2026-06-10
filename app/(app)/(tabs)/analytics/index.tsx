import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sparkline } from '~/components/charts/Sparkline';
import { YearBarsChart } from '~/components/charts/YearBarsChart';
import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { queryKeys } from '~/lib/queryKeys';
import { apiRequest } from '~/lib/api';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Filter } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

interface MonthData {
  label: string;
  index: number;
  year: number;
  is_current: boolean;
  income: number;
  expense: number;
  net_profit: number;
}

interface MetricSummary {
  total: number;
  current_month: number;
  delta_pct: number;
  spark: number[];
}

interface AnalyticsData {
  months: MonthData[];
  summary: {
    income: MetricSummary;
    expense: MetricSummary;
    net_profit: MetricSummary;
  };
  as_of: string;
}

type MetricKey = 'income' | 'expense' | 'net_profit';

const METRICS: { id: MetricKey; label: string; colorKey: 'brand' | 'danger' | 'success' }[] = [
  { id: 'income', label: 'Ingresos', colorKey: 'brand' },
  { id: 'expense', label: 'Gastos', colorKey: 'danger' },
  { id: 'net_profit', label: 'Utilidad', colorKey: 'success' },
];

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  if (n === 0) return '$0';
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const screenW = Dimensions.get('window').width;

  const [activeMetric, setActiveMetric] = useState<MetricKey>('income');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.analytics.year,
    queryFn: () =>
      apiRequest<{ data: AnalyticsData }>({
        method: 'GET',
        url: '/api/mobile/analytics/year',
      }).then((r) => r.data),
  });

  const summary = data?.summary[activeMetric];
  const months: { label: string; value: number; isCurrent?: boolean }[] =
    data?.months.map((m) => ({
      label: m.label,
      value: (m as unknown as Record<MetricKey, number>)[activeMetric] ?? 0,
      isCurrent: m.is_current,
    })) ?? [];

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
            Analytics
          </Text>
          <Pressable
            haptic="selection"
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-subtle border border-border"
          >
            <Filter size={16} color={colors.fg} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Title */}
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text variant="caption" tone="muted">
            Resumen anual
          </Text>
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 26,
                lineHeight: 36,
              letterSpacing: -0.6,
              color: colors.fg,
              marginTop: 4,
            }}
          >
            Atajos · Analytics
          </Text>
        </Animated.View>

        {/* Metric chips — scroll horizontal */}
        <Animated.View entering={FadeInDown.delay(60).duration(360)} className="mt-4 -mx-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {METRICS.map((m) => {
              const active = activeMetric === m.id;
              const dotColor =
                m.colorKey === 'brand'
                  ? brand.brand
                  : ((colors as Record<string, string>)[m.colorKey] ?? brand.brand);
              return (
                <Pressable
                  key={m.id}
                  haptic="selection"
                  onPress={() => setActiveMetric(m.id)}
                  className="flex-row items-center gap-2 px-3.5 rounded-full"
                  style={{
                    height: 36,
                    backgroundColor: active ? colors.fg : colors.bgElevated,
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      backgroundColor: dotColor,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      letterSpacing: -0.1,
                      color: active ? colors.bgElevated : colors.fg,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* 3 mini KPI cards horizontal scroll */}
        <Animated.View entering={FadeInDown.delay(120).duration(360)} className="mt-5 -mx-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {METRICS.map((m) => {
              const s = data?.summary[m.id];
              const active = activeMetric === m.id;
              const sparkColor =
                m.colorKey === 'brand'
                  ? brand.brand
                  : ((colors as Record<string, string>)[m.colorKey] ?? brand.brand);
              const isPositive = (s?.delta_pct ?? 0) >= 0;
              return (
                <Pressable
                  key={m.id}
                  haptic="selection"
                  onPress={() => setActiveMetric(m.id)}
                  scale="subtle"
                  style={{
                    width: 132,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.bgElevated,
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? sparkColor : colors.border,
                  }}
                >
                  {isLoading || !s ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 17,
                          letterSpacing: -0.4,
                          color: colors.fg,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatCompact(s.current_month)}
                      </Text>
                      {s.delta_pct !== 0 ? (
                        <View
                          style={{
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            borderRadius: 4,
                            backgroundColor: isPositive ? withAlpha(colors.success, 0.13) : withAlpha(colors.danger, 0.13),
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {isPositive ? (
                            <ArrowUpRight size={9} color={colors.success} strokeWidth={2.4} />
                          ) : (
                            <ArrowDownRight size={9} color={colors.danger} strokeWidth={2.4} />
                          )}
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Sparkline */}
                  <View className="mt-2 h-8">
                    {s ? (
                      <Sparkline data={s.spark} color={sparkColor} width={104} height={28} />
                    ) : null}
                  </View>

                  <Text variant="caption" tone="muted" className="mt-1">
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Big chart */}
        <Animated.View entering={FadeInDown.delay(200).duration(360)} className="mt-6">
          <Card variant="outlined" padding="md">
            <View className="flex-row items-baseline justify-between mb-1">
              <View>
                <Text variant="overline" tone="subtle">
                  {METRICS.find((m) => m.id === activeMetric)?.label}
                </Text>
                {isLoading ? (
                  <Skeleton className="h-8 w-40 mt-1" />
                ) : (
                  <Text
                    style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 22,
                lineHeight: 30,
                      letterSpacing: -0.5,
                      color: colors.fg,
                      fontVariant: ['tabular-nums'],
                      marginTop: 2,
                    }}
                  >
                    {summary ? formatCompact(summary.total) : '—'}
                  </Text>
                )}
                <Text variant="caption" tone="subtle" className="mt-0.5">
                  Últimos 12 meses
                </Text>
              </View>
              {summary && summary.delta_pct !== 0 ? (
                <View
                  className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor:
                      summary.delta_pct >= 0 ? withAlpha(colors.success, 0.13) : withAlpha(colors.danger, 0.13),
                  }}
                >
                  {summary.delta_pct >= 0 ? (
                    <ArrowUpRight size={11} color={colors.success} strokeWidth={2.4} />
                  ) : (
                    <ArrowDownRight size={11} color={colors.danger} strokeWidth={2.4} />
                  )}
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 11,
                      color: summary.delta_pct >= 0 ? colors.success : colors.danger,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {summary.delta_pct >= 0 ? '+' : ''}
                    {summary.delta_pct}%
                  </Text>
                </View>
              ) : null}
            </View>

            {isLoading ? (
              <Skeleton className="h-52 w-full mt-3" />
            ) : (
              <View className="mt-2">
                <YearBarsChart
                  months={months}
                  width={screenW - 60}
                  height={220}
                  brand={brand.brand}
                  brandSubtle={brand.brandSubtle}
                  fg={colors.fg}
                  fgSubtle={colors.fgSubtle}
                  border={colors.border}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Lista mensual */}
        <Animated.View entering={FadeInDown.delay(280).duration(360)} className="mt-6">
          <Text variant="overline" tone="subtle" className="mb-3">
            Detalle mensual
          </Text>
          <Card variant="outlined" padding="none">
            {data?.months.slice().reverse().slice(0, 6).map((m, i, arr) => (
              <View
                key={`${m.year}-${m.index}`}
                className="flex-row items-center justify-between px-4 py-3"
                style={
                  i < arr.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : undefined
                }
              >
                <View>
                  <Text variant="bodyStrong">
                    {m.label} {m.year}
                    {m.is_current ? ' · actual' : ''}
                  </Text>
                  <Text variant="caption" tone="muted">
                    Ingresos {formatCompact(m.income)} · Gastos {formatCompact(m.expense)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    letterSpacing: -0.3,
                    color: m.net_profit >= 0 ? colors.fg : colors.danger,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCompact(m.net_profit)}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
