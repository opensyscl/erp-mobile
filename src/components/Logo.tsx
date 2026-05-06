import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import { Text } from './ui/Text';

/**
 * OpenSys identidad — fuente única de verdad.
 * Ofrecemos 3 marcas:
 *   - LogoDot   · círculo solo, para splash y logo+wordmark estilo MindHub
 *   - LogoMark  · cuadrado con anillo, para login / settings (más sólida)
 *   - Wordmark  · texto "OpenSys." con punto subdued
 */

interface LogoDotProps {
  size?: number;
  color?: string;
}

export function LogoDot({ size = 28, color }: LogoDotProps) {
  const brand = useBrand();
  const fill = color ?? brand.brand;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
      }}
    />
  );
}

interface LogoMarkProps {
  size?: number;
  /** "filled" = brand bg + white ring · "outline" = transparent bg + brand ring */
  variant?: 'filled' | 'outline' | 'inverse';
}

export function LogoMark({ size = 44, variant = 'filled' }: LogoMarkProps) {
  const brand = useBrand();

  const isFilled = variant === 'filled';
  const isInverse = variant === 'inverse';

  const bg = isFilled ? brand.brand : isInverse ? brand.brandFg : 'transparent';
  const ring = isFilled ? brand.brandFg : brand.brand;

  const cornerRadius = size * 0.25;
  const ringRadius = size * 0.225;
  const ringStroke = Math.max(2.5, size * 0.085);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} rx={cornerRadius} ry={cornerRadius} fill={bg} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={ringRadius}
        stroke={ring}
        strokeWidth={ringStroke}
        fill="none"
      />
    </Svg>
  );
}

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'inverse' | 'brand';
}

export function Wordmark({ size = 'md', tone = 'default' }: WordmarkProps) {
  const fontSize = { sm: 17, md: 21, lg: 26, xl: 32 }[size];
  const tracking = -0.035 * fontSize;

  return (
    <View className="flex-row items-baseline">
      <Text
        tone={tone}
        style={{
          fontFamily: Fonts.semibold,
          fontSize,
          letterSpacing: tracking,
        }}
      >
        OpenSys
      </Text>
      <Text
        tone={tone}
        style={{
          fontFamily: Fonts.semibold,
          fontSize,
          letterSpacing: tracking,
          opacity: 0.35,
        }}
      >
        .
      </Text>
    </View>
  );
}
