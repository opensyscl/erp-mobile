import { Dimensions, View } from 'react-native';

import { WeeklyBarsChart, type WeeklyBarDatum } from '~/components/charts/WeeklyBarsChart';
import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Card wrapper para el chart de ventas por día. Header con label + delta% y
 * "Ver todo". Inspirado en la imagen "User in The Last Week".
 */
export function SalesByDayCard({
  title = 'Ventas en la semana',
  delta,
  data,
  onSeeAll,
}: {
  title?: string;
  /** Delta semanal — pintamos pill verde/rojo según signo. */
  delta?: number;
  data: WeeklyBarDatum[];
  onSeeAll?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  // El card vive con mx-5 (px20), card interior tiene padding 18 → ancho útil
  const width = Dimensions.get('window').width - 40 - 36;
  const isPositive = (delta ?? 0) >= 0;

  return (
    <View
      style={{
        backgroundColor: colors.bgElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
      }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View style={{ flex: 1 }}>
          <Text
            style={
              {
                fontFamily: Fonts.regular,
                fontSize: 12,
                lineHeight: 16,
                color: colors.fgMuted,
                includeFontPadding: false,
              } as never
            }
          >
            {title}
          </Text>
          {typeof delta === 'number' ? (
            <Text
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 24,
                  lineHeight: 30,
                  letterSpacing: -0.6,
                  color: isPositive ? colors.success : colors.danger,
                  fontVariant: ['tabular-nums'],
                  marginTop: 2,
                  includeFontPadding: false,
                } as never
              }
            >
              {isPositive ? '+' : ''}
              {delta.toFixed(1)}%
            </Text>
          ) : null}
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} haptic="selection">
            <Text
              style={
                {
                  fontFamily: Fonts.medium,
                  fontSize: 12,
                  lineHeight: 16,
                  color: colors.fgMuted,
                  textDecorationLine: 'underline',
                  includeFontPadding: false,
                } as never
              }
            >
              Ver todo
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Chart */}
      <View style={{ marginTop: 14 }}>
        <WeeklyBarsChart data={data} width={width} height={180} />
      </View>
    </View>
  );
}
