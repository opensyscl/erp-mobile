import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomSheet } from '~/components/AppBottomSheet';

import { toast } from '~/components/Toast';
import { AvatarGroup, Button, Card, Input, Pressable, Skeleton, Text } from '~/components/ui';
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
  image_url: string | null;
}

interface SearchResp {
  data: SearchProduct[];
  meta: { total: number };
}

async function searchProducts(query: string, categoryId: number | null): Promise<SearchResp> {
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (categoryId !== null) params.set('category_id', String(categoryId));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<SearchResp>({
    method: 'GET',
    url: `/api/mobile/products${qs}`,
  });
}

interface PosCategory {
  id: number;
  name: string;
  count: number;
}

async function fetchCategories(): Promise<PosCategory[]> {
  const res = await apiRequest<{ data: PosCategory[] }>({
    method: 'GET',
    url: '/api/mobile/products/categories',
  });
  return res.data;
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
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const checkoutRef = useRef<BottomSheetModalType>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['pos', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const categories = categoriesData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['pos', 'search', query, categoryId],
    queryFn: () => searchProducts(query, categoryId),
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
        image_url: p.image_url,
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

        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 0, gap: 6 }}
            style={{ marginHorizontal: -16 }}
          >
            <View style={{ width: 16 }} />
            <CategoryPill
              label="Todos"
              active={categoryId === null}
              onPress={() => setCategoryId(null)}
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                label={c.name}
                count={c.count}
                active={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
            <View style={{ width: 16 }} />
          </ScrollView>
        ) : null}
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

      {/* Sticky cart bar — encima del tab bar fijo (alto ~54px + safe area) */}
      {items.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: insets.bottom + 66,
            backgroundColor: colors.fg,
            borderRadius: 18,
            ...shadows.lg,
          }}
        >
          <Pressable
            haptic="medium"
            onPress={() => checkoutRef.current?.present()}
            className="flex-row items-center justify-between px-5"
            style={{ height: 60 }}
          >
            <View className="flex-row items-center gap-3">
              <AvatarGroup
                items={items.map((it) => ({
                  id: it.product_id,
                  photo: it.image_url,
                  name: it.name,
                  color: brand.brand,
                }))}
                max={3}
                size={30}
                overlap={10}
                ringColor={colors.fg}
              />
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
        </View>
      ) : null}

      <CheckoutSheet sheetRef={checkoutRef} />
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
      className={`rounded-2xl bg-bg-elevated px-3 py-2 flex-row items-center gap-2.5 ${isOut ? 'opacity-50' : ''}`}
      style={{
        borderColor: cartItem ? brand.brand : colors.border,
        borderWidth: cartItem ? 1.5 : 1,
      }}
    >
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: colors.bgMuted,
          }}
          contentFit="cover"
          transition={120}
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
          <Text style={{ fontFamily: Fonts.semibold, fontSize: 12, color: colors.fgSubtle }}>
            {product.name[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1 min-w-0">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: Fonts.medium,
            fontSize: 13,
            lineHeight: 17,
            color: colors.fg,
            letterSpacing: -0.1,
            includeFontPadding: false,
          } as never}
        >
          {product.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: Fonts.regular,
            fontSize: 11,
            lineHeight: 15,
            color: colors.fgSubtle,
            marginTop: 1,
            includeFontPadding: false,
          } as never}
        >
          {product.sku || '—'} · stock {product.stock}
        </Text>
      </View>
      <View className="items-end" style={{ minWidth: 64 }}>
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: 13,
            lineHeight: 17,
            letterSpacing: -0.2,
            color: colors.fg,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never}
        >
          {formatCLP(product.price)}
        </Text>
        {cartItem ? (
          <View className="flex-row items-center gap-1.5 mt-1">
            <Pressable
              haptic="selection"
              onPress={(e) => {
                e.stopPropagation?.();
                setQty(product.id, cartItem.quantity - 1);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgMuted,
              }}
            >
              <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: colors.fg }}>−</Text>
            </Pressable>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 12,
                color: brand.brand,
                minWidth: 14,
                textAlign: 'center',
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {cartItem.quantity}
            </Text>
            <Pressable
              haptic="selection"
              onPress={(e) => {
                e.stopPropagation?.();
                setQty(product.id, cartItem.quantity + 1);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: brand.brand,
              }}
            >
              <Plus size={11} color={brand.brandFg} />
            </Pressable>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 10,
              lineHeight: 14,
              color: isOut ? colors.danger : colors.fgSubtle,
              marginTop: 2,
              includeFontPadding: false,
            } as never}
          >
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

function CheckoutSheet({ sheetRef }: { sheetRef: React.RefObject<BottomSheetModalType | null> }) {
  const onClose = () => sheetRef.current?.dismiss();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const router = useRouter();
  const queryClient = useQueryClient();

  const items = useCartStore((s) => s.items);
  const totals = useCartStore((s) => s.totals)();
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('cash');
  const [paid, setPaid] = useState('');
  const [error, setError] = useState<string | null>(null);

  // IVA breakdown: precios incluyen IVA, calculamos neto y tax.
  const TAX_RATE = 0.19;
  const totalGross = totals.total;
  const netSubtotal = Math.round(totalGross / (1 + TAX_RATE));
  const taxAmount = totalGross - netSubtotal;

  const paidNum = Number(paid) || 0;
  const change = method === 'cash' ? Math.max(paidNum - totalGross, 0) : 0;
  const cashShortage = method === 'cash' && paidNum > 0 && paidNum < totalGross;

  // Presets de "Recibido" — exacto y los billetes CLP comunes hacia arriba del total.
  const cashPresets = (() => {
    const denominations = [1000, 2000, 5000, 10000, 20000, 50000];
    const exact = Math.ceil(totalGross / 100) * 100;
    const nextRounds = denominations
      .map((d) => Math.ceil(totalGross / d) * d)
      .filter((n) => n > exact);
    return Array.from(new Set([exact, ...nextRounds])).slice(0, 5);
  })();

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
      setError(`Falta cobrar ${formatCLP(totalGross - paidNum)}.`);
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <AppBottomSheet ref={sheetRef} snapPoints={['90%']} scroll>
      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        {/* Title */}
        <View>
          <Text variant="overline" tone="subtle">Cobro</Text>
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 22,
              lineHeight: 28,
              letterSpacing: -0.5,
              color: colors.fg,
              marginTop: 2,
              includeFontPadding: false,
            } as never}
          >
            Confirmar venta
          </Text>
        </View>

        {/* Items list — sin nested ScrollView, va dentro del BottomSheetScrollView */}
        <View style={{ gap: 8 }}>
          {items.map((it) => (
            <View
              key={it.product_id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: colors.bgSubtle,
                borderRadius: 12,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 14,
                    color: colors.fg,
                    includeFontPadding: false,
                  } as never}
                >
                  {it.name}
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.regular,
                    fontSize: 11,
                    color: colors.fgSubtle,
                    marginTop: 2,
                    includeFontPadding: false,
                  } as never}
                >
                  {formatCLP(it.unit_price)} × {it.quantity} = {formatCLP(it.unit_price * it.quantity)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Pressable
                  haptic="selection"
                  onPress={() => setQty(it.product_id, it.quantity - 1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bgElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.fg, fontFamily: Fonts.medium, fontSize: 16 }}>−</Text>
                </Pressable>
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 14,
                    color: colors.fg,
                    minWidth: 20,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                    includeFontPadding: false,
                  } as never}
                >
                  {it.quantity}
                </Text>
                <Pressable
                  haptic="selection"
                  onPress={() => setQty(it.product_id, it.quantity + 1)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: brand.brand,
                  }}
                >
                  <Plus size={12} color={brand.brandFg} />
                </Pressable>
              </View>
              <Pressable
                haptic="selection"
                onPress={() => remove(it.product_id)}
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.fgSubtle, fontSize: 18, includeFontPadding: false } as never}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Total breakdown */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 14,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: colors.fgMuted }}>Subtotal neto</Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: colors.fgMuted, fontVariant: ['tabular-nums'] }}>
              {formatCLP(netSubtotal)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: colors.fgMuted }}>IVA 19%</Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: colors.fgMuted, fontVariant: ['tabular-nums'] }}>
              {formatCLP(taxAmount)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: colors.fg }}>
              Total
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 30,
                lineHeight: 36,
                letterSpacing: -1,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              } as never}
            >
              {formatCLP(totalGross)}
            </Text>
          </View>
        </View>

        {/* Método de pago */}
        <View>
          <Text variant="overline" tone="subtle" style={{ marginBottom: 8 }}>
            Método de pago
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PAYMENT_METHODS.map((p) => {
              const active = method === p.id;
              return (
                <Pressable
                  key={p.id}
                  haptic="selection"
                  onPress={() => setMethod(p.id)}
                  style={{
                    height: 36,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    justifyContent: 'center',
                    backgroundColor: active ? colors.fg : colors.bgSubtle,
                    borderWidth: 1,
                    borderColor: active ? colors.fg : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      color: active ? colors.bg : colors.fg,
                      includeFontPadding: false,
                    } as never}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recibido + Vuelto (solo efectivo) */}
        {method === 'cash' ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="overline" tone="subtle">Recibido</Text>
              {cashShortage ? (
                <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: colors.danger, includeFontPadding: false } as never}>
                  Faltan {formatCLP(totalGross - paidNum)}
                </Text>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingRight: 4 }}
            >
              {cashPresets.map((amount, idx) => {
                const active = paidNum === amount;
                return (
                  <Pressable
                    key={amount}
                    haptic="selection"
                    onPress={() => setPaid(String(amount))}
                    style={{
                      height: 32,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? colors.fg : colors.bgSubtle,
                      borderWidth: 1,
                      borderColor: active ? colors.fg : colors.border,
                    }}
                  >
                    <Text style={{
                      fontFamily: Fonts.medium,
                      fontSize: 12,
                      color: active ? colors.bg : colors.fg,
                      fontVariant: ['tabular-nums'],
                      includeFontPadding: false,
                    } as never}>
                      {idx === 0 ? 'Exacto' : formatCLP(amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={paid}
                  onChangeText={(t) => setPaid(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder={String(Math.round(totalGross))}
                  placeholderTextColor={colors.fgSubtle}
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 22,
                    lineHeight: 28,
                    letterSpacing: -0.6,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: cashShortage ? colors.danger : colors.borderStrong,
                  }}
                />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{
                  fontFamily: Fonts.regular,
                  fontSize: 11,
                  color: colors.fgSubtle,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  includeFontPadding: false,
                } as never}>
                  Vuelto
                </Text>
                <Text style={{
                  fontFamily: Fonts.semibold,
                  fontSize: 22,
                  lineHeight: 28,
                  letterSpacing: -0.6,
                  color: change > 0 ? colors.success : colors.fgSubtle,
                  fontVariant: ['tabular-nums'],
                  marginTop: 4,
                  includeFontPadding: false,
                } as never}>
                  {formatCLP(change)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" tone="danger">{error}</Text>
        ) : null}

        {/* Action — full-width primario, sin Cancelar (drag down para cerrar) */}
        <View style={{ marginTop: 4 }}>
          <Button onPress={handleSubmit} loading={mutation.isPending} disabled={cashShortage}>
            {mutation.isPending ? 'Procesando…' : `Cobrar ${formatCLP(totalGross)}`}
          </Button>
        </View>
      </View>
    </AppBottomSheet>
  );
}

// Suprimir lint warning de iconos no usados directamente
void ShoppingCart;

/* ─────────────────────── CategoryPill ─────────────────────── */

function CategoryPill({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: active ? colors.fg : colors.bgElevated,
        borderWidth: 1,
        borderColor: active ? colors.fg : colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 12,
          lineHeight: 16,
          color: active ? colors.bg : colors.fg,
          letterSpacing: -0.1,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 10,
            lineHeight: 14,
            color: active ? colors.bg : colors.fgSubtle,
            opacity: active ? 0.7 : 1,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
