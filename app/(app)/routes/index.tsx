import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderPattern } from '~/components/HeaderPattern';
import { toast } from '~/components/Toast';
import { Button, Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft, ArrowRight } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import type {
  RouteLoad,
  RouteOrder,
  RoutePaymentStatus,
} from '~/types/routes';

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

const STATUS_LABEL: Record<RouteOrder['status'], string> = {
  pending: 'Pendiente',
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

  const [activeOrder, setActiveOrder] = useState<RouteOrder | null>(null);

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

  // Realtime: el conductor debe ver cambios cuando admin confirma carga,
  // crea órdenes nuevas o cierra la jornada.
  const routesChannel = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteLoadConfirmed, [todayKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteLoadClosed, [todayKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteOrderCreated, [todayKey]);
  useRealtimeInvalidate(routesChannel, RealtimeEvents.RouteOrderStatusChanged, [todayKey]);

  const load = data?.data ?? null;
  const orders = load?.orders ?? [];

  // Sort: pendientes primero, luego entregadas, luego canceladas
  const sortedOrders = [...orders].sort((a, b) => {
    const order: Record<RouteOrder['status'], number> = {
      pending: 0,
      delivered: 1,
      cancelled: 2,
    };
    return order[a.status] - order[b.status];
  });

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
      >
        {/* Hero brand bg */}
        <View
          style={{
            backgroundColor: brand.brand,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 92,
            overflow: 'hidden',
          }}
        >
          <HeaderPattern color={brand.brandFg} intensity={1.1} />

          <View className="flex-row items-center justify-between">
            <Pressable
              haptic="selection"
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color={brand.brandFg} />
            </Pressable>
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.medium,
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              {isDriver ? 'Mi ruta' : 'Reparto'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.medium,
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Hoy · {load?.driver?.name ?? '—'}
            </Text>
            <Text
              style={{
                color: brand.brandFg,
                fontFamily: Fonts.semibold,
                fontSize: 30,
                lineHeight: 40,
                letterSpacing: -0.9,
                marginTop: 4,
              }}
            >
              {load ? `${load.progress.delivered} de ${load.progress.total} entregas` : 'Sin ruta activa'}
            </Text>
            {load ? (
              <Text
                style={{
                  color: brand.brandFg,
                  opacity: 0.7,
                  fontFamily: Fonts.regular,
                  fontSize: 14,
                  marginTop: 6,
                }}
              >
                {formatCLP(load.amounts.collected)} cobrado de {formatCLP(load.amounts.total)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Progress card flotante */}
        {load ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{
              backgroundColor: colors.bgElevated,
              marginHorizontal: 20,
              marginTop: -68,
              borderRadius: 22,
              padding: 20,
              shadowColor: '#0a0d14',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 22,
              elevation: 6,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row items-baseline justify-between">
              <Text variant="overline" tone="brand">
                Progreso
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.semibold,
                  fontSize: 13,
                  color: brand.brand,
                  letterSpacing: -0.2,
                }}
              >
                {load.progress.pct}%
              </Text>
            </View>

            <ProgressBar pct={load.progress.pct} brand={brand.brand} bg={colors.bgMuted} />

            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <ProgressStat
                label="Entregadas"
                value={String(load.progress.delivered)}
                color={colors.success}
              />
              <ProgressStat
                label="Pendientes"
                value={String(load.progress.pending)}
                color={brand.brand}
              />
              <ProgressStat
                label="Por cobrar"
                value={formatCLP(load.amounts.pending)}
                color={colors.fg}
                last
              />
            </View>
          </Animated.View>
        ) : null}

        {/* Lista de paradas */}
        {isLoading ? (
          <View className="px-5 pt-6 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </View>
        ) : !load ? (
          <View className="flex-1 items-center justify-center px-10 pt-20">
            <Text variant="headline" className="text-center">
              No tienes ruta activa
            </Text>
            <Text variant="body" tone="muted" className="mt-2 text-center">
              {data?.message ?? 'Tu manager debe abrir una ruta para ti.'}
            </Text>
          </View>
        ) : (
          <View className="px-5 mt-7 gap-2">
            <Text variant="overline" tone="subtle" className="mb-2">
              Paradas ({orders.length})
            </Text>
            {sortedOrders.map((o, i) => (
              <Animated.View
                key={o.id}
                entering={FadeInDown.delay(Math.min(i * 40, 320)).duration(300)}
              >
                <OrderCard order={o} onPress={() => setActiveOrder(o)} brand={brand} />
              </Animated.View>
            ))}
          </View>
        )}
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
      ? colors.success + '18'
      : order.status === 'cancelled'
        ? colors.danger + '18'
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
                      backgroundColor: colors.success + '10',
                      borderWidth: 1,
                      borderColor: colors.success + '30',
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
                      backgroundColor: colors.danger + '10',
                      borderWidth: 1,
                      borderColor: colors.danger + '30',
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
