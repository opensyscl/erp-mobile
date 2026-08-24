import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest } from '~/lib/api';
import { formatCLP } from '~/lib/format';
import { ArrowLeft } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface SaleDetailItem {
  id: number;
  name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SaleDetail {
  id: number;
  receipt_number: number | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  status: string;
  customer: string | null;
  seller: string | null;
  items: SaleDetailItem[];
  created_at: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
  fiado: 'Fiado',
};

async function fetchSale(id: string): Promise<SaleDetail> {
  const res = await apiRequest<{ data: SaleDetail }>({
    method: 'GET',
    url: `/api/mobile/sales/${id}`,
  });
  return res.data;
}

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const { data: sale, isLoading } = useQuery({
    queryKey: queryKeys.sales.detail(id ?? ''),
    queryFn: () => fetchSale(id!),
    enabled: !!id,
  });

  const dateLabel = sale?.created_at
    ? new Date(sale.created_at).toLocaleString('es-CL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const receipt = sale?.receipt_number != null ? `#${String(sale.receipt_number).padStart(6, '0')}` : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSubtle }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: colors.bg,
        }}
      >
        <View className="flex-row items-center">
          <Pressable
            haptic="selection"
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-1 h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color={colors.fg} />
          </Pressable>
          <Text variant="title" className="ml-1">
            Detalle de venta
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {isLoading || !sale ? (
          <View className="gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </View>
        ) : (
          <>
            {/* Resumen */}
            <Animated.View entering={FadeInDown.duration(240)}>
              <Card variant="elevated" padding="lg">
                <View className="flex-row items-center justify-between">
                  <Text variant="overline" tone="subtle">
                    {receipt ?? 'Sin boleta'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor:
                        sale.status === 'completed' ? colors.brandSubtle : colors.bgMuted,
                    }}
                  >
                    <Text variant="caption" tone={sale.status === 'completed' ? 'brand' : 'muted'}>
                      {sale.status === 'completed' ? 'Completada' : sale.status}
                    </Text>
                  </View>
                </View>
                <Text
                  style={
                    {
                      fontFamily: Fonts.semibold,
                      fontSize: 30,
                      lineHeight: 38,
                      letterSpacing: -0.8,
                      color: colors.fg,
                      marginTop: 6,
                      includeFontPadding: false,
                    } as never
                  }
                >
                  {formatCLP(sale.total)}
                </Text>
                <Text variant="caption" tone="muted" className="mt-1">
                  {dateLabel}
                  {sale.seller ? ` · ${sale.seller}` : ''}
                </Text>
              </Card>
            </Animated.View>

            {/* Items */}
            <Text variant="overline" tone="subtle" className="mt-6 mb-2 ml-1">
              {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}
            </Text>
            <Card variant="outlined" padding="none">
              {sale.items.map((it, i) => (
                <View
                  key={it.id}
                  className="flex-row items-center gap-3 px-4 py-3"
                  style={
                    i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined
                  }
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
                    {it.image_url ? (
                      <Image
                        source={{ uri: it.image_url }}
                        style={{ width: 44, height: 44 }}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Text variant="caption" tone="muted">
                        {it.name[0]?.toUpperCase() ?? '?'}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {it.quantity} × {formatCLP(it.unit_price)}
                    </Text>
                  </View>
                  <Text variant="bodyStrong">{formatCLP(it.subtotal)}</Text>
                </View>
              ))}
            </Card>

            {/* Totales */}
            <Card variant="outlined" padding="lg" className="mt-4">
              <Row label="Subtotal" value={formatCLP(sale.subtotal)} />
              {sale.discount > 0 ? (
                <Row label="Descuento" value={`- ${formatCLP(sale.discount)}`} tone="danger" />
              ) : null}
              {sale.tax > 0 ? <Row label="Impuesto" value={formatCLP(sale.tax)} /> : null}
              <View
                style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }}
              />
              <Row label="Total" value={formatCLP(sale.total)} strong />
              <Row label={METHOD_LABEL[sale.payment_method] ?? sale.payment_method} value={formatCLP(sale.paid)} muted />
              {sale.change > 0 ? <Row label="Vuelto" value={formatCLP(sale.change)} muted /> : null}
              {sale.customer ? <Row label="Cliente" value={sale.customer} muted /> : null}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  tone?: 'danger';
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={muted ? 'muted' : 'default'}>
        {label}
      </Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} tone={tone ?? (muted ? 'muted' : 'default')}>
        {value}
      </Text>
    </View>
  );
}
