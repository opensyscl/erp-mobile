import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight, User as UserIcon } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface DriverStat {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_on_route: boolean;
  today_orders: number;
  today_delivered: number;
  today_collected: number;
  week_collected: number;
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function RoutesDriversScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const safeBack = useSafeBack('/(app)/routes/admin');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.routes.drivers,
    queryFn: () =>
      apiRequest<{ data: DriverStat[] }>({
        method: 'GET',
        url: '/api/mobile/routes/drivers',
      }).then((r) => r.data),
  });

  const drivers = data ?? [];

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
          Ruteros
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
            Equipo de reparto
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
            {drivers.length} ruteros
          </Text>
          <Text variant="caption" tone="subtle" className="mt-1">
            {drivers.filter((d) => d.is_on_route).length} en ruta · resto disponible
          </Text>
        </Animated.View>

        <View className="mt-5 gap-2.5">
          {isLoading
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            : drivers.map((d, i) => (
                <Animated.View key={d.id}>
                  <Pressable
                    haptic="selection"
                    scale="subtle"
                    onPress={() => router.push(`/(app)/routes?driver_id=${d.id}` as never)}
                    style={{
                      backgroundColor: colors.bgElevated,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 16,
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: brand.brandSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: Fonts.semibold,
                            fontSize: 14,
                            color: brand.brand,
                            includeFontPadding: false,
                          } as never}
                        >
                          {initials(d.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View className="flex-row items-center gap-2">
                          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {d.name}
                          </Text>
                          {d.is_on_route ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 999,
                                backgroundColor: colors.success + '18',
                              }}
                            >
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: colors.success,
                                }}
                              />
                              <Text
                                variant="caption"
                                tone="success"
                                style={{ fontFamily: Fonts.medium }}
                              >
                                En ruta
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text variant="caption" tone="muted" numberOfLines={1}>
                          {d.phone ?? d.email}
                        </Text>
                      </View>
                      <ArrowRight size={16} color={colors.fgSubtle} />
                    </View>

                    <View
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        flexDirection: 'row',
                      }}
                    >
                      <Stat
                        label="Hoy"
                        value={`${d.today_delivered}/${d.today_orders}`}
                        sub="entregas"
                      />
                      <Divider color={colors.border} />
                      <Stat label="Cobrado hoy" value={formatCLP(d.today_collected)} />
                      <Divider color={colors.border} />
                      <Stat label="7d" value={formatCLP(d.week_collected)} sub="acumulado" />
                    </View>
                  </Pressable>
                </Animated.View>
              ))}

          {!isLoading && drivers.length === 0 ? (
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
                  <UserIcon size={26} color={colors.fgSubtle} />
                </View>
                <Text variant="bodyStrong" className="mt-3">
                  Sin ruteros aún
                </Text>
                <Text variant="caption" tone="muted" className="mt-1 text-center">
                  Asigna el rol Repartidor a un usuario desde el panel web.
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" tone="subtle" style={{ fontSize: 10, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.fg,
          fontVariant: ['tabular-nums'],
          marginTop: 2,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" tone="subtle" style={{ fontSize: 10 }} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ width: 1, marginHorizontal: 12, backgroundColor: color }} />;
}
