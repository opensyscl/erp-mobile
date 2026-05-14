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
      style={{ alignItems: 'center', gap: 8, width: 64 }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: active ? colors.fg : colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: scheme === 'dark' ? 0 : 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: scheme === 'dark' ? 0 : 1,
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
