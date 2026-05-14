import { View } from 'react-native';

import { StackSpot } from '~/components/SpotIllustration';
import { Card, Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ArrowRight } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export function ApprovalsCard({
  pending,
  onPress,
}: {
  pending: number;
  onPress?: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <Pressable onPress={onPress} haptic="selection" scale="subtle">
      <Card variant="outlined" padding="lg" className="overflow-hidden">
        <View className="flex-row">
          <View className="flex-1 pr-2">
            <Text
              style={
                {
                  fontFamily: Fonts.medium,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color: pending > 0 ? colors.warning : colors.fgSubtle,
                  textTransform: 'uppercase',
                  lineHeight: 14,
                  includeFontPadding: false,
                } as never
              }
            >
              {pending > 0 ? 'Acción requerida' : 'Al día'}
            </Text>
            <Text variant="title" className="mt-1.5">
              Aprobaciones
            </Text>
            <View className="flex-row items-baseline gap-1.5 mt-1">
              <Text
                style={
                  {
                    fontFamily: Fonts.semibold,
                    fontSize: 26,
                    lineHeight: 36,
                    letterSpacing: -0.4,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                    includeFontPadding: false,
                  } as never
                }
              >
                {pending}
              </Text>
              <Text variant="caption" tone="muted">
                {pending === 1 ? 'pendiente' : 'pendientes'}
              </Text>
            </View>
            <View
              className="self-start flex-row items-center gap-1 mt-4 px-3.5 rounded-full"
              style={{ backgroundColor: colors.bgMuted, height: 32 }}
            >
              <Text
                style={
                  {
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    color: colors.fg,
                    letterSpacing: -0.1,
                    includeFontPadding: false,
                  } as never
                }
              >
                Ver aprobaciones
              </Text>
              <ArrowRight size={12} color={colors.fg} />
            </View>
          </View>
          <View className="-mr-2 -mt-2">
            <StackSpot size={92} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
