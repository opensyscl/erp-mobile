import { View } from 'react-native';

import { Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

type Trend = { value: number; tone: 'success' | 'danger' };

export function KpiCard({
  label,
  value,
  loading,
  accent,
  isMoney,
  trend,
}: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
  accent?: string;
  isMoney?: boolean;
  trend?: Trend;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        {trend ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 999,
              backgroundColor:
                withAlpha((trend.tone === 'success' ? colors.success : colors.danger), 0.09),
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 10,
                lineHeight: 14,
                color: trend.tone === 'success' ? colors.success : colors.danger,
                includeFontPadding: false,
              } as never}
            >
              {trend.tone === 'success' ? '↑' : '↓'} {Math.abs(trend.value)}%
            </Text>
          </View>
        ) : null}
      </View>
      {loading ? (
        <Skeleton className="h-8 w-20 mt-2" />
      ) : (
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: isMoney ? 22 : 30,
            lineHeight: isMoney ? 32 : 42,
            letterSpacing: isMoney ? -0.4 : -0.9,
            color: accent ?? colors.fg,
            fontVariant: ['tabular-nums'],
            marginTop: 6,
            includeFontPadding: false,
          } as never}
        >
          {value ?? 0}
        </Text>
      )}
    </View>
  );
}
