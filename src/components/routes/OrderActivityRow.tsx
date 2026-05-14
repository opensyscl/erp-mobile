import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { formatCLP, formatTime } from '~/lib/format';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

import { StatusBadge, type RouteOrderStatus } from './StatusBadge';

export interface OrderActivityItem {
  id: number;
  order_number: string;
  client_name: string | null;
  driver_id: number | null;
  driver_name: string | null;
  status: RouteOrderStatus;
  total: number;
  created_at: string | null;
}

/**
 * Fila estilo "Trazabilidad de ventas" — avatar de letra, nombre + driver
 * abajo en gris, status pill al lado de total. Replica el feel de la tabla
 * web pero en layout de fila para mobile.
 */
export function OrderActivityRow({
  order,
  onPress,
  withBorder = true,
}: {
  order: OrderActivityItem;
  onPress?: () => void;
  withBorder?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const initial = (order.client_name?.[0] ?? '?').toUpperCase();

  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={
        withBorder
          ? { borderBottomWidth: 1, borderBottomColor: colors.border }
          : undefined
      }
      className="px-4 py-3 flex-row items-center gap-3"
    >
      {/* Avatar inicial cliente */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: brand.brandSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 13,
              lineHeight: 18,
              color: brand.brand,
              includeFontPadding: false,
            } as never
          }
        >
          {initial}
        </Text>
      </View>

      {/* Info: order# + cliente + driver */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View className="flex-row items-center gap-2">
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 11,
                lineHeight: 16,
                color: brand.brand,
                letterSpacing: 0.4,
                includeFontPadding: false,
              } as never
            }
          >
            {order.order_number}
          </Text>
          {order.created_at ? (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.fgSubtle }} />
              <Text variant="caption" tone="subtle">
                {formatTime(order.created_at)}
              </Text>
            </>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 14,
              lineHeight: 20,
              color: colors.fg,
              marginTop: 1,
              includeFontPadding: false,
            } as never
          }
        >
          {order.client_name ?? 'Sin cliente'}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1} className="mt-0.5">
          {order.driver_name ?? 'Sin repartidor'}
        </Text>
      </View>

      {/* Derecha: total + badge */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 15,
              lineHeight: 22,
              color: colors.fg,
              fontVariant: ['tabular-nums'],
              includeFontPadding: false,
            } as never
          }
        >
          {formatCLP(order.total)}
        </Text>
        <StatusBadge status={order.status} />
      </View>
    </Pressable>
  );
}
