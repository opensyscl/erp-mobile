import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ArrowRight } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette } from '~/theme/tokens';

export function DashboardHeader({
  greeting,
  name,
  emoji = '👋',
  subtitle,
  cta,
}: {
  greeting: string;
  name: string;
  emoji?: string;
  subtitle?: string;
  cta?: { label: string; onPress: () => void };
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  return (
    <View className="flex-row items-start justify-between gap-3">
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">
          {greeting},
        </Text>
        <View className="flex-row items-baseline gap-1.5 mt-0.5">
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 28,
                lineHeight: 38,
                letterSpacing: -0.7,
                color: colors.fg,
                includeFontPadding: false,
              } as never
            }
          >
            {name}
          </Text>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        {subtitle ? (
          <Text variant="caption" tone="subtle" className="mt-1">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {cta ? (
        <Pressable
          haptic="medium"
          onPress={cta.onPress}
          style={{
            backgroundColor: brand.brand,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            ...brandShadow(brand.brand, 'md'),
          }}
        >
          <Text
            style={
              {
                color: brand.brandFg,
                fontFamily: Fonts.semibold,
                fontSize: 12,
                lineHeight: 18,
                letterSpacing: -0.1,
                includeFontPadding: false,
              } as never
            }
          >
            {cta.label}
          </Text>
          <ArrowRight size={14} color={brand.brandFg} />
        </Pressable>
      ) : null}
    </View>
  );
}
