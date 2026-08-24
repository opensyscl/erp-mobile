import { Image } from 'expo-image';
import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { formatCLP } from '~/lib/format';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export interface ActivityItem {
  id: string | number;
  /** Texto principal (cliente, producto, contacto). */
  title: string;
  /** Sub texto (fecha + hora). */
  sub: string;
  amount: number;
  /** Si negativo, se muestra rojo con `-`. Positivo, verde con `+`. */
  signed?: boolean;
  /** Foto del producto (thumbnail del avatar). Si falta, cae a la inicial. */
  imageUrl?: string | null;
  /** Color de avatar custom — si se omite, se deriva del id. */
  avatarColor?: string;
  /** Item "activo" — recibe sombra elevada + ring sutil. */
  highlighted?: boolean;
}

const SOFT_BG = [
  '#FEE8C8', // peach
  '#FFE9DA', // cream
  '#FDE2E2', // pink
  '#E0F2FE', // sky
  '#DCFCE7', // mint
  '#EDE9FE', // violet
];
const SOFT_FG = [
  '#B45309', // amber
  '#92400E', // brown
  '#9D174D', // rose
  '#0369A1', // blue
  '#166534', // green
  '#5B21B6', // purple
];

function pickPair(id: string | number) {
  const n =
    typeof id === 'number'
      ? id
      : id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = n % SOFT_BG.length;
  return { bg: SOFT_BG[idx] ?? SOFT_BG[0]!, fg: SOFT_FG[idx] ?? SOFT_FG[0]! };
}

/**
 * Fila estilo "Transaction history" del ref fintech — card-like row con
 * avatar pastel (inicial), título + sub, monto coloreado a la derecha.
 * En `highlighted=true` se le agrega ring + sombra y bg elevated.
 */
export function ActivityRow({
  item,
  onPress,
}: {
  item: ActivityItem;
  onPress?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const initial = item.title[0]?.toUpperCase() ?? '?';
  const pair = pickPair(item.id);
  const avatarBg = item.avatarColor ?? pair.bg;
  const avatarFg = pair.fg;

  const positive = (item.amount ?? 0) >= 0;
  const amountColor = item.signed
    ? positive
      ? colors.success
      : colors.danger
    : colors.fg;
  const sign = item.signed ? (positive ? '+' : '-') : '';

  const highlight = item.highlighted;

  return (
    <Pressable
      haptic="selection"
      onPress={onPress}
      scale="subtle"
      style={{
        backgroundColor: highlight ? colors.bgElevated : 'transparent',
        borderRadius: 18,
        borderWidth: highlight ? 1 : 0,
        borderColor: colors.border,
        marginVertical: highlight ? 4 : 0,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: highlight ? '#000' : 'transparent',
        shadowOpacity: highlight ? 0.08 : 0,
        shadowRadius: highlight ? 12 : 0,
        shadowOffset: { width: 0, height: 6 },
        elevation: highlight ? 3 : 0,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          overflow: 'hidden',
          backgroundColor: avatarBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 44, height: 44 }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 16,
                lineHeight: 22,
                color: avatarFg,
                includeFontPadding: false,
              } as never
            }
          >
            {initial}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 14,
              lineHeight: 20,
              color: colors.fg,
              includeFontPadding: false,
            } as never
          }
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={1}
          style={
            {
              fontFamily: Fonts.regular,
              fontSize: 11,
              lineHeight: 16,
              color: colors.fgMuted,
              marginTop: 2,
              includeFontPadding: false,
            } as never
          }
        >
          {item.sub}
        </Text>
      </View>
      <Text
        style={
          {
            fontFamily: Fonts.semibold,
            fontSize: 14,
            lineHeight: 20,
            color: amountColor,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never
        }
      >
        {sign}
        {formatCLP(Math.abs(item.amount))}
      </Text>
    </Pressable>
  );
}
