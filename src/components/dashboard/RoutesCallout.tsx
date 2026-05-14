import { View } from 'react-native';

import { HeaderPattern } from '~/components/HeaderPattern';
import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { ArrowRight } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';

/**
 * CTA card "Mi ruta de hoy" para usuarios con `routes.view`. Brand bg con
 * pattern + arrow circle. El callsite decide cuándo mostrarla.
 */
export function RoutesCallout({ onPress }: { onPress?: () => void }) {
  const brand = useBrand();

  return (
    <Pressable onPress={onPress} haptic="selection" scale="subtle">
      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: brand.brand,
          padding: 18,
        }}
      >
        <View style={{ position: 'absolute', inset: 0 }}>
          <HeaderPattern color={brand.brandFg} intensity={0.7} />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              style={
                {
                  color: brand.brandFg,
                  opacity: 0.7,
                  fontFamily: Fonts.medium,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  includeFontPadding: false,
                } as never
              }
            >
              Reparto
            </Text>
            <Text
              style={
                {
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 22,
                  lineHeight: 30,
                  letterSpacing: -0.3,
                  marginTop: 4,
                  includeFontPadding: false,
                } as never
              }
            >
              Mi ruta de hoy
            </Text>
            <Text
              style={
                {
                  color: brand.brandFg,
                  opacity: 0.78,
                  fontFamily: Fonts.regular,
                  fontSize: 13,
                  lineHeight: 18,
                  marginTop: 2,
                  includeFontPadding: false,
                } as never
              }
            >
              Ver paradas y entregas pendientes
            </Text>
          </View>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowRight size={18} color={brand.brandFg} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
