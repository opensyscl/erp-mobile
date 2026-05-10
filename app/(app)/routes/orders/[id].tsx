import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderPattern } from '~/components/HeaderPattern';
import { toast } from '~/components/Toast';
import { Button, Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { useSafeBack } from '~/hooks/useSafeBack';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft, Package, Truck, User as UserIcon } from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import type { RouteOrder } from '~/types/routes';

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STEPS = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'in_route', label: 'En ruta' },
  { id: 'delivered', label: 'Entregado' },
] as const;

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) => s.tenant);
  const safeBack = useSafeBack('/(app)/routes/orders');

  const queryKey = ['routes', 'order', params.id];
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () =>
      apiRequest<{ data: RouteOrder }>({
        method: 'GET',
        url: `/api/mobile/routes/orders/${params.id}`,
      }).then((r) => r.data),
    enabled: !!params.id,
  });

  const ch = tenant ? Channels.tenantRoutes(tenant.id) : null;
  useRealtimeInvalidate(ch, RealtimeEvents.RouteOrderStatusChanged, [queryKey]);

  const order = data ?? null;
  const isResolved = !!order && (order.status === 'delivered' || order.status === 'cancelled');
  const stepIndex =
    order?.status === 'delivered' ? 2 : order?.status === 'in_route' ? 1 : 0;

  const [mode, setMode] = useState<'idle' | 'deliver' | 'skip'>('idle');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');

  const subtotal = order ? Number(order.subtotal) : 0;
  const tax = order ? Number(order.tax) : 0;
  const total = order ? Number(order.total) : 0;
  const amountPaid = order ? Number(order.amount_paid) : 0;
  const pending = Math.max(0, total - amountPaid);

  const startMut = useMutation({
    mutationFn: async () => {
      if (!order) return;
      return apiRequest({
        method: 'POST',
        url: `/api/mobile/routes/orders/${order.id}/start`,
      });
    },
    onSuccess: () => {
      toast.success('Ruta iniciada', 'Marcada como en ruta');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (e) => {
      toast.error('Error', e instanceof ApiError ? e.message : 'No se pudo iniciar');
    },
  });

  const deliverMut = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const paidNum = Number(paid) || 0;
      return apiRequest({
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
      const paidNum = Number(paid) || 0;
      toast.success('Entregada', paidNum > 0 ? `Cobrado ${formatCLP(paidNum)}` : 'Sin cobro');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setPaid('');
      setNotes('');
      setMode('idle');
    },
    onError: (e) => {
      toast.error('Error', e instanceof ApiError ? e.message : 'No se pudo confirmar');
    },
  });

  const skipMut = useMutation({
    mutationFn: async () => {
      if (!order) return;
      if (!notes.trim()) throw new Error('Necesitas un motivo.');
      return apiRequest({
        method: 'POST',
        url: `/api/mobile/routes/orders/${order.id}/skip`,
        data: { notes: notes.trim() },
      });
    },
    onSuccess: () => {
      toast.warning('Marcada como no entregada');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setMode('idle');
      setNotes('');
    },
    onError: (e) => {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo marcar');
    },
  });

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
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
          {/* Hero */}
          <View
            className="overflow-hidden px-5 pb-16"
            style={{
              backgroundColor: brand.brand,
              paddingTop: insets.top + 12,
            }}
          >
            <HeaderPattern color={brand.brandFg} intensity={1.0} />
            <Animated.View entering={FadeInDown.duration(220)}>
              <View className="flex-row items-center justify-between">
                <Pressable
                  haptic="selection"
                  onPress={safeBack}
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
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
                  Pedido
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <View className="mt-6">
                <View className="flex-row items-center gap-3">
                  <Text
                    style={{
                      color: brand.brandFg,
                      fontFamily: Fonts.semibold,
                      fontSize: 32,
                      lineHeight: 42,
                      letterSpacing: -0.7,
                      includeFontPadding: false,
                    } as never}
                  >
                    {order?.order_number ?? '—'}
                  </Text>
                  {order ? (
                    <View
                      className="px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                    >
                      <Text
                        style={{
                          color: brand.brandFg,
                          fontFamily: Fonts.medium,
                          fontSize: 10,
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                          includeFontPadding: false,
                        } as never}
                      >
                        {order.status === 'delivered'
                          ? 'Entregada'
                          : order.status === 'cancelled'
                            ? 'Cancelada'
                            : order.status === 'in_route'
                              ? 'En ruta'
                              : 'Pendiente'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {order ? (
                  <Text
                    style={{
                      color: brand.brandFg,
                      opacity: 0.78,
                      fontFamily: Fonts.regular,
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  >
                    {formatDay(order.created_at)}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          </View>

          {isLoading || !order ? (
            <View className="px-5 mt-6 gap-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </View>
          ) : (
            <>
              {/* Flujo de entrega */}
              <Animated.View entering={FadeInUp.delay(80).duration(220)} className="mx-5" style={{ marginTop: -36 }}>
                <Card variant="elevated" padding="lg">
                  <Text variant="overline" tone="brand">
                    Flujo de entrega
                  </Text>
                  {/* Steps */}
                  <View className="flex-row gap-2 mt-3">
                    {STEPS.map((s, i) => {
                      const reached = order.status === 'cancelled'
                        ? i === 0
                        : i <= stepIndex;
                      return (
                        <View key={s.id} style={{ flex: 1 }}>
                          <View
                            style={{
                              height: 4,
                              borderRadius: 999,
                              backgroundColor: reached ? brand.brand : colors.bgMuted,
                            }}
                          />
                          <Text
                            style={{
                              fontFamily: Fonts.medium,
                              fontSize: 10,
                              color: reached ? brand.brand : colors.fgSubtle,
                              letterSpacing: 0.6,
                              textTransform: 'uppercase',
                              marginTop: 6,
                              includeFontPadding: false,
                            } as never}
                            numberOfLines={1}
                          >
                            {s.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* Acciones */}
                  {!isResolved ? (
                    <View className="mt-4 gap-2">
                      {mode === 'idle' ? (
                        <>
                          {order.status === 'pending' ? (
                            <Button
                              variant="secondary"
                              leftIcon={<Truck size={16} color={brand.brand} strokeWidth={1.8} />}
                              onPress={() => startMut.mutate()}
                              loading={startMut.isPending}
                            >
                              Iniciar ruta
                            </Button>
                          ) : null}
                          <Button onPress={() => setMode('deliver')}>
                            Confirmar entrega
                          </Button>
                          <Button variant="ghost" onPress={() => setMode('skip')}>
                            Anular
                          </Button>
                        </>
                      ) : mode === 'deliver' ? (
                        <>
                          <Text variant="caption" tone="muted" className="mb-1">
                            Monto cobrado (opcional)
                          </Text>
                          <View className="flex-row gap-2">
                            <TextInput
                              value={paid}
                              onChangeText={setPaid}
                              placeholder="0"
                              keyboardType="numeric"
                              placeholderTextColor={colors.fgSubtle}
                              style={{
                                flex: 1,
                                height: 44,
                                paddingHorizontal: 14,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.bg,
                                color: colors.fg,
                                fontFamily: Fonts.medium,
                                fontSize: 15,
                              }}
                            />
                            <View className="flex-row overflow-hidden" style={{ borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                              {(['cash', 'transfer'] as const).map((m) => {
                                const active = method === m;
                                return (
                                  <Pressable
                                    key={m}
                                    haptic="selection"
                                    onPress={() => setMethod(m)}
                                    style={{
                                      paddingHorizontal: 12,
                                      height: 42,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: active ? brand.brand : 'transparent',
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: Fonts.medium,
                                        fontSize: 11,
                                        color: active ? brand.brandFg : colors.fgMuted,
                                        letterSpacing: 0.3,
                                        includeFontPadding: false,
                                      } as never}
                                    >
                                      {m === 'cash' ? 'EFECT.' : 'TRANSF.'}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                          <Button onPress={() => deliverMut.mutate()} loading={deliverMut.isPending}>
                            Confirmar entrega
                          </Button>
                          <Button variant="ghost" onPress={() => setMode('idle')}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Text variant="caption" tone="muted">
                            Motivo
                          </Text>
                          <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Cliente no estaba, dirección incorrecta…"
                            placeholderTextColor={colors.fgSubtle}
                            multiline
                            style={{
                              minHeight: 80,
                              padding: 12,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                              color: colors.fg,
                              fontFamily: Fonts.regular,
                              fontSize: 14,
                              textAlignVertical: 'top',
                            }}
                          />
                          <Button
                            variant="danger"
                            onPress={() => skipMut.mutate()}
                            loading={skipMut.isPending}
                          >
                            Anular pedido
                          </Button>
                          <Button variant="ghost" onPress={() => setMode('idle')}>
                            Volver
                          </Button>
                        </>
                      )}
                    </View>
                  ) : null}
                </Card>
              </Animated.View>

              {/* Productos */}
              <Animated.View entering={FadeInUp.delay(140).duration(220)} className="mx-5 mt-3">
                <Card variant="outlined" padding="none">
                  <View className="flex-row items-baseline justify-between px-4 pt-4 pb-2">
                    <Text variant="overline" tone="subtle">
                      Productos
                    </Text>
                    <Text variant="caption" tone="muted">
                      {order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  {(order.items ?? []).map((it, i, arr) => (
                    <View
                      key={it.id}
                      style={
                        i < arr.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                          : undefined
                      }
                      className="flex-row items-center gap-3 px-4 py-3"
                    >
                      {it.product?.image ? (
                        <Image
                          source={{ uri: it.product.image }}
                          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bgMuted }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: colors.bgMuted,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Package size={18} color={colors.fgSubtle} strokeWidth={1.6} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {it.product?.name ?? '—'}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {formatCLP(Number(it.unit_price))} × {Number(it.quantity)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 14,
                          color: colors.fg,
                          fontVariant: ['tabular-nums'],
                          includeFontPadding: false,
                        } as never}
                      >
                        {formatCLP(Number(it.subtotal))}
                      </Text>
                    </View>
                  ))}
                </Card>
              </Animated.View>

              {/* Resumen */}
              <Animated.View entering={FadeInUp.delay(200).duration(220)} className="mx-5 mt-3">
                <Card variant="outlined" padding="lg">
                  <Text variant="overline" tone="subtle">
                    Resumen
                  </Text>
                  <SummaryRow label="Subtotal" value={formatCLP(subtotal)} />
                  <SummaryRow label="Impuestos" value={formatCLP(tax)} />
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
                  <SummaryRow label="Total" value={formatCLP(total)} bold />
                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
                  <SummaryRow label="Pagado" value={formatCLP(amountPaid)} accent={colors.success} />
                  {pending > 0 ? (
                    <SummaryRow label="Saldo pendiente" value={formatCLP(pending)} accent={colors.danger} />
                  ) : null}
                </Card>
              </Animated.View>

              {/* Cliente */}
              {order.client ? (
                <Animated.View entering={FadeInUp.delay(260).duration(220)} className="mx-5 mt-3">
                  <Card variant="outlined" padding="lg">
                    <Text variant="overline" tone="subtle" className="mb-3">
                      Cliente
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: brand.brandSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UserIcon size={20} color={brand.brand} strokeWidth={1.6} />
                      </View>
                      <View className="flex-1">
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {order.client.name}
                        </Text>
                        {order.client.phone ? (
                          <Text variant="caption" tone="muted">
                            {order.client.phone}
                          </Text>
                        ) : null}
                        {order.client.address ? (
                          <Text variant="caption" tone="muted" numberOfLines={2}>
                            {order.client.address}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              ) : null}

              {/* Repartidor */}
              {order.driver ? (
                <Animated.View entering={FadeInUp.delay(320).duration(220)} className="mx-5 mt-3">
                  <Card variant="outlined" padding="lg">
                    <Text variant="overline" tone="subtle" className="mb-3">
                      Repartidor
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: colors.bgMuted,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Truck size={20} color={colors.fgMuted} strokeWidth={1.6} />
                      </View>
                      <View className="flex-1">
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {order.driver.name}
                        </Text>
                        <Text variant="caption" tone="muted">
                          Asignado a esta entrega
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View className="flex-row items-center justify-between" style={{ paddingVertical: 4 }}>
      <Text
        style={{
          fontFamily: bold ? Fonts.semibold : Fonts.regular,
          fontSize: bold ? 14 : 13,
          color: colors.fgMuted,
          includeFontPadding: false,
        } as never}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: bold ? Fonts.semibold : Fonts.medium,
          fontSize: bold ? 18 : 14,
          color: accent ?? colors.fg,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        } as never}
      >
        {value}
      </Text>
    </View>
  );
}
