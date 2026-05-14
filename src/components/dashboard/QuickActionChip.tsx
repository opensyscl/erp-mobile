import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export function QuickActionChip({
  label,
  icon,
  bg,
  fg,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const isNeutral = bg === colors.bgElevated;

  return (
    <Pressable
      haptic="selection"
      scale="subtle"
      onPress={onPress}
      style={{
        width: 96,
        height: 96,
        borderRadius: 18,
        backgroundColor: bg,
        borderWidth: isNeutral ? 1 : 0,
        borderColor: colors.border,
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isNeutral ? colors.bgMuted : 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 12,
          lineHeight: 16,
          color: fg,
          letterSpacing: -0.1,
          includeFontPadding: false,
        } as never}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
