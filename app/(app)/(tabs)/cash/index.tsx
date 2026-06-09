import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, Wallet } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
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

interface CashTodayData {
  total: number;
  count: number;
  by_method: Record<string, { count: number; total: number; paid: number }>;
  sales: SaleSummary[];
  as_of: string;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
};

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function CashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.cash.today,
    queryFn: () =>
      apiRequest<{ data: CashTodayData }>({
        method: 'GET',
        url: '/api/mobile/sales/today',
      }).then((r) => r.data),
  });

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
            Cuadre del día
          </Text>
          <View className="h-10 w-10" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={undefined}
        onScrollEndDrag={() => undefined}
      >
        {/* Total card */}
        <Animated.View entering={FadeInDown.duration(360)}>
          <Card variant="elevated" padding="lg">
            <Text variant="overline" tone="brand">
              Total recaudado hoy
            </Text>
            {isLoading ? (
              <Skeleton className="h-9 w-44 mt-3" />
            ) : (
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 38,
                  lineHeight: 44,
                  letterSpacing: -1.4,
                  color: colors.fg,
                  marginTop: 6,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCLP(data?.total ?? 0)}
              </Text>
            )}
            <Text variant="caption" tone="muted" className="mt-1">
              {data?.count ?? 0} {data?.count === 1 ? 'boleta' : 'boletas'}
            </Text>
          </Card>
        </Animated.View>

        {/* Por método de pago */}
        <Animated.View entering={FadeInDown.delay(80).duration(360)} className="mt-5">
          <Text variant="overline" tone="subtle" className="mb-3">
            Por método de pago
          </Text>
          {isLoading ? (
            <View className="gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </View>
          ) : (
            <View className="gap-2">
              {Object.entries(data?.by_method ?? {}).map(([method, stats]) => (
                <Card key={method} variant="outlined" padding="md">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: colors.brandSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Wallet size={18} color={colors.brand} />
                      </View>
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
              ))}
              {data && Object.keys(data.by_method).length === 0 ? (
                <Text variant="body" tone="muted" className="px-2">
                  Aún no hay ventas registradas hoy.
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>

        {/* Lista de ventas */}
        {data && data.sales.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(160).duration(360)} className="mt-7">
            <Text variant="overline" tone="subtle" className="mb-3">
              Boletas de hoy
            </Text>
            <Card variant="outlined" padding="none">
              {data.sales.map((s, i) => (
                <Animated.View
                  key={s.id}
                  entering={FadeIn.delay(Math.min(i * 24, 240)).duration(220)}
                >
                  <View
                    className="flex-row items-center justify-between px-4 py-3"
                    style={
                      i < data.sales.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                        : undefined
                    }
                  >
                    <View>
                      <Text variant="bodyStrong">
                        {s.receipt_number ? `#${s.receipt_number}` : `#${s.id}`}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {formatTime(s.created_at)} · {METHOD_LABEL[s.payment_method] ?? s.payment_method}
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
                </Animated.View>
              ))}
            </Card>
          </Animated.View>
        ) : null}

        {/* Pull to refresh hint */}
        <Pressable
          haptic="selection"
          onPress={() => refetch()}
          className="self-center mt-8 px-4 rounded-full"
          style={{ height: 32, justifyContent: 'center', backgroundColor: colors.bgMuted }}
        >
          <Text variant="caption" tone="muted">
            {isRefetching ? 'Actualizando…' : 'Actualizar'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
