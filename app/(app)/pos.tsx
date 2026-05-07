import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '~/components/Toast';
import { Button, Card, Input, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft, Plus, Search, ShoppingCart } from '~/lib/icons';
import { useCartStore } from '~/stores/cart';
import { Fonts } from '~/theme/fonts';
import { palette, shadows } from '~/theme/tokens';

interface SearchProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
  status: 'ok' | 'low' | 'out';
}

interface SearchResp {
  data: SearchProduct[];
  meta: { total: number };
}

async function searchProducts(query: string): Promise<SearchResp> {
  const qs = query ? `?search=${encodeURIComponent(query)}` : '';
  return apiRequest<SearchResp>({
    method: 'GET',
    url: `/api/mobile/products${qs}`,
  });
}

interface CreateSaleResponse {
  data: {
    id: number;
    total: number;
    paid: number;
    change: number;
    items_count: number;
  };
}

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export default function PosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const items = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.add);
  const totals = useCartStore((s) => s.totals)();
  const clearCart = useCartStore((s) => s.clear);

  const [query, setQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pos', 'search', query],
    queryFn: () => searchProducts(query),
  });

  const products = data?.data ?? [];

  const handleAdd = (p: SearchProduct) => {
    if (p.status === 'out') return;
    void Haptics.selectionAsync();
    addToCart(
      {
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        unit_price: p.price,
      },
      1,
    );
  };

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
            onPress={() => {
              if (items.length > 0) {
                clearCart();
              }
              router.back();
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-subtle border border-border"
          >
            <ArrowLeft size={18} color={colors.fg} />
          </Pressable>
          <Text variant="overline" tone="subtle">
            Nueva venta
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-3">
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar producto, SKU…"
            leftIcon={<Search size={16} color={colors.fgSubtle} />}
            autoFocus
          />
        </View>
      </View>

      {/* Lista de productos */}
      {isLoading && products.length === 0 ? (
        <View className="px-5 pt-4 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 200,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => <PosProductRow product={item} onAdd={() => handleAdd(item)} />}
          ListEmptyComponent={
            <View className="px-6 pt-16 items-center">
              <Text variant="headline">Nada encontrado</Text>
              <Text variant="body" tone="muted" className="mt-2 text-center">
                Prueba con otra búsqueda o escanea un código.
              </Text>
            </View>
          }
        />
      )}

      {/* Sticky cart bar */}
      {items.length > 0 ? (
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: insets.bottom + 12,
            backgroundColor: colors.fg,
            borderRadius: 18,
            ...shadows.lg,
          }}
        >
          <Pressable
            haptic="medium"
            onPress={() => setCheckoutOpen(true)}
            className="flex-row items-center justify-between px-5"
            style={{ height: 60 }}
          >
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: brand.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: brand.brandFg, fontFamily: Fonts.semibold, fontSize: 13 }}>
                  {totals.count}
                </Text>
              </View>
              <View>
                <Text style={{ color: colors.bg, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                  En el carrito
                </Text>
                <Text
                  style={{
                    color: colors.bgElevated,
                    fontFamily: Fonts.semibold,
                    fontSize: 16,
                    letterSpacing: -0.4,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCLP(totals.total)}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.bgElevated, fontFamily: Fonts.medium, fontSize: 14, letterSpacing: -0.2 }}>
              Cobrar →
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <CheckoutSheet visible={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </View>
  );
}

function PosProductRow({ product, onAdd }: { product: SearchProduct; onAdd: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const cartItem = useCartStore((s) => s.items.find((i) => i.product_id === product.id));
  const setQty = useCartStore((s) => s.setQty);

  const isOut = product.status === 'out';

  return (
    <Pressable
      onPress={onAdd}
      disabled={isOut}
      haptic="none"
      className={`rounded-xl border bg-bg-elevated p-3.5 flex-row items-center gap-3 ${isOut ? 'opacity-50' : 'border-border'}`}
      style={{ borderColor: cartItem ? brand.brand : colors.border, borderWidth: cartItem ? 1.5 : 1 }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: colors.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: Fonts.semibold, fontSize: 13, color: colors.fgSubtle }}>
          {product.name[0]?.toUpperCase()}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </Text>
        <Text
          variant="caption"
          tone="subtle"
          style={{ fontFamily: Fonts.regular }}
        >
          {product.sku || '—'} · stock {product.stock}
        </Text>
      </View>
      <View className="items-end">
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 14,
            letterSpacing: -0.2,
            color: colors.fg,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCLP(product.price)}
        </Text>
        {cartItem ? (
          <View className="flex-row items-center gap-2 mt-1">
            <Pressable
              haptic="selection"
              onPress={(e) => {
                e.stopPropagation?.();
                setQty(product.id, cartItem.quantity - 1);
              }}
              className="h-7 w-7 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.bgMuted }}
            >
              <Text style={{ fontFamily: Fonts.medium, color: colors.fg }}>−</Text>
            </Pressable>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 13,
                color: brand.brand,
                minWidth: 16,
                textAlign: 'center',
                fontVariant: ['tabular-nums'],
              }}
            >
              {cartItem.quantity}
            </Text>
            <Pressable
              haptic="selection"
              onPress={(e) => {
                e.stopPropagation?.();
                setQty(product.id, cartItem.quantity + 1);
              }}
              className="h-7 w-7 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.brand }}
            >
              <Plus size={12} color={brand.brandFg} />
            </Pressable>
          </View>
        ) : (
          <Text variant="caption" tone={isOut ? 'danger' : 'subtle'} className="mt-0.5">
            {isOut ? 'sin stock' : 'tap +'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const PAYMENT_METHODS: { id: 'cash' | 'debit' | 'credit' | 'transfer'; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'debit', label: 'Débito' },
  { id: 'credit', label: 'Crédito' },
  { id: 'transfer', label: 'Transferencia' },
];

function CheckoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const router = useRouter();
  const queryClient = useQueryClient();

  const items = useCartStore((s) => s.items);
  const totals = useCartStore((s) => s.totals)();
  const clear = useCartStore((s) => s.clear);

  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('cash');
  const [paid, setPaid] = useState('');
  const [error, setError] = useState<string | null>(null);

  const paidNum = Number(paid) || 0;
  const change = method === 'cash' ? Math.max(paidNum - totals.total, 0) : 0;
  const cashShortage = method === 'cash' && paidNum > 0 && paidNum < totals.total;

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest<CreateSaleResponse>({
        method: 'POST',
        url: '/api/mobile/sales',
        data: {
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
          payment_method: method,
          paid: method === 'cash' ? paidNum || totals.total : totals.total,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['kpis', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const total = res.data.total;
      const itemsCount = res.data.items_count;
      clear();
      onClose();
      router.back(); // Volver a Home
      toast.success(
        'Venta confirmada',
        `${itemsCount} ${itemsCount === 1 ? 'producto' : 'productos'} · ${formatCLP(total)}`,
      );
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        const firstField = err.errors ? Object.values(err.errors)[0] : null;
        const firstMsg = Array.isArray(firstField) ? firstField[0] : null;
        const msg = firstMsg ?? err.message ?? 'No pudimos crear la venta.';
        setError(msg);
        toast.error('No se pudo cobrar', msg);
      } else {
        setError('No pudimos crear la venta.');
        toast.error('No se pudo cobrar');
      }
    },
  });

  const handleSubmit = () => {
    if (cashShortage) {
      setError(`Falta cobrar ${formatCLP(totals.total - paidNum)}.`);
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
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
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>

          <Text variant="overline" tone="brand">
            Cobro
          </Text>

          {/* Total */}
          <View
            style={{
              backgroundColor: colors.bgSubtle,
              borderRadius: 16,
              padding: 16,
              marginTop: 12,
            }}
          >
            <Text variant="caption" tone="muted">
              {items.length} {items.length === 1 ? 'producto' : 'productos'} · {totals.count} unidades
            </Text>
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 36,
                lineHeight: 42,
                letterSpacing: -1.2,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
                marginTop: 4,
              }}
            >
              {formatCLP(totals.total)}
            </Text>
          </View>

          {/* Métodos de pago */}
          <Text variant="overline" tone="subtle" className="mt-5 mb-2">
            Método
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PAYMENT_METHODS.map((p) => {
              const active = method === p.id;
              return (
                <Pressable
                  key={p.id}
                  haptic="selection"
                  onPress={() => setMethod(p.id)}
                  className="rounded-full px-3.5"
                  style={{
                    height: 32,
                    justifyContent: 'center',
                    backgroundColor: active ? colors.brand : colors.bgMuted,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 12,
                      letterSpacing: -0.1,
                      color: active ? brand.brandFg : colors.fgMuted,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recibido + Vuelto (solo efectivo) */}
          {method === 'cash' ? (
            <View className="flex-row gap-3 mt-5">
              <View style={{ flex: 1 }}>
                <Text variant="overline" tone="subtle">
                  Recibido
                </Text>
                <TextInput
                  value={paid}
                  onChangeText={(t) => setPaid(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder={String(Math.round(totals.total))}
                  placeholderTextColor={colors.fgSubtle}
                  style={{
                    marginTop: 6,
                    fontFamily: Fonts.medium,
                    fontSize: 22,
                lineHeight: 30,
                    letterSpacing: -0.6,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderStrong,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="overline" tone="subtle">
                  Vuelto
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    fontFamily: Fonts.medium,
                    fontSize: 22,
                lineHeight: 30,
                    letterSpacing: -0.6,
                    color: change > 0 ? colors.success : colors.fgSubtle,
                    fontVariant: ['tabular-nums'],
                    paddingVertical: 6,
                  }}
                >
                  {formatCLP(change)}
                </Text>
              </View>
            </View>
          ) : null}

          {error ? (
            <Text variant="caption" tone="danger" className="mt-3">
              {error}
            </Text>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <View style={{ flex: 1 }}>
              <Button variant="secondary" onPress={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
            </View>
            <View style={{ flex: 1.4 }}>
              <Button onPress={handleSubmit} loading={mutation.isPending}>
                {`Confirmar ${formatCLP(totals.total)}`}
              </Button>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Suprimir lint warning de iconos no usados directamente
void ShoppingCart;
