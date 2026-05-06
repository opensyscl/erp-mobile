import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdjustStockSheet } from '~/components/AdjustStockSheet';
import { Badge, Button, Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest, ApiError } from '~/lib/api';
import { ArrowLeft, Package, Plus, ScanLine } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface ProductDetail {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  image_url: string | null;
  status: 'ok' | 'low' | 'out';
  is_active: boolean;
}

async function fetchProduct(id: string): Promise<ProductDetail> {
  const res = await apiRequest<{ data: ProductDetail }>({
    method: 'GET',
    url: `/api/mobile/products/${id}`,
  });
  return res.data;
}

function formatCLP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CL');
}

const statusMeta = {
  ok: { label: 'En stock', tone: 'success' as const },
  low: { label: 'Stock bajo', tone: 'warning' as const },
  out: { label: 'Sin stock', tone: 'danger' as const },
};

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => fetchProduct(params.id),
    enabled: !!params.id,
  });

  const apiErr = error instanceof ApiError ? error : null;
  const notFound = apiErr?.status === 404;

  const margin =
    data && data.price > 0
      ? Math.round(((data.price - data.cost) / data.price) * 100 * 10) / 10
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          haptic="selection"
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-bg-elevated border border-border"
        >
          <ArrowLeft size={18} color={colors.fg} />
        </Pressable>
        <Text variant="overline" tone="subtle">
          Producto
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <SkeletonState />
        ) : notFound ? (
          <ErrorState
            title="Producto no encontrado"
            message="Es posible que haya sido archivado o eliminado."
          />
        ) : isError ? (
          <ErrorState
            title="No pudimos cargar este producto"
            message={apiErr?.message ?? 'Reintenta en un momento.'}
          />
        ) : data ? (
          <>
            {/* Hero imagen */}
            <Animated.View
              entering={FadeInDown.duration(360)}
              style={{
                aspectRatio: 1.2,
                backgroundColor: colors.bgMuted,
                marginHorizontal: 20,
                marginTop: 16,
                borderRadius: 24,
                overflow: 'hidden',
              }}
            >
              {data.image_url ? (
                <Image
                  source={{ uri: data.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={240}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Package size={48} color={colors.fgSubtle} />
                </View>
              )}
            </Animated.View>

            {/* Title block */}
            <Animated.View entering={FadeInDown.delay(80).duration(360)} className="px-5 mt-6">
              {data.category ? (
                <Badge variant="brand">{data.category}</Badge>
              ) : null}
              <Text variant="title" className="mt-3">
                {data.name}
              </Text>
              {data.description ? (
                <Text variant="body" tone="muted" className="mt-2">
                  {data.description}
                </Text>
              ) : null}

              <View className="flex-row items-baseline gap-3 mt-4">
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 30,
                lineHeight: 40,
                    letterSpacing: -1,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCLP(data.price)}
                </Text>
                <Text variant="caption" tone="subtle">
                  costo {formatCLP(data.cost)} · {margin}% margen
                </Text>
              </View>
            </Animated.View>

            {/* Stock card */}
            <Animated.View entering={FadeInDown.delay(140).duration(360)} className="mx-5 mt-6">
              <Card variant="outlined" padding="lg">
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text variant="overline" tone="subtle">
                      Stock disponible
                    </Text>
                    <View className="flex-row items-baseline gap-2 mt-2">
                      <Text
                        style={{
                          fontFamily: Fonts.medium,
                          fontSize: 36,
                          letterSpacing: -1.2,
                          color: colors.fg,
                          fontVariant: ['tabular-nums'],
                          lineHeight: 40,
                        }}
                      >
                        {data.stock}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {data.stock === 1 ? 'unidad' : 'unidades'}
                      </Text>
                    </View>
                    {data.min_stock > 0 ? (
                      <Text variant="caption" tone="muted" className="mt-1">
                        Mínimo configurado: {data.min_stock}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <View
                      className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${data.status === 'ok' ? 'bg-success/12' : data.status === 'low' ? 'bg-warning/15' : 'bg-danger/12'}`}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            data.status === 'ok'
                              ? colors.success
                              : data.status === 'low'
                                ? colors.warning
                                : colors.danger,
                        }}
                      />
                      <Text
                        variant="caption"
                        tone={statusMeta[data.status].tone}
                        style={{ fontFamily: Fonts.medium }}
                      >
                        {statusMeta[data.status].label}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Identifiers */}
            <Animated.View entering={FadeInDown.delay(200).duration(360)} className="mx-5 mt-3">
              <Card variant="outlined" padding="none">
                <Row label="SKU" value={data.sku || '—'} />
                <Divider color={colors.border} />
                <Row label="Código de barras" value={data.barcode || '—'} mono />
                <Divider color={colors.border} />
                <Row label="Estado" value={data.is_active ? 'Activo' : 'Archivado'} />
              </Card>
            </Animated.View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.delay(280).duration(360)} className="mx-5 mt-5 gap-3">
              <Button
                leftIcon={<Plus size={16} color={brand.brandFg} />}
                onPress={() => setAdjustOpen(true)}
              >
                Ajustar stock
              </Button>
              <Button variant="secondary" leftIcon={<ScanLine size={16} color={colors.fg} />}>
                Vender este producto
              </Button>
            </Animated.View>
          </>
        ) : null}
      </ScrollView>

      {data ? (
        <AdjustStockSheet
          visible={adjustOpen}
          productId={data.id}
          productName={data.name}
          currentStock={data.stock}
          onClose={() => setAdjustOpen(false)}
        />
      ) : null}
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: mono ? Fonts.regular : Fonts.medium,
          fontSize: 14,
          letterSpacing: mono ? 0.3 : -0.2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginHorizontal: 0 }} />;
}

function SkeletonState() {
  return (
    <View>
      <Skeleton style={{ aspectRatio: 1.2, marginHorizontal: 20, marginTop: 16, borderRadius: 24 }} />
      <View className="px-5 mt-6 gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-9 w-1/2 mt-2" />
      </View>
      <View className="mx-5 mt-6">
        <Skeleton className="h-32 w-full rounded-xl" />
      </View>
    </View>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-10 pt-24">
      <Text variant="headline" className="text-center">
        {title}
      </Text>
      <Text variant="body" tone="muted" className="mt-2 text-center">
        {message}
      </Text>
    </View>
  );
}
