import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Chip circular estilo fintech: ícono dentro de círculo blanco con sombra muy
 * sutil y label gris debajo. Pensado para fila horizontal de 4-5 atajos.
 */
export function QuickActionCircle({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
  active?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={{ alignItems: 'center', gap: 7, width: 58 }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: active ? colors.fg : colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow:
            scheme === 'dark'
              ? undefined
              : [{ offsetX: 0, offsetY: 2, blurRadius: 8, spreadDistance: -1, color: 'rgba(10,13,20,0.05)' }],
        }}
      >
        {icon}
      </View>
      <Text
        numberOfLines={1}
        style={
          {
            fontFamily: Fonts.medium,
            fontSize: 11,
            lineHeight: 14,
            color: colors.fg,
            letterSpacing: -0.1,
            includeFontPadding: false,
          } as never
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
