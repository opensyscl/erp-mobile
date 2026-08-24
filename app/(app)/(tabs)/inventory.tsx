import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, Input, Pressable, Screen, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest } from '~/lib/api';
import { formatCLP } from '~/lib/format';
import { Filter, Package, Plus, Search } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  category_id: number | null;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  image_url: string | null;
  status: 'ok' | 'low' | 'out';
  is_active: boolean;
}

interface ProductsResponse {
  data: Product[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  counts: { all: number; low: number; out: number };
}

async function fetchProducts(params: { search: string; status: 'all' | 'low' | 'out' }): Promise<ProductsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status !== 'all') query.set('status', params.status);
  const qs = query.toString();
  return apiRequest<ProductsResponse>({
    method: 'GET',
    url: `/api/mobile/products${qs ? `?${qs}` : ''}`,
  });
}

type FilterId = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.products.list(activeFilter, search),
    queryFn: () => fetchProducts({ search, status: activeFilter }),
  });

  const items = data?.data ?? [];
  const counts = data?.counts ?? { all: 0, low: 0, out: 0 };

  const filters = [
    { id: 'all' as const, label: `Todos · ${counts.all}` },
    { id: 'low' as const, label: `Stock bajo · ${counts.low}` },
    { id: 'out' as const, label: `Sin stock · ${counts.out}` },
  ];

  return (
    <Screen edges={{ top: true, bottom: false }} padded={false}>
      <View className="px-5 pt-1 pb-3 flex-row justify-between items-center">
        <Text variant="title">Inventario</Text>
        <Pressable
          haptic="medium"
          className="h-10 w-10 rounded-full bg-brand items-center justify-center"
          style={{
            backgroundColor: brand.brand,
            boxShadow: [
              { offsetX: 0, offsetY: 4, blurRadius: 12, spreadDistance: -2, color: withAlpha(brand.brand, 0.4) },
            ],
          }}
        >
          <Plus size={18} color={brand.brandFg} strokeWidth={2} />
        </Pressable>
      </View>

      <View className="px-5 flex-row gap-2">
        <View className="flex-1">
          <Input
            variant="soft"
            placeholder="Producto, SKU o código de barras"
            value={search}
            onChangeText={setSearch}
            leftIcon={<Search size={16} color={colors.fgSubtle} />}
          />
        </View>
        <Pressable
          haptic="selection"
          className="h-13 w-13 rounded-xl bg-bg-muted items-center justify-center"
        >
          <Filter size={18} color={colors.fgMuted} />
        </Pressable>
      </View>

      <View className="px-5 mt-3 flex-row gap-2">
        {filters.map((f) => {
          const active = activeFilter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              haptic="selection"
              className={`h-8 px-3 rounded-full items-center justify-center ${active ? 'bg-fg' : 'bg-bg-elevated border border-border'}`}
            >
              <Text variant="caption" tone={active ? 'inverse' : 'muted'} className="font-semibold">
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState search={search} onClearSearch={() => setSearch('')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListHeaderComponent={
            <Text variant="overline" tone="subtle" className="mb-2">
              Mostrando {items.length} de {data?.meta.total ?? 0}
            </Text>
          }
          renderItem={({ item }) => (
            <Animated.View>
              <ProductRow product={item} />
            </Animated.View>
          )}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      )}
    </Screen>
  );
}

function ProductRow({ product }: { product: Product }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const router = useRouter();

  const statusMeta = {
    ok: { label: 'En stock', color: colors.success },
    low: { label: 'Stock bajo', color: colors.warning },
    out: { label: 'Sin stock', color: colors.danger },
  }[product.status];

  const initial = (product.name[0] ?? '·').toUpperCase();

  return (
    <Pressable
      onPress={() => router.push(`/(app)/products/${product.id}` as never)}
      haptic="selection"
      className="flex-row items-center gap-3 rounded-2xl bg-bg-elevated px-3.5 py-2.5"
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: colors.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={{ width: 44, height: 44 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Text variant="callout" tone="muted">
            {initial}
          </Text>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text variant="bodyStrong" numberOfLines={1}>
          {product.name}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusMeta.color }} />
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {product.sku ? `${product.sku} · ` : ''}
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 16,
              lineHeight: 20,
              color: colors.fg,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never
          }
        >
          {product.stock}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ fontVariant: ['tabular-nums'] } as never}
        >
          {formatCLP(product.price)}
        </Text>
      </View>
    </Pressable>
  );
}

function SkeletonList() {
  return (
    <View className="px-5 pt-3 gap-1.5">
      <Skeleton className="h-3 w-24 mb-2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i} variant="outlined" padding="md">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </View>
            <View className="items-end gap-1.5">
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-2.5 w-12" />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function EmptyState({ search, onClearSearch }: { search: string; onClearSearch: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const hasSearch = search.length > 0;
  return (
    <View className="flex-1 items-center justify-center px-10 pb-24">
      <View className="h-16 w-16 rounded-2xl bg-bg-muted items-center justify-center">
        <Package size={28} color={colors.fgSubtle} strokeWidth={1.8} />
      </View>
      <Text variant="headline" className="mt-5">
        {hasSearch ? 'Nada que mostrar' : 'Aún no tienes productos'}
      </Text>
      <Text variant="body" tone="muted" className="mt-2 text-center">
        {hasSearch
          ? `No encontramos coincidencias para "${search}".`
          : 'Empieza agregando tu primer producto o importa un catálogo desde Excel.'}
      </Text>
      <View className="mt-6 w-full max-w-xs">
        {hasSearch ? (
          <Button variant="secondary" onPress={onClearSearch}>
            Limpiar búsqueda
          </Button>
        ) : (
          <Button>Agregar producto</Button>
        )}
      </View>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10 pb-24">
      <Text variant="headline">No pudimos cargar el inventario</Text>
      <Text variant="body" tone="muted" className="mt-2 text-center">
        Revisa tu conexión y reintenta.
      </Text>
      <View className="mt-6 w-full max-w-xs">
        <Button onPress={() => onRetry()}>Reintentar</Button>
      </View>
    </View>
  );
}

