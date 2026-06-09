import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { queryKeys } from '~/lib/queryKeys';
import { ArrowLeft, Package, Truck } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface ProductionLoad {
  id: number;
  status: 'open' | 'closed';
  is_confirmed: boolean;
  driver: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  orders_count: number;
  items_count: number;
  units_count: number;
  top_products: { name: string; qty: number }[];
  created_at: string | null;
  confirmed_at: string | null;
}

export default function RoutesProductionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const safeBack = useSafeBack('/(app)/routes/admin');

  const queryKey = queryKeys.routes.production;
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: ProductionLoad[] }>({
        method: 'GET',
        url: '/api/mobile/routes/production',
      }).then((r) => r.data),
  });

  const loads = data ?? [];
  const pendingPrep = loads.filter((l) => !l.is_confirmed);
  const confirmed = loads.filter((l) => l.is_confirmed);

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
          Producción
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
            Preparación de rutas
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
            Producción
          </Text>
          <Text variant="caption" tone="subtle" className="mt-1">
            {pendingPrep.length} cargas por preparar · {confirmed.length} confirmadas
          </Text>
        </Animated.View>

        {/* Pendientes */}
        {pendingPrep.length > 0 ? (
          <View className="mt-5">
            <Text variant="overline" tone="subtle" className="mb-2">
              Por preparar
            </Text>
            <View className="gap-2.5">
              {pendingPrep.map((l) => (
                <ProductionCard key={l.id} load={l} pending />
              ))}
            </View>
          </View>
        ) : null}

        {/* Confirmadas */}
        {confirmed.length > 0 ? (
          <View className="mt-5">
            <Text variant="overline" tone="subtle" className="mb-2">
              Confirmadas y en ruta
            </Text>
            <View className="gap-2.5">
              {confirmed.map((l) => (
                <ProductionCard
                  key={l.id}
                  load={l}
                  pending={false}
                  onPress={() =>
                    l.driver
                      ? router.push(`/(app)/routes?driver_id=${l.driver.id}` as never)
                      : router.push('/(app)/routes' as never)
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View className="gap-2.5 mt-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </View>
        ) : null}

        {!isLoading && loads.length === 0 ? (
          <Card variant="outlined" padding="lg" style={{ marginTop: 24 }}>
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
                Nada que preparar
              </Text>
              <Text variant="caption" tone="muted" className="mt-1 text-center">
                Crea pedidos para abrir cargas y ver aquí lo que se prepara.
              </Text>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ProductionCard({
  load,
  pending,
  onPress,
}: {
  load: ProductionLoad;
  pending: boolean;
  onPress?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const inner = (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: pending ? brand.brand : colors.border,
        padding: 16,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: pending ? brand.brandSubtle : colors.bgMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Truck size={20} color={pending ? brand.brand : colors.fgSubtle} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center gap-2">
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {load.driver?.name ?? 'Sin driver'}
            </Text>
            {pending ? (
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: brand.brand + '18',
                }}
              >
                <Text
                  variant="caption"
                  tone="brand"
                  style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                >
                  PREPARAR
                </Text>
              </View>
            ) : (
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: colors.success + '18',
                }}
              >
                <Text
                  variant="caption"
                  tone="success"
                  style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                >
                  EN RUTA
                </Text>
              </View>
            )}
          </View>
          <Text variant="caption" tone="muted" className="mt-0.5">
            {load.branch?.name ?? ''}
          </Text>
        </View>
      </View>

      {/* Métricas en chips */}
      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Metric label="Pedidos" value={`${load.orders_count}`} />
        <Metric label="Items" value={`${load.items_count}`} />
        <Metric label="Unidades" value={`${Math.round(load.units_count)}`} />
      </View>

      {/* Top products a alistar */}
      {load.top_products.length > 0 ? (
        <View className="mt-3">
          <Text variant="caption" tone="subtle" style={{ fontSize: 10, letterSpacing: 0.4 }}>
            TOP A PREPARAR
          </Text>
          <View className="mt-1 gap-1">
            {load.top_products.map((p, j) => (
              <View key={j} className="flex-row items-center justify-between">
                <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {p.name}
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    color: colors.fgMuted,
                    fontVariant: ['tabular-nums'],
                    includeFontPadding: false,
                  } as never}
                >
                  ×{Math.round(p.qty)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View>
      {onPress ? (
        <Pressable haptic="selection" scale="subtle" onPress={onPress}>
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </Animated.View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgSubtle,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <Text variant="caption" tone="subtle" style={{ fontSize: 10, letterSpacing: 0.4 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 16,
          lineHeight: 22,
          color: colors.fg,
          fontVariant: ['tabular-nums'],
          marginTop: 2,
          includeFontPadding: false,
        } as never}
      >
        {value}
      </Text>
    </View>
  );
}
