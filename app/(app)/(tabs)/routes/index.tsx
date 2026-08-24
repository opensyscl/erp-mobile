import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { HeaderPattern } from '~/components/HeaderPattern';
import { NotificationsSheet } from '~/components/NotificationsSheet';
import { toast } from '~/components/Toast';
import { Button, Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import * as ImagePicker from 'expo-image-picker';

import { ApiError, apiRequest, apiUpload } from '~/lib/api';
import { ArrowRight, Bell, ChevronRight, Navigation, Package, PackageReceive, Phone, Plus, Refresh, Truck, User as UserIcon, Wallet } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { useAuthStore } from '~/stores/auth';
import { useUnseenCount } from '~/stores/notifications';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette, withAlpha } from '~/theme/tokens';
import type {
  RouteLoad,
  RouteOrder,
  RoutePaymentStatus,
} from '~/types/routes';

interface MyOrderCard {
  id: number;
  order_number: string;
  status: 'pending' | 'in_route' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  client_name: string | null;
  client_address: string | null;
  total: number;
  amount_paid: number;
  is_today: boolean;
  created_at: string | null;
}

interface MyLoadCard {
  id: number;
  status: 'open' | 'closed';
  is_today: boolean;
  date: string | null;
  created_at: string | null;
  closed_at: string | null;
  progress: { total: number; delivered: number; cancelled: number; pct: number };
  amounts: { total: number; collected: number; pending: number };
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

const STATUS_LABEL: Record<RouteOrder['status'], string> = {
  pending: 'Pendiente',
  in_route: 'En ruta',
  delivered: 'Entregada',
  cancelled: 'No entregada',
};

const PAYMENT_LABEL: Record<RoutePaymentStatus, string> = {
  unpaid: 'Sin cobrar',
  partial: 'Pago parcial',
  paid: 'Pagado',
};

export default function RoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const params = useLocalSearchParams<{ driver_id?: string }>();
  const driverIdParam = params.driver_id ?? null;

  const [activeOrder, setActiveOrder] = useState<RouteOrder | null>(null);
  const [orderTab, setOrderTab] = useState<'pending' | 'delivered'>('pending');
  // Tab para la sección "Mis pedidos recientes" (scroll horizontal)
  const [myOrdersTab, setMyOrdersTab] = useState<'pending' | 'delivered' | 'cancelled'>('pending');

  const todayKey = queryKeys.routes.today(driverIdParam ?? 'self');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: todayKey,
    queryFn: () =>
      apiRequest<{ data: RouteLoad | null; message?: string }>({
        method: 'GET',
        url: driverIdParam
          ? `/api/mobile/routes/today?driver_id=${encodeURIComponent(driverIdParam)}`
          : '/api/mobile/routes/today',
      }),
  });

  // Mis pedidos recientes — últimos 10 del driver
  const myOrdersKey = queryKeys.routes.myOrders(driverIdParam ?? 'self');
  const { data: myOrdersData } = useQuery({
    queryKey: myOrdersKey,
    queryFn: () =>
      apiRequest<{ data: MyOrderCard[] }>({
        method: 'GET',
        url: driverIdParam
          ? `/api/mobile/routes/my-orders?driver_id=${encodeURIComponent(driverIdParam)}`
          : '/api/mobile/routes/my-orders',
      }).then((r) => r.data),
  });
  const myOrders = myOrdersData ?? [];

  // Mis cargas — últimas 7 (cada una agrupa varios pedidos)
  const myLoadsKey = queryKeys.routes.myLoads(driverIdParam ?? 'self');
  const { data: myLoadsData } = useQuery({
    queryKey: myLoadsKey,
    queryFn: () =>
      apiRequest<{ data: MyLoadCard[] }>({
        method: 'GET',
        url: driverIdParam
          ? `/api/mobile/routes/my-loads?driver_id=${encodeURIComponent(driverIdParam)}`
          : '/api/mobile/routes/my-loads',
      }).then((r) => r.data),
  });
  const myLoads = myLoadsData ?? [];

  // El feed in-app de eventos vive en (app)/_layout.tsx para que persista entre
  // pantallas. Acá solo leemos el contador.
  const unseenCount = useUnseenCount();

  // Sheet de notificaciones + handler de reload manual
  const notifSheet = useRef<BottomSheetModalType>(null);
  const handleReload = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    toast.success('Actualizado', 'Datos refrescados.');
  };

  const load = data?.data ?? null;
  const orders = load?.orders ?? [];

  // Sort: pendientes primero, luego entregadas, luego canceladas
  const sortedOrders = [...orders].sort((a, b) => {
    const order: Record<RouteOrder['status'], number> = {
      pending: 0,
      in_route: 1,
      delivered: 2,
      cancelled: 3,
    };
    return order[a.status] - order[b.status];
  });

  const pendingOrders = sortedOrders.filter(
    (o) => o.status === 'pending' || o.status === 'in_route',
  );
  const deliveredOrders = sortedOrders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled',
  );
  const visibleOrders = orderTab === 'pending' ? pendingOrders : deliveredOrders;

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!load) return;
      return apiRequest({
        method: 'POST',
        url: `/api/mobile/routes/${load.id}/close`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
      toast.success('Ruta cerrada', 'Tu manager fue notificado.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cerrar';
      toast.error('Error', msg);
    },
  });

  const allResolved =
    orders.length > 0 && orders.every((o) => o.status !== 'pending');

  // ——— Estado de la jornada (hero brand + card de próxima parada) ———
  const state: 'empty' | 'ready' | 'in_progress' | 'done' = !load
    ? 'empty'
    : load.progress.delivered === 0
      ? 'ready'
      : load.progress.delivered >= load.progress.total
        ? 'done'
        : 'in_progress';

  // Próxima parada pendiente — primero por status pending, fallback in_route.
  const nextOrder =
    load?.orders.find((o) => o.status === 'pending') ??
    load?.orders.find((o) => o.status === 'in_route') ??
    null;

  const heroChip = (() => {
    switch (state) {
      case 'empty':
        return { dot: withAlpha(brand.brandFg, 0.55), label: 'Sin ruta hoy' };
      case 'ready':
        return { dot: brand.brandFg, label: 'Lista para salir' };
      case 'in_progress':
        return { dot: brand.brandFg, label: 'En ruta' };
      case 'done':
        return { dot: brand.brandFg, label: 'Ruta completada' };
    }
  })();

  const onOpenLoad = () => {
    if (load) router.push(`/(app)/routes/load/${load.id}` as never);
  };
  const callClient = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`);
  };
  const navigateTo = (address: string) => {
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={brand.brand}
            colors={[brand.brand]}
          />
        }
        style={{ marginTop: 0 }}
      >
        {/* Hero brand — jornada del driver: plata cobrada + progreso (patrón earnings
            de apps de delivery: el número del día manda, el resto acompaña) */}
        <View
          style={{
            backgroundColor: brand.brand,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 96,
            overflow: 'hidden',
          }}
        >
          <HeaderPattern color={brand.brandFg} intensity={1.0} />
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.20)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Animated.View entering={FadeInDown.duration(220)}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: withAlpha(brand.brandFg, 0.22),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: brand.brandFg,
                      fontFamily: Fonts.semibold,
                      fontSize: 12,
                      includeFontPadding: false,
                    } as never}
                  >
                    {(me?.name ?? 'U')[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 14,
                    letterSpacing: -0.3,
                  }}
                >
                  {tenant?.name ?? 'OpenSys'}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  haptic="selection"
                  accessibilityLabel="Refrescar datos"
                  onPress={handleReload}
                  className="h-9 w-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: withAlpha(brand.brandFg, 0.18) }}
                >
                  <Refresh size={16} color={brand.brandFg} strokeWidth={1.8} />
                </Pressable>
                <Pressable
                  haptic="selection"
                  accessibilityLabel="Notificaciones"
                  onPress={() => notifSheet.current?.present()}
                  className="h-9 w-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: withAlpha(brand.brandFg, 0.18) }}
                >
                  <Bell size={16} color={brand.brandFg} strokeWidth={1.8} />
                  {unseenCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        minWidth: 16,
                        height: 16,
                        paddingHorizontal: 4,
                        borderRadius: 999,
                        backgroundColor: colors.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: brand.brand,
                      }}
                    >
                      <Text
                        style={{
                          color: palette.light.fgInverse,
                          fontFamily: Fonts.semibold,
                          fontSize: 9,
                          fontVariant: ['tabular-nums'],
                          includeFontPadding: false,
                        } as never}
                      >
                        {unseenCount > 9 ? '9+' : unseenCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            <Text
              style={{
                color: brand.brandFg,
                opacity: 0.72,
                fontFamily: Fonts.regular,
                fontSize: 14,
                letterSpacing: -0.2,
                marginTop: 24,
              }}
            >
              {greeting()}, {(me?.name ?? 'Equipo').split(' ')[0]} · cobrado hoy
            </Text>
            <View className="flex-row items-center justify-between" style={{ marginTop: 2 }}>
              <View className="flex-1 pr-3">
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 34,
                    lineHeight: 42,
                    letterSpacing: -1,
                    fontVariant: ['tabular-nums'],
                    includeFontPadding: false,
                  } as never}
                >
                  {formatCLP(load?.amounts.collected ?? 0)}
                </Text>
                {load ? (
                  <Text
                    style={{
                      color: brand.brandFg,
                      opacity: 0.65,
                      fontFamily: Fonts.regular,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    de {formatCLP(load.amounts.total)} en ruta{'\n'}
                    {formatCLP(load.amounts.pending)} por cobrar
                  </Text>
                ) : null}
              </View>
              {load ? (
                <DonutProgress
                  pct={load.progress.pct}
                  delivered={load.progress.delivered}
                  total={load.progress.total}
                  fg={brand.brandFg}
                />
              ) : null}
            </View>

            <View className="flex-row items-center justify-between" style={{ marginTop: 18 }}>
              <View
                className="flex-row items-center gap-2"
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: withAlpha(brand.brandFg, 0.16),
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: heroChip.dot }} />
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: -0.1,
                    includeFontPadding: false,
                  } as never}
                >
                  {heroChip.label}
                </Text>
              </View>
              {load ? (
                <Text
                  style={{
                    color: brand.brandFg,
                    opacity: 0.8,
                    fontFamily: Fonts.medium,
                    fontSize: 13,
                    fontVariant: ['tabular-nums'],
                  } as never}
                >
                  {load.progress.delivered} de {load.progress.total} entregas
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>

        {/* Card protagonista — próxima parada, estilo job-card de apps de delivery.
            4 estados: empty / ready / in_progress / done (calculados antes del render). */}
        <Animated.View
          entering={FadeInUp.delay(140).duration(220)}
          className="mx-5"
          style={{ marginTop: -72 }}
        >
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            {state === 'empty' ? (
              <>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 18,
                    letterSpacing: -0.4,
                    color: colors.fg,
                  }}
                >
                  Sin ruta asignada
                </Text>
                <Text variant="caption" tone="muted" className="mt-1">
                  {data?.message ?? 'Tu manager aún no asignó la ruta del día.'}
                </Text>
                <Pressable
                  haptic="medium"
                  onPress={() => refetch()}
                  style={{
                    marginTop: 16,
                    height: 48,
                    borderRadius: 999,
                    backgroundColor: colors.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Text style={{ color: colors.fg, fontFamily: Fonts.semibold, fontSize: 14 }}>
                    Refrescar
                  </Text>
                  <Refresh size={14} color={colors.fg} />
                </Pressable>
              </>
            ) : state === 'done' || !nextOrder ? (
              <>
                <Text
                  style={{
                    color: colors.fgSubtle,
                    fontFamily: Fonts.medium,
                    fontSize: 10,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    includeFontPadding: false,
                  } as never}
                >
                  {state === 'done' ? 'Ruta completada' : 'Paradas resueltas'}
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 19,
                    letterSpacing: -0.4,
                    color: colors.fg,
                    marginTop: 6,
                  }}
                >
                  Cobraste {formatCLP(load!.amounts.collected)}
                </Text>
                <Text variant="caption" tone="muted" className="mt-1">
                  de {formatCLP(load!.amounts.total)} · {load!.progress.delivered} de{' '}
                  {load!.progress.total} entregas
                </Text>
                <Pressable
                  haptic="medium"
                  onPress={onOpenLoad}
                  style={{
                    marginTop: 16,
                    height: 48,
                    borderRadius: 999,
                    backgroundColor: brand.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                    ...brandShadow(brand.brand, 'sm'),
                  }}
                >
                  <Text
                    style={{
                      color: palette.light.fgInverse,
                      fontFamily: Fonts.semibold,
                      fontSize: 14.5,
                      letterSpacing: -0.2,
                    }}
                  >
                    Ver resumen
                  </Text>
                  <ChevronRight size={15} color={palette.light.fgInverse} />
                </Pressable>
              </>
            ) : (
              <>
                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      color: colors.fgSubtle,
                      fontFamily: Fonts.medium,
                      fontSize: 10,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      includeFontPadding: false,
                    } as never}
                  >
                    Próxima parada
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: colors.bgMuted,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.fgMuted,
                        fontFamily: Fonts.medium,
                        fontSize: 11,
                        fontVariant: ['tabular-nums'],
                        includeFontPadding: false,
                      } as never}
                    >
                      {load!.progress.delivered + 1} de {load!.progress.total}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start justify-between mt-2.5">
                  <View className="flex-1 pr-3">
                    <Text
                      style={{
                        color: colors.fg,
                        fontFamily: Fonts.semibold,
                        fontSize: 19,
                        letterSpacing: -0.4,
                      }}
                      numberOfLines={1}
                    >
                      {nextOrder.client?.name ?? 'Cliente sin nombre'}
                    </Text>
                    {nextOrder.client?.address ? (
                      <Text
                        style={{
                          color: colors.fgMuted,
                          fontFamily: Fonts.regular,
                          fontSize: 13,
                          marginTop: 3,
                          lineHeight: 18,
                        }}
                        numberOfLines={2}
                      >
                        {nextOrder.client.address}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: colors.fg,
                        fontFamily: Fonts.semibold,
                        fontSize: 16,
                        fontVariant: ['tabular-nums'],
                      } as never}
                    >
                      {formatCLP(nextOrder.total)}
                    </Text>
                    <Text
                      style={{
                        color: colors.fgSubtle,
                        fontFamily: Fonts.regular,
                        fontSize: 11,
                        marginTop: 1,
                      }}
                    >
                      {nextOrder.payment_status === 'paid' ? 'pagado' : 'a cobrar'}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2.5 mt-4">
                  {nextOrder.client?.phone ? (
                    <Pressable
                      haptic="selection"
                      accessibilityLabel="Llamar al cliente"
                      onPress={() => callClient(nextOrder.client!.phone!)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.bgMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Phone size={19} color={colors.fg} />
                    </Pressable>
                  ) : null}
                  {nextOrder.client?.address ? (
                    <Pressable
                      haptic="selection"
                      accessibilityLabel="Navegar a la dirección"
                      onPress={() => navigateTo(nextOrder.client!.address!)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.bgMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Navigation size={19} color={colors.fg} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    haptic="medium"
                    onPress={() => (state === 'ready' ? onOpenLoad() : setActiveOrder(nextOrder))}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 999,
                      backgroundColor: brand.brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      ...brandShadow(brand.brand, 'sm'),
                    }}
                  >
                    <Text
                      style={{
                        color: palette.light.fgInverse,
                        fontFamily: Fonts.semibold,
                        fontSize: 14.5,
                        letterSpacing: -0.2,
                      }}
                    >
                      {state === 'ready' ? 'Iniciar ruta' : 'Entregar pedido'}
                    </Text>
                    <ChevronRight size={15} color={palette.light.fgInverse} />
                  </Pressable>
                </View>

                <Pressable
                  haptic="selection"
                  onPress={onOpenLoad}
                  style={{ marginTop: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.fgMuted, fontFamily: Fonts.medium, fontSize: 12.5 }}>
                    Ver ruta completa →
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        {/* 3 KPI cards — Entregado · Pendiente · Por cobrar */}
        <Animated.View entering={FadeInUp.delay(220).duration(220)} className="flex-row gap-2.5 mx-5 mt-3">
          <MiniStat
            label="Entregadas"
            value={String(load?.progress.delivered ?? 0)}
            sub={load ? `de ${load.progress.total}` : 'de 0'}
            tint={load ? colors.success : colors.fgSubtle}
            icon={<PackageReceive size={16} color={load ? colors.success : colors.fgSubtle} />}
          />
          <MiniStat
            label="Pendientes"
            value={String(load?.progress.pending ?? 0)}
            sub={
              load
                ? load.progress.pending === 1
                  ? 'parada'
                  : 'paradas'
                : 'paradas'
            }
            tint={load ? brand.brand : colors.fgSubtle}
            icon={<Truck size={16} color={load ? brand.brand : colors.fgSubtle} />}
          />
          <MiniStat
            label="Por cobrar"
            value={formatCLP(load?.amounts.pending ?? 0)}
            sub={
              load
                ? `${formatCLP(load.amounts.collected)} cobrado`
                : 'sin actividad'
            }
            tint={load ? colors.warning : colors.fgSubtle}
            icon={<Wallet size={16} color={load ? colors.warning : colors.fgSubtle} />}
          />
        </Animated.View>

        {/* CTA — Iniciar tracking GPS para que admin vea al driver en vivo */}
        <Animated.View
          entering={FadeInUp.delay(220).duration(220)}
          style={{ marginTop: 18, marginHorizontal: 20 }}
        >
          <Pressable
            haptic="selection"
            scale="subtle"
            onPress={() => router.push('/(app)/routes/track' as never)}
          >
            <Card padding="md" variant="outlined" className="overflow-hidden">
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: withAlpha(brand.brand, 0.13),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={22} color={brand.brand} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text variant="bodyStrong" numberOfLines={1}>
                    Iniciar mi ubicación
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    El panel de flota te va a ver en vivo
                  </Text>
                </View>
                <ArrowRight size={18} color={colors.fgSubtle} />
              </View>
            </Card>
          </Pressable>
        </Animated.View>

        {/* Mis pedidos recientes — con tabs por status */}
        {myOrders.length > 0
          ? (() => {
              // Filtrar por tab activo. "pending" agrupa pending + in_route.
              const filteredOrders = myOrders.filter((o) => {
                if (myOrdersTab === 'pending') {
                  return o.status === 'pending' || o.status === 'in_route';
                }
                return o.status === myOrdersTab;
              });

              const counts = {
                pending: myOrders.filter(
                  (o) => o.status === 'pending' || o.status === 'in_route',
                ).length,
                delivered: myOrders.filter((o) => o.status === 'delivered').length,
                cancelled: myOrders.filter((o) => o.status === 'cancelled').length,
              };

              const tabs: {
                key: 'pending' | 'delivered' | 'cancelled';
                label: string;
                tint: string;
              }[] = [
                { key: 'pending', label: 'Pendientes', tint: colors.warning },
                { key: 'delivered', label: 'Entregados', tint: colors.success },
                { key: 'cancelled', label: 'Cancelados', tint: colors.danger },
              ];

              return (
                <Animated.View
                  entering={FadeInUp.delay(260).duration(220)}
                  style={{ marginTop: 20 }}
                >
                  <View className="px-5 mb-3">
                    <Text variant="overline" tone="subtle">
                      Mis pedidos recientes
                    </Text>
                  </View>

                  {/* Tabs */}
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 6,
                      paddingHorizontal: 16,
                      marginBottom: 12,
                    }}
                  >
                    {tabs.map((tab) => {
                      const isActive = myOrdersTab === tab.key;
                      const count = counts[tab.key];
                      return (
                        <Pressable
                          key={tab.key}
                          haptic="selection"
                          onPress={() => setMyOrdersTab(tab.key)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 14,
                            backgroundColor: isActive
                              ? withAlpha(tab.tint, scheme === 'dark' ? 0.19 : 0.09)
                              : colors.bgMuted,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isActive ? withAlpha(tab.tint, 0.31) : 'transparent',
                          }}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: isActive ? tab.tint : colors.fgMuted,
                              fontFamily: Fonts.medium,
                            }}
                          >
                            {tab.label}
                          </Text>
                          <Text
                            variant="bodyStrong"
                            style={{
                              color: isActive ? tab.tint : colors.fg,
                              marginTop: 2,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {count}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Lista de chips filtrada */}
                  {filteredOrders.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                    >
                      {filteredOrders.map((o) => (
                        <MyOrderChip
                          key={o.id}
                          order={o}
                          onPress={() =>
                            router.push(`/(app)/routes/orders/${o.id}` as never)
                          }
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View
                      style={{
                        marginHorizontal: 20,
                        paddingVertical: 20,
                        alignItems: 'center',
                        backgroundColor: colors.bgMuted,
                        borderRadius: 14,
                      }}
                    >
                      <Text variant="caption" tone="muted">
                        Sin pedidos {tabs.find((t) => t.key === myOrdersTab)?.label.toLowerCase()}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              );
            })()
          : null}

        {/* Mis cargas — agrupa los pedidos en jornadas (loads) */}
        {myLoads.length > 0 ? (
          <Animated.View
            entering={FadeInUp.delay(280).duration(220)}
            style={{ marginTop: 18 }}
          >
            <View className="flex-row items-baseline justify-between px-5 mb-3">
              <Text variant="overline" tone="subtle">
                Mis cargas
              </Text>
              <Text variant="caption" tone="muted">
                últimas {myLoads.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {myLoads.map((l) => (
                <MyLoadChip
                  key={l.id}
                  load={l}
                  onPress={() => router.push(`/(app)/routes/load/${l.id}` as never)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Lista de pedidos pendientes — destacado */}
        {isLoading ? (
          <View className="px-5 pt-6 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </View>
        ) : (
          <Animated.View entering={FadeInUp.delay(280).duration(220)} className="px-5 mt-7 gap-2">
            <Text variant="overline" tone="subtle" style={{ marginBottom: 10 }}>
              Pedidos del día
            </Text>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.bgMuted,
                borderRadius: 10,
                padding: 3,
                marginBottom: 12,
                opacity: load ? 1 : 0.5,
              }}
            >
              {([
                { key: 'pending', label: 'Pendientes', count: pendingOrders.length },
                { key: 'delivered', label: 'Entregados', count: deliveredOrders.length },
              ] as const).map((t) => {
                const active = orderTab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    haptic="selection"
                    onPress={() => setOrderTab(t.key)}
                    disabled={!load}
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
            {visibleOrders.length === 0 ? (
              <View
                style={{
                  paddingVertical: 32,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  backgroundColor: colors.bgSubtle,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                  gap: 10,
                }}
              >
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
                  <Truck size={22} color={colors.fgSubtle} strokeWidth={1.6} />
                </View>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 14,
                    color: colors.fg,
                    textAlign: 'center',
                    includeFontPadding: false,
                  } as never}
                >
                  {!load
                    ? 'Sin ruta activa'
                    : orderTab === 'pending'
                      ? 'Todo entregado'
                      : 'Aún sin entregas'}
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.regular,
                    fontSize: 12,
                    color: colors.fgMuted,
                    textAlign: 'center',
                    maxWidth: 260,
                    includeFontPadding: false,
                    lineHeight: 17,
                  } as never}
                >
                  {!load
                    ? (data?.message ?? 'Tu manager te asignará una ruta cuando esté lista.')
                    : orderTab === 'pending'
                      ? 'Ya completaste todas las paradas pendientes.'
                      : 'Cuando entregues una parada aparecerá acá.'}
                </Text>
              </View>
            ) : (
              visibleOrders.map((o) => (
                <View key={o.id}>
                  <OrderCard order={o} onPress={() => router.push(`/(app)/routes/orders/${o.id}` as never)} brand={brand} />
                </View>
              ))
            )}
          </Animated.View>
        )}

        {/* Accesos rápidos — 2x2 grid estilo enterprise home */}
        <Animated.View entering={FadeInUp.delay(360).duration(220)} className="mt-7">
          <Text variant="overline" tone="subtle" style={{ marginLeft: 20, marginBottom: 12 }}>
            Accesos rápidos
          </Text>
          <View className="flex-row flex-wrap px-4">
            <DriverGridAction
              icon={<Plus size={20} color={brand.brand} />}
              label="Nuevo Pedido"
              onPress={() => router.push('/(app)/routes/orders/new' as never)}
            />
            <DriverGridAction
              icon={<Package size={20} color={brand.brand} />}
              label="Pedidos"
              onPress={() => router.push('/(app)/routes/orders' as never)}
            />
            <DriverGridAction
              icon={<UserIcon size={20} color={brand.brand} />}
              label="Clientes"
              onPress={() => router.push('/(app)/routes/clients' as never)}
            />
            <DriverGridAction
              icon={<PackageReceive size={20} color={brand.brand} />}
              label="Producción"
              onPress={() => router.push('/(app)/routes/production' as never)}
            />
            <DriverGridAction
              icon={<Truck size={20} color={brand.brand} />}
              label="Cargas"
              onPress={() => router.push('/(app)/routes/loads' as never)}
            />
            <DriverGridAction
              icon={<Wallet size={20} color={brand.brand} />}
              label="Facturación"
              onPress={() => router.push('/(app)/routes/billing' as never)}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom action: cerrar ruta */}
      {load && allResolved ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 14,
            left: 16,
            right: 16,
          }}
        >
          <Button
            brand
            onPress={() => closeMutation.mutate()}
            loading={closeMutation.isPending}
            haptic="medium"
          >
            Cerrar ruta del día
          </Button>
        </Animated.View>
      ) : null}

      {activeOrder ? (
        <OrderDetailSheet
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
          onResolved={() => {
            setActiveOrder(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
          }}
        />
      ) : null}

      {/* Sheet con feed de notificaciones realtime */}
      <NotificationsSheet ref={notifSheet} />

      {/* FAB — Crear nuevo pedido (admin/manager/driver) */}
      {(me?.role === 'tenant_admin' ||
        me?.role === 'tenant_manager' ||
        me?.role === 'tenant_driver') && (
        <Pressable
          haptic="medium"
          onPress={() => router.push('/(app)/routes/orders/new' as never)}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo pedido"
          style={{
            position: 'absolute',
            right: 20,
            // Tab bar ocupa ~56-64px + safe area. Sumamos más para quedar
            // claramente arriba sin chocar.
            bottom: insets.bottom + 80,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: brand.brand,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: brand.brand,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 50,
          }}
        >
          <Plus size={26} color={brand.brandFg} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}

/* ─────────────── MyLoadChip — tarjeta de carga histórica ─────────────── */

function dateLabel(iso: string | null, isToday: boolean): string {
  if (isToday) return 'Hoy';
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'Ayer';
  }
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

const ORDER_STATUS_META: Record<
  MyOrderCard['status'],
  { label: string; tone: 'warning' | 'success' | 'danger' | 'brand' }
> = {
  pending: { label: 'PENDIENTE', tone: 'warning' },
  in_route: { label: 'EN RUTA', tone: 'brand' },
  delivered: { label: 'ENTREGADO', tone: 'success' },
  cancelled: { label: 'NO ENTREGADO', tone: 'danger' },
};

function MyOrderChip({ order, onPress }: { order: MyOrderCard; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const meta = ORDER_STATUS_META[order.status];
  const accent =
    meta.tone === 'success'
      ? colors.success
      : meta.tone === 'warning'
        ? colors.warning
        : meta.tone === 'danger'
          ? colors.danger
          : brand.brand;
  const pending = Math.max(0, order.total - order.amount_paid);
  const initial = (order.client_name?.trim()[0] ?? '?').toUpperCase();

  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        width: 208,
        backgroundColor: colors.bgElevated,
        borderRadius: 18,
        borderWidth: order.is_today ? 1.5 : 1,
        borderColor: order.is_today ? brand.brand : colors.border,
        padding: 14,
      }}
    >
      {/* Top row: order number + status pill */}
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
            {meta.label}
          </Text>
        </View>
      </View>

      {/* Client row: avatar inicial + nombre + fecha */}
      <View className="flex-row items-center gap-2.5" style={{ marginTop: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
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
              fontSize: 13,
              lineHeight: 18,
              color: colors.fg,
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            {order.client_name ?? '—'}
          </Text>
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 11,
              color: colors.fgMuted,
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            {dateLabel(order.created_at, order.is_today)}
          </Text>
        </View>
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

      {/* Monto + estado de cobro */}
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 18,
          lineHeight: 22,
          letterSpacing: -0.4,
          color: colors.fg,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {formatCLP(order.total)}
      </Text>
      <View style={{ marginTop: 4 }}>
        {pending > 0 && order.status === 'delivered' ? (
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 11,
              color: colors.warning,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            {formatCLP(pending)} por cobrar
          </Text>
        ) : order.amount_paid > 0 ? (
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 11,
              color: colors.success,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            ✓ {formatCLP(order.amount_paid)} cobrado
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 11,
              color: colors.fgSubtle,
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            sin cobro
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/* ─────────────── MyLoadChip — chip de carga (jornada) ─────────────── */

function MyLoadChip({ load, onPress }: { load: MyLoadCard; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const isOpen = load.status === 'open';
  const accent = isOpen ? brand.brand : colors.fgMuted;
  const barColor = isOpen ? brand.brand : colors.success;

  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        width: 184,
        backgroundColor: colors.bgElevated,
        borderRadius: 18,
        borderWidth: load.is_today ? 1.5 : 1,
        borderColor: load.is_today ? brand.brand : colors.border,
        padding: 14,
      }}
    >
      {/* Top: fecha + status pill */}
      <View className="flex-row items-center justify-between">
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: 13,
            letterSpacing: -0.2,
            color: colors.fg,
            includeFontPadding: false,
          } as never}
          numberOfLines={1}
        >
          {dateLabel(load.created_at, load.is_today)}
        </Text>
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
            {isOpen ? 'EN RUTA' : 'CERRADA'}
          </Text>
        </View>
      </View>

      {/* Big number + porcentaje a la derecha */}
      <View className="flex-row items-end justify-between" style={{ marginTop: 14 }}>
        <View className="flex-row items-baseline gap-1">
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 26,
              lineHeight: 30,
              letterSpacing: -0.6,
              color: colors.fg,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never}
          >
            {load.progress.delivered}
          </Text>
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: colors.fgMuted,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never}
          >
            /{load.progress.total}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: 11,
            color: barColor,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never}
        >
          {Math.round(load.progress.pct)}%
        </Text>
      </View>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 11,
          color: colors.fgSubtle,
          marginTop: 1,
          includeFontPadding: false,
        } as never}
      >
        entregas
      </Text>

      {/* Mini progress bar más prominente */}
      <View
        style={{
          marginTop: 10,
          height: 5,
          borderRadius: 999,
          backgroundColor: withAlpha(barColor, 0.1),
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${load.progress.pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 999,
          }}
        />
      </View>

      {/* Stats split: cobrado | por cobrar */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 9,
              letterSpacing: 0.5,
              color: colors.fgSubtle,
              includeFontPadding: false,
            } as never}
          >
            COBRADO
          </Text>
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 12,
              color: colors.success,
              fontVariant: ['tabular-nums'],
              marginTop: 2,
              includeFontPadding: false,
            } as never}
            numberOfLines={1}
          >
            {formatCLP(load.amounts.collected)}
          </Text>
        </View>
        {load.amounts.pending > 0 ? (
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 9,
                letterSpacing: 0.5,
                color: colors.fgSubtle,
                includeFontPadding: false,
              } as never}
            >
              POR COBRAR
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 12,
                color: colors.warning,
                fontVariant: ['tabular-nums'],
                marginTop: 2,
                includeFontPadding: false,
              } as never}
              numberOfLines={1}
            >
              {formatCLP(load.amounts.pending)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ─────────────── MiniStat (estilo enterprise home) ─────────────── */

function MiniStat({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tint?: string;
  icon?: ReactNode;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgElevated,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: withAlpha(tint ?? colors.fgSubtle, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View className="flex-row items-center gap-1.5">
        {!icon && tint ? (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tint }} />
        ) : null}
        <Text
          variant="overline"
          tone="subtle"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ flexShrink: 1, letterSpacing: 0.6 } as never}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 18,
          lineHeight: 26,
          letterSpacing: -0.4,
          marginTop: 6,
          color: colors.fg,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text variant="caption" tone="subtle" className="mt-0.5">
        {sub}
      </Text>
    </View>
  );
}

/* ─────────────── Driver Grid Action (estilo enterprise 2x2) ─────────────── */

function DriverGridAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View className="w-1/2 px-1.5 py-1.5">
      <Pressable
        onPress={onPress}
        haptic="selection"
        scale="subtle"
        style={{
          borderRadius: 16,
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.bgMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 13,
            color: colors.fg,
            letterSpacing: -0.2,
            flex: 1,
            includeFontPadding: false,
          } as never}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/* ─────────────── OrderCard ─────────────── */

function OrderCard({
  order,
  onPress,
  brand,
}: {
  order: RouteOrder;
  onPress: () => void;
  brand: { brand: string; brandSubtle: string };
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const statusColor =
    order.status === 'delivered'
      ? colors.success
      : order.status === 'cancelled'
        ? colors.danger
        : brand.brand;
  const statusBg =
    order.status === 'delivered'
      ? withAlpha(colors.success, 0.12)
      : order.status === 'cancelled'
        ? withAlpha(colors.danger, 0.12)
        : brand.brandSubtle;

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: order.status === 'pending' ? withAlpha(brand.brand, 0.25) : colors.border,
      }}
    >
      <View className="flex-row justify-between items-start gap-3">
        <View className="flex-1">
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: statusBg,
              marginBottom: 8,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 10,
                letterSpacing: 0.6,
                color: statusColor,
                textTransform: 'uppercase',
              }}
            >
              {STATUS_LABEL[order.status]}
            </Text>
          </View>
          <Text variant="bodyStrong" numberOfLines={1}>
            {order.client?.name ?? '—'}
          </Text>
          <Text variant="caption" tone="muted" className="mt-0.5" numberOfLines={1}>
            {order.client?.address ?? '—'}
          </Text>
          <Text variant="caption" tone="subtle" className="mt-0.5" style={{ fontFamily: 'Menlo' }}>
            {order.order_number}
          </Text>
        </View>
        <View className="items-end">
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 17,
              letterSpacing: -0.4,
              color: colors.fg,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatCLP(order.total)}
          </Text>
          <Text variant="caption" tone="subtle" className="mt-0.5">
            {PAYMENT_LABEL[order.payment_status]}
          </Text>
          <ArrowRight size={14} color={colors.fgSubtle} />
        </View>
      </View>
    </Pressable>
  );
}

/* ─────────────── OrderDetailSheet ─────────────── */

function OrderDetailSheet({
  order,
  onClose,
  onResolved,
}: {
  order: RouteOrder;
  onClose: () => void;
  onResolved: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'main' | 'deliver' | 'skip'>('main');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isResolved = order.status !== 'pending';

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error('Sin permiso de cámara', 'Habilitalo en ajustes para adjuntar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const deliverMut = useMutation({
    mutationFn: async () => {
      // Foto primero (best-effort): si falla, la entrega sigue igual.
      if (photoUri) {
        try {
          const form = new FormData();
          form.append('photo', {
            uri: photoUri,
            name: 'entrega.jpg',
            type: 'image/jpeg',
          } as unknown as Blob);
          await apiUpload(`/api/mobile/routes/orders/${order.id}/delivery-photo`, form);
        } catch {
          toast.warning('Foto no subida', 'La entrega se registra igual; reintentá desde el detalle.');
        }
      }
      const paidNum = Number(paid) || 0;
      return apiRequest<{ data: RouteOrder }>({
        method: 'POST',
        url: `/api/mobile/routes/orders/${order.id}/deliver`,
        data: {
          amount_paid: paidNum,
          payment_method: paidNum > 0 ? method : null,
          notes: notes.trim() || null,
        },
      });
    },
    onSuccess: () => {
      onResolved();
      const paidNum = Number(paid) || 0;
      toast.success(
        '✓ Entregada',
        paidNum > 0 ? `Cobrado ${formatCLP(paidNum)}` : 'Sin cobro registrado',
      );
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar');
    },
  });

  const skipMut = useMutation({
    mutationFn: async () => {
      if (!notes.trim()) {
        throw new Error('Necesitas escribir un motivo.');
      }
      return apiRequest<{ data: RouteOrder }>({
        method: 'POST',
        url: `/api/mobile/routes/orders/${order.id}/skip`,
        data: { notes: notes.trim() },
      });
    },
    onSuccess: () => {
      onResolved();
      toast.warning('Marcada como no entregada', notes);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'No se pudo marcar');
    },
  });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10,13,20,0.55)',
        }}
      >
        <Pressable haptic="none" scale="none" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          exiting={SlideOutDown.duration(220)}
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            paddingBottom: insets.bottom + 18,
            maxHeight: '92%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text variant="overline" tone="brand">
              {order.order_number}
            </Text>
            <Text variant="title" className="mt-1.5" numberOfLines={2}>
              {order.client?.name ?? '—'}
            </Text>
            {order.client?.address ? (
              <Text variant="body" tone="muted" className="mt-1">
                {order.client.address}
              </Text>
            ) : null}
            {order.client?.phone ? (
              <Text variant="caption" tone="subtle" className="mt-0.5">
                {order.client.phone}
              </Text>
            ) : null}

            <View
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                backgroundColor: colors.bgSubtle,
              }}
            >
              <View className="flex-row justify-between items-baseline">
                <Text variant="caption" tone="muted">
                  Total a entregar
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 22,
                lineHeight: 30,
                    letterSpacing: -0.5,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCLP(order.total)}
                </Text>
              </View>
              <View
                style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }}
              />
              <Text variant="overline" tone="subtle" className="mb-2">
                Items
              </Text>
              {order.items.map((it) => (
                <View
                  key={it.id}
                  className="flex-row justify-between items-baseline"
                  style={{ marginTop: 4 }}
                >
                  <Text variant="body" className="flex-1" numberOfLines={1}>
                    {it.product_name}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                    ×{it.quantity}
                  </Text>
                  <Text
                    style={{
                      width: 80,
                      textAlign: 'right',
                      fontFamily: Fonts.medium,
                      fontVariant: ['tabular-nums'],
                      fontSize: 13,
                    }}
                  >
                    {formatCLP(it.subtotal)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Si ya resuelta, mostrar info */}
            {isResolved ? (
              <View className="mt-5">
                {order.status === 'delivered' ? (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: withAlpha(colors.success, 0.06),
                      borderWidth: 1,
                      borderColor: withAlpha(colors.success, 0.2),
                    }}
                  >
                    <Text variant="bodyStrong" tone="success">
                      ✓ Entregada
                    </Text>
                    {order.amount_paid > 0 ? (
                      <Text variant="caption" tone="muted" className="mt-1">
                        Cobrado: {formatCLP(order.amount_paid)} · {order.payment_method ?? '—'}
                      </Text>
                    ) : (
                      <Text variant="caption" tone="muted" className="mt-1">
                        Sin cobro
                      </Text>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: withAlpha(colors.danger, 0.06),
                      borderWidth: 1,
                      borderColor: withAlpha(colors.danger, 0.2),
                    }}
                  >
                    <Text variant="bodyStrong" tone="danger">
                      ✕ No entregada
                    </Text>
                    {order.notes ? (
                      <Text variant="caption" tone="muted" className="mt-1">
                        {order.notes}
                      </Text>
                    ) : null}
                  </View>
                )}
                <View className="mt-5">
                  <Button variant="secondary" onPress={onClose}>
                    Cerrar
                  </Button>
                </View>
              </View>
            ) : mode === 'main' ? (
              <View className="mt-5 gap-2.5">
                <Button brand onPress={() => setMode('deliver')}>Marcar entregada</Button>
                <Button variant="secondary" onPress={() => setMode('skip')}>
                  No pude entregar
                </Button>
              </View>
            ) : mode === 'deliver' ? (
              <View className="mt-5">
                <Text variant="overline" tone="subtle" className="mb-2">
                  Cobro al entregar (opcional)
                </Text>
                <View className="flex-row gap-3">
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" tone="muted">
                      Recibido
                    </Text>
                    <TextInput
                      value={paid}
                      onChangeText={(t) => setPaid(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.fgSubtle}
                      style={{
                        marginTop: 6,
                        fontFamily: Fonts.semibold,
                        fontSize: 22,
                lineHeight: 30,
                        color: colors.fg,
                        fontVariant: ['tabular-nums'],
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderStrong,
                        paddingBottom: 6,
                      }}
                    />
                  </View>
                  <View style={{ width: 130 }}>
                    <Text variant="caption" tone="muted">
                      Método
                    </Text>
                    <View className="flex-row gap-1.5 mt-2">
                      {(['cash', 'transfer'] as const).map((m) => (
                        <Pressable
                          key={m}
                          haptic="selection"
                          onPress={() => setMethod(m)}
                          style={{
                            flex: 1,
                            height: 32,
                            borderRadius: 8,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: method === m ? brand.brand : colors.bgMuted,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: Fonts.medium,
                              fontSize: 11,
                              color: method === m ? brand.brandFg : colors.fgMuted,
                            }}
                          >
                            {m === 'cash' ? 'Efectivo' : 'Transfer'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <Text variant="overline" tone="subtle" className="mt-5 mb-2">
                  Nota (opcional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Comentario sobre la entrega…"
                  placeholderTextColor={colors.fgSubtle}
                  multiline
                  maxLength={500}
                  style={{
                    minHeight: 56,
                    borderRadius: 12,
                    backgroundColor: colors.bgSubtle,
                    padding: 14,
                    fontFamily: Fonts.regular,
                    fontSize: 14,
                    color: colors.fg,
                  }}
                />

                {/* Foto de entrega (opcional) — prueba de entrega estilo delivery-app */}
                <Pressable
                  haptic="selection"
                  accessibilityLabel="Foto de entrega"
                  onPress={takePhoto}
                  style={{
                    marginTop: 12,
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: photoUri ? 'solid' : 'dashed',
                    borderColor: photoUri ? colors.success : colors.borderStrong,
                    backgroundColor: photoUri ? withAlpha(colors.success, 0.08) : colors.bgSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: photoUri ? colors.success : colors.fgMuted,
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                    }}
                  >
                    {photoUri ? '✓ Foto adjunta — tocá para repetir' : 'Sacar foto de entrega (opcional)'}
                  </Text>
                </Pressable>

                {error ? (
                  <Text variant="caption" tone="danger" className="mt-2">
                    {error}
                  </Text>
                ) : null}

                <View className="flex-row gap-3 mt-6">
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" onPress={() => setMode('main')}>
                      Atrás
                    </Button>
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Button brand onPress={() => deliverMut.mutate()} loading={deliverMut.isPending}>
                      Confirmar entrega
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              /* skip mode */
              <View className="mt-5">
                <Text variant="overline" tone="subtle" className="mb-2">
                  Motivo (requerido)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Cliente no estaba, dirección incorrecta, etc."
                  placeholderTextColor={colors.fgSubtle}
                  multiline
                  maxLength={500}
                  autoFocus
                  style={{
                    minHeight: 80,
                    borderRadius: 12,
                    backgroundColor: colors.bgSubtle,
                    padding: 14,
                    fontFamily: Fonts.regular,
                    fontSize: 14,
                    color: colors.fg,
                  }}
                />

                {error ? (
                  <Text variant="caption" tone="danger" className="mt-2">
                    {error}
                  </Text>
                ) : null}

                <View className="flex-row gap-3 mt-6">
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" onPress={() => setMode('main')}>
                      Atrás
                    </Button>
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Button
                      variant="danger"
                      onPress={() => skipMut.mutate()}
                      loading={skipMut.isPending}
                    >
                      Marcar no entregada
                    </Button>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Suprimir warnings de imports no usados directamente
void LinearGradient;

/* ─────────────── DonutProgress — anillo de paradas del hero ─────────────── */

function DonutProgress({
  pct,
  delivered,
  total,
  fg,
}: {
  pct: number;
  delivered: number;
  total: number;
  fg: string;
}) {
  const size = 92;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={withAlpha(fg, 0.22)}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fg}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - clamped / 100)}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text
          style={{
            color: fg,
            fontFamily: Fonts.semibold,
            fontSize: 19,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never}
        >
          {delivered}/{total}
        </Text>
        <Text style={{ color: fg, opacity: 0.7, fontFamily: Fonts.regular, fontSize: 10 }}>
          paradas
        </Text>
      </View>
    </View>
  );
}
