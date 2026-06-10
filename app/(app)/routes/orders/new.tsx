import { BottomSheetScrollView, BottomSheetTextInput, type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomSheet } from '~/components/AppBottomSheet';
import { toast } from '~/components/Toast';
import { Button, Card, Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useSafeBack } from '~/hooks/useSafeBack';
import { ApiError, apiRequest } from '~/lib/api';
import { queryKeys } from '~/lib/queryKeys';
import { ArrowLeft, Plus, Search } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

interface ClientItem {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
}

interface DriverItem {
  id: number;
  name: string;
  is_on_route: boolean;
}

interface ProductItem {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
}

interface OrderLine {
  product: ProductItem;
  quantity: number;
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export default function NewRouteOrderScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const queryClient = useQueryClient();
  const safeBack = useSafeBack('/(app)/routes/orders');

  const me = useAuthStore((s) => s.user);
  const isDriverRole = me?.role === 'tenant_driver';

  const [client, setClient] = useState<ClientItem | null>(null);
  // Si el user es repartidor, él mismo es el driver del pedido (no puede
  // asignar a otro). Si es admin/manager, elige desde el sheet.
  const [driver, setDriver] = useState<DriverItem | null>(
    isDriverRole && me
      ? { id: me.id, name: me.name, is_on_route: false }
      : null,
  );

  // Auto-seguir-asignándolo si el user cambia (logout/login)
  useEffect(() => {
    if (isDriverRole && me) {
      setDriver({ id: me.id, name: me.name, is_on_route: false });
    }
  }, [isDriverRole, me?.id, me?.name]);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState('');

  const clientSheet = useRef<BottomSheetModalType>(null);
  const driverSheet = useRef<BottomSheetModalType>(null);
  const productSheet = useRef<BottomSheetModalType>(null);

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.quantity, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  const { data: drivers } = useQuery({
    queryKey: queryKeys.routes.drivers,
    queryFn: () =>
      apiRequest<{ data: DriverItem[] }>({
        method: 'GET',
        url: '/api/mobile/routes/drivers',
      }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!client || !driver || lines.length === 0) {
        throw new Error('Falta cliente, driver o productos.');
      }
      return apiRequest({
        method: 'POST',
        url: '/api/mobile/routes/orders',
        data: {
          client_id: client.id,
          driver_id: driver.id,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({
            product_id: l.product.id,
            quantity: l.quantity,
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success('Pedido creado');
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.adminDashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.fleet });
      safeBack();
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error(msg);
    },
  });

  const canSubmit = client !== null && driver !== null && lines.length > 0 && !create.isPending;

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
          Nuevo Pedido
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 220 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(360)}>
            <Text variant="caption" tone="muted">
              Crea una entrega
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
              Nuevo Pedido
            </Text>
          </Animated.View>

          {/* Cliente */}
          <Animated.View entering={FadeInDown.delay(60).duration(360)} className="mt-5">
            <Text variant="overline" tone="subtle" className="mb-2">
              Cliente
            </Text>
            <PickerRow
              placeholder="Seleccionar cliente"
              value={client?.name}
              sub={client?.address ?? client?.phone ?? undefined}
              onPress={() => clientSheet.current?.present()}
            />
          </Animated.View>

          {/* Driver — auto-asignado si el user logueado ES el repartidor */}
          <Animated.View entering={FadeInDown.delay(120).duration(360)} className="mt-4">
            <Text variant="overline" tone="subtle" className="mb-2">
              Repartidor
            </Text>
            {isDriverRole ? (
              // Driver: card de solo-lectura mostrando que él es el asignado
              <Card padding="md">
                <View className="flex-row items-center gap-3">
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: withAlpha(brand.brand, 0.13),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: brand.brand,
                        fontFamily: Fonts.bold,
                        fontSize: 14,
                      }}
                    >
                      {(driver?.name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {driver?.name ?? 'Vos'}
                    </Text>
                    <Text variant="caption" tone="muted">
                      Asignado a vos automáticamente
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <PickerRow
                placeholder="Asignar repartidor"
                value={driver?.name}
                sub={driver?.is_on_route ? 'En ruta · sumará a su carga' : 'Disponible · creará nueva carga'}
                onPress={() => driverSheet.current?.present()}
              />
            )}
          </Animated.View>

          {/* Items */}
          <Animated.View entering={FadeInDown.delay(180).duration(360)} className="mt-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="overline" tone="subtle">
                Productos · {lines.length}
              </Text>
              <Pressable
                haptic="selection"
                onPress={() => productSheet.current?.present()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: brand.brandSubtle,
                }}
              >
                <Plus size={12} color={brand.brand} strokeWidth={2.4} />
                <Text
                  style={{
                    color: brand.brand,
                    fontFamily: Fonts.medium,
                    fontSize: 11,
                    includeFontPadding: false,
                  } as never}
                >
                  Agregar
                </Text>
              </Pressable>
            </View>
            <Card variant="outlined" padding="none">
              {lines.length === 0 ? (
                <View className="py-8 items-center">
                  <Text variant="caption" tone="muted">
                    Sin productos aún
                  </Text>
                </View>
              ) : (
                lines.map((l, i) => (
                  <View
                    key={l.product.id}
                    style={
                      i < lines.length - 1
                        ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                        : undefined
                    }
                    className="px-4 py-3 flex-row items-center gap-3"
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {l.product.name}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {formatCLP(l.product.price)} c/u
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: colors.bgMuted,
                        borderRadius: 999,
                        padding: 4,
                      }}
                    >
                      <QtyBtn
                        text="−"
                        onPress={() =>
                          setLines((cur) =>
                            cur
                              .map((c, j) => (j === i ? { ...c, quantity: c.quantity - 1 } : c))
                              .filter((c) => c.quantity > 0),
                          )
                        }
                      />
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 14,
                          minWidth: 18,
                          textAlign: 'center',
                          color: colors.fg,
                          fontVariant: ['tabular-nums'],
                          includeFontPadding: false,
                        } as never}
                      >
                        {l.quantity}
                      </Text>
                      <QtyBtn
                        text="+"
                        onPress={() =>
                          setLines((cur) =>
                            cur.map((c, j) =>
                              j === i ? { ...c, quantity: c.quantity + 1 } : c,
                            ),
                          )
                        }
                      />
                    </View>
                    <Text
                      style={{
                        fontFamily: Fonts.semibold,
                        fontSize: 14,
                        color: colors.fg,
                        minWidth: 64,
                        textAlign: 'right',
                        fontVariant: ['tabular-nums'],
                        includeFontPadding: false,
                      } as never}
                    >
                      {formatCLP(l.product.price * l.quantity)}
                    </Text>
                  </View>
                ))
              )}
            </Card>
          </Animated.View>

          {/* Notas */}
          <Animated.View entering={FadeInDown.delay(240).duration(360)} className="mt-5">
            <Text variant="overline" tone="subtle" className="mb-2">
              Notas (opcional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Indicaciones para el rutero…"
              placeholderTextColor={colors.fgSubtle}
              multiline
              style={{
                minHeight: 80,
                padding: 14,
                backgroundColor: colors.bgElevated,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.fg,
                fontFamily: Fonts.regular,
                fontSize: 14,
                lineHeight: 20,
                textAlignVertical: 'top',
              }}
            />
          </Animated.View>
        </ScrollView>

        {/* Footer total + crear */}
        <Animated.View
          entering={FadeIn.duration(280)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.bgElevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            padding: 16,
            paddingBottom: insets.bottom + 16,
            // Inverted shadow (apunta hacia arriba) — barra inferior sticky
            shadowColor: '#0a0d14',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.06,
            shadowRadius: 18,
            elevation: 6,
          }}
        >
          <View className="flex-row items-baseline justify-between mb-3">
            <Text variant="caption" tone="muted">
              Total con IVA
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 22,
                lineHeight: 30,
                letterSpacing: -0.5,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {formatCLP(total)}
            </Text>
          </View>
          <Button
            onPress={() => create.mutate()}
            disabled={!canSubmit}
            loading={create.isPending}
          >
            Crear pedido
          </Button>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Pickers (gorhom bottom-sheet — gesture-driven, sin bounce raro) */}
      <AppBottomSheet ref={clientSheet} snapPoints={['70%', '92%']}>
        <ClientPickerBody
          onPick={(c) => {
            setClient(c);
            clientSheet.current?.dismiss();
          }}
        />
      </AppBottomSheet>

      <AppBottomSheet ref={driverSheet} snapPoints={['55%']}>
        <DriverPickerBody
          drivers={drivers ?? []}
          onPick={(d) => {
            setDriver(d);
            driverSheet.current?.dismiss();
          }}
        />
      </AppBottomSheet>

      <AppBottomSheet ref={productSheet} snapPoints={['70%', '92%']}>
        <ProductPickerBody
          alreadyPicked={lines.map((l) => l.product.id)}
          onPick={(p) => {
            setLines((cur) => {
              const existing = cur.findIndex((c) => c.product.id === p.id);
              if (existing >= 0) {
                return cur.map((c, i) =>
                  i === existing ? { ...c, quantity: c.quantity + 1 } : c,
                );
              }
              return [...cur, { product: p, quantity: 1 }];
            });
          }}
        />
      </AppBottomSheet>
    </View>
  );
}

function PickerRow({
  placeholder,
  value,
  sub,
  onPress,
}: {
  placeholder: string;
  value?: string;
  sub?: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        {value ? (
          <>
            <Text variant="bodyStrong" numberOfLines={1}>
              {value}
            </Text>
            {sub ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="body" tone="muted">
            {placeholder}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 12,
          color: colors.fgMuted,
          includeFontPadding: false,
        } as never}
      >
        Elegir →
      </Text>
    </Pressable>
  );
}

function QtyBtn({ text, onPress }: { text: string; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <Pressable
      haptic="selection"
      onPress={onPress}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: colors.bgElevated,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.semibold,
          fontSize: 14,
          color: colors.fg,
          includeFontPadding: false,
        } as never}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/* ─── Picker bodies (van dentro de AppBottomSheet) ─── */

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <View
      style={{
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.bgSubtle,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Search size={16} color={colors.fgSubtle} />
      <BottomSheetTextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.fgSubtle}
        style={{
          flex: 1,
          color: colors.fg,
          fontFamily: Fonts.regular,
          fontSize: 14,
        }}
      />
    </View>
  );
}

function SheetTitle({ text }: { text: string }) {
  return (
    <View className="px-4 pb-3">
      <Text variant="bodyStrong">{text}</Text>
    </View>
  );
}

function ClientPickerBody({ onPick }: { onPick: (c: ClientItem) => void }) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 200);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.routes.clients(debouncedQ),
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
    <>
      <SheetTitle text="Elegir cliente" />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, RUT o teléfono…" />
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
      >
        {isFetching && clients.length === 0 ? (
          <Text variant="caption" tone="muted" className="text-center py-8">
            Buscando…
          </Text>
        ) : clients.length === 0 ? (
          <Text variant="caption" tone="muted" className="text-center py-8">
            Sin resultados
          </Text>
        ) : (
          clients.map((c) => (
            <Pressable
              key={c.id}
              haptic="selection"
              onPress={() => onPick(c)}
              className="py-3 border-b border-border"
            >
              <Text variant="bodyStrong" numberOfLines={1}>
                {c.name}
              </Text>
              {c.address ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {c.address}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </>
  );
}

function DriverPickerBody({
  drivers,
  onPick,
}: {
  drivers: DriverItem[];
  onPick: (d: DriverItem) => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <>
      <SheetTitle text="Elegir repartidor" />
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        {drivers.length === 0 ? (
          <Text variant="caption" tone="muted" className="text-center py-8">
            No hay repartidores
          </Text>
        ) : (
          drivers.map((d) => (
            <Pressable
              key={d.id}
              haptic="selection"
              onPress={() => onPick(d)}
              className="py-3 border-b border-border flex-row items-center justify-between"
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {d.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {d.is_on_route ? 'En ruta · sumará pedido' : 'Disponible'}
                </Text>
              </View>
              {d.is_on_route ? (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.success,
                  }}
                />
              ) : null}
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </>
  );
}

function ProductPickerBody({
  alreadyPicked,
  onPick,
}: {
  alreadyPicked: number[];
  onPick: (p: ProductItem) => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q, 200);

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.products.search(debouncedQ),
    queryFn: () =>
      apiRequest<{ data: ProductItem[] }>({
        method: 'GET',
        url: debouncedQ
          ? `/api/mobile/products?search=${encodeURIComponent(debouncedQ)}`
          : '/api/mobile/products',
      }).then((r) => r.data),
  });

  const products = data ?? [];

  return (
    <>
      <SheetTitle text="Agregar producto" />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre o SKU…" />
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
      >
        {isFetching && products.length === 0 ? (
          <Text variant="caption" tone="muted" className="text-center py-8">
            Buscando…
          </Text>
        ) : products.length === 0 ? (
          <Text variant="caption" tone="muted" className="text-center py-8">
            Sin resultados
          </Text>
        ) : (
          products.map((p) => {
            const picked = alreadyPicked.includes(p.id);
            return (
              <Pressable
                key={p.id}
                haptic="selection"
                onPress={() => onPick(p)}
                className="py-3 border-b border-border flex-row items-center gap-3"
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {p.sku ? `${p.sku} · ` : ''}stock {p.stock}
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
                  {formatCLP(p.price)}
                </Text>
                {picked ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      height: 22,
                      borderRadius: 999,
                      backgroundColor: withAlpha(colors.success, 0.13),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      variant="caption"
                      tone="success"
                      style={{ fontFamily: Fonts.medium, fontSize: 10 }}
                    >
                      +1
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        )}
      </BottomSheetScrollView>
    </>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
