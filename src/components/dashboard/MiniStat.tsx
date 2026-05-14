import { View } from 'react-native';

import { Card, Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export function MiniStat({
  label,
  value,
  sub,
  loading,
  isEmpty,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  /** Si true, atenúa el value y dibuja un placeholder pill en vez del guión. */
  isEmpty?: boolean;
  icon?: React.ReactNode;
  accent?: string;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <Card variant="outlined" padding="md" className="flex-1">
      <View className="flex-row items-center justify-between">
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        {icon ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              backgroundColor: colors.bgMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        ) : null}
      </View>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-2" />
      ) : isEmpty ? (
        <View
          style={{
            marginTop: 8,
            height: 22,
            width: 36,
            borderRadius: 6,
            backgroundColor: colors.bgMuted,
            opacity: 0.7,
          }}
        />
      ) : (
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 20,
              lineHeight: 26,
              letterSpacing: -0.4,
              marginTop: 6,
              fontVariant: ['tabular-nums'],
              color: accent ?? colors.fg,
              includeFontPadding: false,
            } as never
          }
        >
          {value}
        </Text>
      )}
      <Text
        variant="caption"
        tone="subtle"
        className="mt-1"
        style={{ opacity: isEmpty ? 0.6 : 1 } as never}
      >
        {sub}
      </Text>
    </Card>
  );
}
