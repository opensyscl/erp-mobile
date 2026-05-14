import { View } from 'react-native';

import { Pressable, Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ArrowRight } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export function FleetMetricRow({
  label,
  value,
  sub,
  icon,
  iconBg,
  onPress,
  loading,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress?: () => void;
  loading: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const inner = (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        {loading ? (
          <Skeleton className="h-6 w-12 mt-1" />
        ) : (
          <View className="flex-row items-baseline gap-1.5">
            <Text
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 24,
                  lineHeight: 34,
                  letterSpacing: -0.6,
                  color: colors.fg,
                  fontVariant: ['tabular-nums'],
                } as never
              }
            >
              {value}
            </Text>
            <Text variant="caption" tone="muted">
              {sub}
            </Text>
          </View>
        )}
      </View>
      {onPress ? <ArrowRight size={16} color={colors.fgSubtle} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable haptic="selection" onPress={onPress} scale="subtle">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
