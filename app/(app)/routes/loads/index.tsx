import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight, Truck } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface FleetLoad {
  id: number;
  status: 'open' | 'closed';
  driver: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  progress: { total: number; delivered: number; pending: number; pct: number };
  amounts: { total: number; collected: number; pending: number };
  created_at: string | null;
  closed_at: string | null;
}

const FILTERS = [
  { id: 'open', label: 'Activas' },
  { id: 'closed', label: 'Cerradas' },
  { id: 'all', label: 'Todas' },
] as const;

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export default function RoutesLoadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const tenant = useTenantStore((s) => s.tenant);
  const safeBack = useSafeBack('/(app)/routes/admin');

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('open');

  const queryKey = ['routes', 'fleet'];
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: FleetLoad[] }>({
        method: 'GET',
        url: '/api/mobile/routes/fleet',
      }).then((r) => r.data),
  });

  const ch = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(ch, RealtimeEvents.RouteLoadCreated, [queryKey]);
  useRealtimeInvalidate(ch, RealtimeEvents.RouteLoadClosed, [queryKey]);
  useRealtimeInvalidate(ch, RealtimeEvents.RouteLoadConfirmed, [queryKey]);
  useRealtimeInvalidate(ch, RealtimeEvents.RouteOrderStatusChanged, [queryKey]);

  const loads = (data ?? []).filter((l) => filter === 'all' || l.status === filter);

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
          Cargas
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
            Flota del día
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
            Cargas
          </Text>
        </Animated.View>

        {/* Filtros */}
        <View className="flex-row gap-2 mt-4">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                haptic="selection"
                onPress={() => setFilter(f.id)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: active ? colors.fg : colors.bgElevated,
                  borderWidth: 1,
                  borderColor: active ? colors.fg : colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    color: active ? colors.bgElevated : colors.fg,
                    includeFontPadding: false,
                  } as never}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Lista */}
        <View className="mt-5 gap-2.5">
          {isLoading
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
            : loads.map((l, i) => (
                <Animated.View key={l.id}>
                  <Pressable
                    haptic="selection"
                    scale="subtle"
                    onPress={() =>
                      l.driver
                        ? router.push(`/(app)/routes?driver_id=${l.driver.id}` as never)
                        : router.push('/(app)/routes' as never)
                    }
                    style={{
                      backgroundColor: colors.bgElevated,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 16,
                    }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: l.status === 'open' ? brand.brandSubtle : colors.bgMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Truck
                          size={20}
                          color={l.status === 'open' ? brand.brand : colors.fgSubtle}
                          strokeWidth={1.6}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View className="flex-row items-center gap-2">
                          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {l.driver?.name ?? 'Sin driver'}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor:
                                (l.status === 'open' ? colors.success : colors.fgSubtle) + '18',
                            }}
                          >
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor:
                                  l.status === 'open' ? colors.success : colors.fgSubtle,
                              }}
                            />
                            <Text
                              variant="caption"
                              tone={l.status === 'open' ? 'success' : 'subtle'}
                              style={{ fontFamily: Fonts.medium }}
                            >
                              {l.status === 'open' ? 'En ruta' : 'Cerrada'}
                            </Text>
                          </View>
                        </View>
                        <Text variant="caption" tone="muted" className="mt-0.5">
                          {l.branch?.name ?? ''}
                          {l.branch ? ' · ' : ''}
                          {formatDay(l.created_at)}
                        </Text>
                      </View>
                      <ArrowRight size={16} color={colors.fgSubtle} />
                    </View>

                    {/* Progress bar */}
                    <View className="mt-3">
                      <View
                        style={{
                          height: 6,
                          borderRadius: 999,
                          backgroundColor: colors.bgMuted,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${l.progress.pct}%`,
                            height: '100%',
                            backgroundColor: l.status === 'open' ? brand.brand : colors.success,
                          }}
                        />
                      </View>
                      <View className="flex-row justify-between mt-1">
                        <Text variant="caption" tone="subtle">
                          {l.progress.delivered}/{l.progress.total} entregas · {l.progress.pct}%
                        </Text>
                        <Text
                          variant="caption"
                          tone="subtle"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {formatCLP(l.amounts.collected)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}

          {!isLoading && loads.length === 0 ? (
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
                  <Truck size={26} color={colors.fgSubtle} />
                </View>
                <Text variant="bodyStrong" className="mt-3">
                  Sin cargas {filter === 'open' ? 'activas' : ''}
                </Text>
                <Text variant="caption" tone="muted" className="mt-1 text-center">
                  Crea un nuevo pedido para abrir una ruta automáticamente.
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
