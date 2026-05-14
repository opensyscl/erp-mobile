import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Bell } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Header soft estilo fintech ref — avatar + greeting + bell. Sin brand bg,
 * vive sobre `bg-subtle`. Pensado para dashboards limpios donde el hero card
 * (BalanceCard) lleva el peso visual.
 */
export function SoftHeader({
  greeting,
  name,
  initial,
  avatarColor = '#6366F1',
  hasNotifications,
  onBellPress,
  topInset,
}: {
  greeting: string;
  name: string;
  initial: string;
  avatarColor?: string;
  hasNotifications?: boolean;
  onBellPress?: () => void;
  topInset: number;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <View
      className="flex-row items-center justify-between px-5"
      style={{ paddingTop: topInset + 6, paddingBottom: 14 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: avatarColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 15,
                lineHeight: 20,
                color: '#FFFFFF',
                includeFontPadding: false,
              } as never
            }
          >
            {initial}
          </Text>
        </View>
        <View>
          <Text
            style={
              {
                fontFamily: Fonts.regular,
                fontSize: 12,
                lineHeight: 16,
                color: colors.fgMuted,
                includeFontPadding: false,
              } as never
            }
          >
            {greeting}
          </Text>
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 17,
                lineHeight: 24,
                color: colors.fg,
                letterSpacing: -0.4,
                marginTop: 1,
                includeFontPadding: false,
              } as never
            }
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onBellPress}
        haptic="selection"
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasNotifications ? (
          <View
            style={{
              position: 'absolute',
              top: 9,
              right: 11,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.danger,
              borderWidth: 2,
              borderColor: colors.bgElevated,
              zIndex: 1,
            }}
          />
        ) : null}
        <Bell size={18} color={colors.fg} strokeWidth={1.7} />
      </Pressable>
    </View>
  );
}
