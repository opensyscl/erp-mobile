import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ArrowRight } from '~/lib/icons';
import { formatCLP } from '~/lib/format';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export interface DriverRanking {
  driver_id: number;
  name: string;
  total_orders: number;
  delivered: number;
  collected: number;
}

export function DriverRankingRow({
  driver,
  rank,
  onPress,
}: {
  driver: DriverRanking;
  rank: number;
  onPress?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const isTop = rank === 1;

  return (
    <Pressable
      haptic="selection"
      onPress={onPress}
      scale="subtle"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isTop ? brand.brandSubtle : colors.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 12,
              lineHeight: 18,
              color: isTop ? brand.brand : colors.fgMuted,
              includeFontPadding: false,
            } as never
          }
        >
          {rank}°
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {driver.name}
        </Text>
        <Text variant="caption" tone="muted">
          {driver.delivered}/{driver.total_orders} entregas · {formatCLP(driver.collected)}
        </Text>
      </View>
      {onPress ? <ArrowRight size={16} color={colors.fgSubtle} /> : null}
    </Pressable>
  );
}
