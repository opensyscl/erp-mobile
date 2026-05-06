import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeBack } from '~/hooks/useSafeBack';
import { apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight, Search, User as UserIcon } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface ClientItem {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function RoutesClientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const safeBack = useSafeBack('/(app)/routes/admin');

  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 200);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['routes', 'clients', debouncedQ],
    queryFn: () =>
      apiRequest<{ data: ClientItem[] }>({
        method: 'GET',
        url: debouncedQ
          ? `/api/mobile/routes/clients?q=${encodeURIComponent(debouncedQ)}`
          : '/api/mobile/routes/clients',
      }).then((r) => r.data),
  });

  const clients = data ?? [];

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
          Clientes
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            Tu cartera
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
            {clients.length} clientes
          </Text>
        </Animated.View>

        {/* Search */}
        <View
          style={{
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            height: 46,
            borderRadius: 14,
            backgroundColor: colors.bgElevated,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Search size={16} color={colors.fgSubtle} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por nombre, RUT o teléfono…"
            placeholderTextColor={colors.fgSubtle}
            style={{
              flex: 1,
              color: colors.fg,
              fontFamily: Fonts.regular,
              fontSize: 14,
            }}
            autoCapitalize="none"
          />
        </View>

        <View className="mt-5 gap-2">
          {isLoading
            ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            : clients.map((c, i) => (
                <Animated.View key={c.id} entering={FadeIn.delay(Math.min(i * 25, 220)).duration(220)}>
                  <Pressable
                    haptic="selection"
                    scale="subtle"
                    onPress={() => {
                      // TODO: detalle cliente — por ahora va a nuevo pedido pre-cargado
                      router.push('/(app)/routes/orders/new' as never);
                    }}
                    style={{
                      backgroundColor: colors.bgElevated,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: brand.brandSubtle,
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
                        {initials(c.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {c.address ?? c.phone ?? 'Sin dirección'}
                      </Text>
                    </View>
                    <ArrowRight size={16} color={colors.fgSubtle} />
                  </Pressable>
                </Animated.View>
              ))}

          {!isLoading && clients.length === 0 ? (
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
                  Sin resultados
                </Text>
                <Text variant="caption" tone="muted" className="mt-1 text-center">
                  Cambia el filtro de búsqueda.
                </Text>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
