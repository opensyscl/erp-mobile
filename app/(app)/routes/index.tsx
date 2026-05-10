import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderPattern } from '~/components/HeaderPattern';
import { NotificationsSheet } from '~/components/NotificationsSheet';
import { toast } from '~/components/Toast';
import { Button, Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useSafeBack } from '~/hooks/useSafeBack';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight, BarChart, Bell, Package, PackageReceive, Plus, Receipt, Refresh, Truck, User as UserIcon, UserGroup, Wallet } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useUnseenCount } from '~/stores/notifications';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';
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
  const isDriver = me?.role === 'tenant_driver';
  const params = useLocalSearchParams<{ driver_id?: string }>();
  const driverIdParam = params.driver_id ?? null;
  // Driver llega aquí por redirect desde /(app)/ — no hay stack, así que router.back()
  // dispara "GO_BACK was not handled". Caemos al admin dashboard si admin, o al home.
  const safeBack = useSafeBack(isDriver ? '/(app)/settings' : '/(app)/routes/admin');

  const [activeOrder, setActiveOrder] = useState<RouteOrder | null>(null);
  const [orderTab, setOrderTab] = useState<'pending' | 'delivered'>('pending');

  const todayKey = ['routes', 'today', driverIdParam ?? 'self'];
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
  const myOrdersKey = ['routes', 'my-orders', driverIdParam ?? 'self'];
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
  const myLoadsKey = ['routes', 'my-loads', driverIdParam ?? 'self'];
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

  // Realtime: el conductor debe ver cambios cuando admin confirma carga,
  // crea órdenes nuevas o cierra la jornada.
  const routesChannel = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteLoadConfirmed, [todayKey, myOrdersKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteLoadClosed, [todayKey, myOrdersKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteOrderCreated, [todayKey, myOrdersKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteOrderStatusChanged, [todayKey, myOrdersKey]);

  // El feed in-app de eventos vive en (app)/_layout.tsx para que persista entre
  // pantallas. Acá solo leemos el contador.
  const unseenCount = useUnseenCount();

  // Sheet de notificaciones + handler de reload manual
  const notifSheet = useRef<BottomSheetModalType>(null);
  const handleReload = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['routes'] });
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
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Ruta cerrada', 'Tu manager fue notificado.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cerrar';
      toast.error('Error', msg);
    },
  });

  const allResolved =
    orders.length > 0 && orders.every((o) => o.status !== 'pending');

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
        {/* Header brand compacto — estilo enterprise home */}
        <View
          style={{
            backgroundColor: brand.brand,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 92,
            overflow: 'hidden',
          }}
        >
          <HeaderPattern color={brand.brandFg} intensity={1.0} />
          <Animated.View entering={FadeInDown.duration(220)}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.22)',
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
                  onPress={handleReload}
                  className="h-9 w-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                >
                  <Refresh size={16} color={brand.brandFg} strokeWidth={1.8} />
                </Pressable>
                <Pressable
                  haptic="selection"
                  onPress={() => notifSheet.current?.present()}
                  className="h-9 w-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
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
                        backgroundColor: '#ef4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: brand.brand,
                      }}
                    >
                      <Text
                        style={{
                          color: '#fff',
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
                fontFamily: Fonts.medium,
                fontSize: 26,
                lineHeight: 36,
                letterSpacing: -0.4,
                marginTop: 22,
              }}
            >
              {greeting()},
            </Text>
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.semibold,
                fontSize: 26,
                lineHeight: 36,
                letterSpacing: -0.4,
              }}
            >
              {(me?.name ?? 'Equipo').split(' ')[0]}.
            </Text>
            <Text
              style={{
                color: brand.brandFg,
                opacity: 0.62,
                fontFamily: Fonts.regular,
                fontSize: 13,
                lineHeight: 20,
                marginTop: 8,
                maxWidth: 320,
              }}
            >
              {load ? `Tu ruta del día · ${load.progress.total} paradas asignadas.` : 'Sin ruta activa hoy.'}
            </Text>
          </Animated.View>
        </View>

        {/* Hero Card flotante — KPI principal estilo enterprise · tappable → detalle */}
        {!load ? (
          <Animated.View entering={FadeInUp.delay(140).duration(220)} className="mx-5" style={{ marginTop: -68 }}>
            <Card padding="lg" className="overflow-hidden">
              <View className="flex-row items-start">
                <View className="flex-1 pr-2">
                  <Text variant="overline" tone="subtle">
                    Mi ruta de hoy
                  </Text>
                  <View className="flex-row items-baseline gap-2 mt-2">
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 32,
                        lineHeight: 42,
                        letterSpacing: -0.7,
                        color: colors.fgMuted,
                        fontVariant: ['tabular-nums'],
                        includeFontPadding: false,
                      } as never}
                    >
                      0
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 18,
                        color: colors.fgMuted,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      / 0 entregas
                    </Text>
                  </View>
                  <Text variant="caption" tone="muted" className="mt-1">
                    {data?.message ?? 'Esperando asignación de tu manager.'}
                  </Text>
                </View>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: colors.bgMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={26} color={colors.fgSubtle} strokeWidth={1.6} />
                </View>
              </View>
              <View
                style={{
                  marginTop: 14,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: colors.bgMuted,
                }}
              />
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.delay(140).duration(220)} className="mx-5" style={{ marginTop: -68 }}>
            <Pressable
              haptic="selection"
              scale="subtle"
              onPress={() => router.push(`/(app)/routes/load/${load.id}` as never)}
            >
            <Card  padding="lg" className="overflow-hidden">
              <View className="flex-row items-start">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center justify-between">
                    <Text variant="overline" tone="brand">
                      Mi ruta de hoy
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.medium,
                        fontSize: 11,
                        color: brand.brand,
                        letterSpacing: 0.2,
                        includeFontPadding: false,
                      } as never}
                    >
                      Ver detalle →
                    </Text>
                  </View>
                  <View className="flex-row items-baseline gap-2 mt-2">
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 32,
                        lineHeight: 42,
                        letterSpacing: -0.7,
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
                        fontSize: 18,
                        color: colors.fgMuted,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      / {load.progress.total} entregas
                    </Text>
                  </View>
                  <Text variant="caption" tone="muted" className="mt-1">
                    {load.progress.pending} pendientes · {load.progress.pct}% completado
                  </Text>
                </View>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: brand.brandSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={26} color={brand.brand} strokeWidth={1.6} />
                </View>
              </View>

              {/* Progress bar */}
              <ProgressBar pct={load.progress.pct} brand={brand.brand} bg={colors.bgMuted} />
            </Card>
            </Pressable>
          </Animated.View>
        )}

        {/* 3 KPI cards — Entregado · Pendiente · Por cobrar */}
        <Animated.View entering={FadeInUp.delay(220).duration(220)} className="flex-row gap-2.5 mx-5 mt-3">
          <MiniStat
            label="Entregadas"
            value={String(load?.progress.delivered ?? 0)}
            sub={load ? `de ${load.progress.total}` : 'de 0'}
            tint={load ? colors.success : colors.fgSubtle}
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
          />
        </Animated.View>

        {/* Mis pedidos recientes — últimos 10 con scroll horizontal */}
        {myOrders.length > 0 ? (
          <Animated.View
            entering={FadeInUp.delay(260).duration(220)}
            style={{ marginTop: 20 }}
          >
            <View className="flex-row items-baseline justify-between px-5 mb-3">
              <Text variant="overline" tone="subtle">
                Mis pedidos recientes
              </Text>
              <Text variant="caption" tone="muted">
                últimos {myOrders.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {myOrders.map((o) => (
                <MyOrderChip
                  key={o.id}
                  order={o}
                  onPress={() => router.push(`/(app)/routes/orders/${o.id}` as never)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

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
            queryClient.invalidateQueries({ queryKey: ['routes'] });
          }}
        />
      ) : null}

      {/* Sheet con feed de notificaciones realtime */}
      <NotificationsSheet ref={notifSheet} />
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
}: {
  label: string;
  value: string;
  sub: string;
  tint?: string;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgElevated,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
      }}
    >
      <View className="flex-row items-center gap-1.5">
        {tint ? (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tint }} />
        ) : null}
        <Text variant="overline" tone="subtle">
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

/* ─────────────── Driver Quick Action ─────────────── */

function DriverQuickAction({
  label,
  icon,
  bg,
  fg,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  bg?: string;
  fg?: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const baseBg = bg ?? colors.bgElevated;
  const baseFg = fg ?? colors.fg;
  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        width: 92,
        height: 92,
        borderRadius: 16,
        backgroundColor: baseBg,
        borderWidth: bg ? 0 : 1,
        borderColor: colors.border,
        padding: 11,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: bg ? 'rgba(255,255,255,0.18)' : colors.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 11,
          lineHeight: 15,
          color: baseFg,
          letterSpacing: -0.1,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─────────────── Driver KPI Card (estilo admin) ─────────────── */

function DriverKpiCard({
  label,
  value,
  accent,
  icon,
  isMoney,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
  isMoney?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center gap-2">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: withAlpha(accent, 0.12),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <Text variant="caption" tone="subtle" style={{ fontSize: 10, letterSpacing: 0.4 }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: isMoney ? 18 : 26,
          lineHeight: isMoney ? 26 : 36,
          letterSpacing: isMoney ? -0.3 : -0.7,
          color: colors.fg,
          fontVariant: ['tabular-nums'],
          marginTop: 8,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ─────────────── Progress bar ─────────────── */

function ProgressBar({ pct, brand, bg }: { pct: number; brand: string; bg: string }) {
  const w = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({
    width: `${w.value}%`,
  }));
  // Animate to current pct on mount/update
  useState(() => {
    w.value = withTiming(pct, { duration: 800, easing: Easing.out(Easing.cubic) });
    return null;
  });
  // Si pct cambia (entregar otra), también animar
  if (w.value !== pct) {
    w.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });
  }

  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: bg,
        overflow: 'hidden',
        marginTop: 12,
      }}
    >
      <Animated.View
        style={[
          {
            height: 8,
            borderRadius: 4,
            backgroundColor: brand,
          },
          fill,
        ]}
      />
    </View>
  );
}

function ProgressStat({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: string;
  color: string;
  last?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 4,
        borderRightWidth: last ? 0 : 1,
        borderRightColor: colors.border,
      }}
    >
      <Text variant="overline" tone="subtle">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 16,
          color,
          letterSpacing: -0.3,
          fontVariant: ['tabular-nums'],
          marginTop: 4,
        }}
      >
        {value}
      </Text>
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
        borderColor: order.status === 'pending' ? brand.brand + '40' : colors.border,
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
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isResolved = order.status !== 'pending';

  const deliverMut = useMutation({
    mutationFn: async () => {
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
                <Button onPress={() => setMode('deliver')}>Marcar entregada</Button>
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
                    <Button onPress={() => deliverMut.mutate()} loading={deliverMut.isPending}>
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
