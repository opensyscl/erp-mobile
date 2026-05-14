import { View } from 'react-native';

import { HeaderPattern } from '~/components/HeaderPattern';
import { LogoDot } from '~/components/Logo';
import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Search } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Cabecera con fondo de marca para HomeScreen / dashboards genéricos.
 * Bloquea: brand row (tenant + bell + avatar), day pill, saludo (multilínea),
 * subtítulo opcional, search placeholder opcional.
 */
export function WelcomeHeader({
  tenantName,
  initial,
  notificationCount,
  dayLabel,
  greeting,
  name,
  subtitle,
  searchPlaceholder,
  topInset,
}: {
  tenantName: string;
  initial: string;
  notificationCount?: number;
  dayLabel: string;
  greeting: string;
  name: string;
  subtitle?: string;
  searchPlaceholder?: string;
  topInset: number;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  return (
    <View
      style={{
        backgroundColor: brand.brand,
        paddingTop: topInset + 12,
        paddingHorizontal: 20,
        paddingBottom: 92,
        overflow: 'hidden',
      }}
    >
      <HeaderPattern color={brand.brandFg} />
      {/* Brand + actions row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <LogoDot size={18} color={brand.brandFg} />
          <Text
            style={
              {
                color: brand.brandFg,
                fontFamily: Fonts.medium,
                fontSize: 14,
                letterSpacing: -0.3,
                includeFontPadding: false,
              } as never
            }
          >
            {tenantName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            haptic="selection"
            className="h-9 w-9 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
          >
            {notificationCount && notificationCount > 0 ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.warning,
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                }}
              />
            ) : null}
            <Text
              style={
                {
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 12,
                  includeFontPadding: false,
                } as never
              }
            >
              {notificationCount ?? 0}
            </Text>
          </Pressable>
          <View
            className="h-9 w-9 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
          >
            <Text
              style={
                {
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 13,
                  includeFontPadding: false,
                } as never
              }
            >
              {initial}
            </Text>
          </View>
        </View>
      </View>

      {/* Day pill */}
      <View
        className="self-start flex-row items-center gap-1.5 mt-7 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
      >
        <View
          style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: brand.brandFg, opacity: 0.6 }}
        />
        <Text
          style={
            {
              color: brand.brandFg,
              fontFamily: Fonts.medium,
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: 'capitalize',
              includeFontPadding: false,
            } as never
          }
        >
          {dayLabel}
        </Text>
      </View>

      {/* Greeting */}
      <Text
        style={
          {
            color: brand.brandFg,
            fontFamily: Fonts.medium,
            fontSize: 28,
            letterSpacing: -0.4,
            lineHeight: 38,
            marginTop: 16,
            includeFontPadding: false,
          } as never
        }
      >
        {greeting},
      </Text>
      <Text
        style={
          {
            color: brand.brandFg,
            fontFamily: Fonts.semibold,
            fontSize: 28,
            letterSpacing: -0.4,
            lineHeight: 38,
            includeFontPadding: false,
          } as never
        }
      >
        {name}.
      </Text>

      {subtitle ? (
        <Text
          style={
            {
              color: brand.brandFg,
              opacity: 0.62,
              fontFamily: Fonts.regular,
              fontSize: 14,
              lineHeight: 20,
              letterSpacing: -0.1,
              marginTop: 10,
              maxWidth: 320,
              includeFontPadding: false,
            } as never
          }
        >
          {subtitle}
        </Text>
      ) : null}

      {searchPlaceholder ? (
        <View
          className="flex-row items-center gap-2 mt-6 px-4 rounded-xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.14)', height: 44 }}
        >
          <Search size={16} color={brand.brandFg} />
          <Text
            style={
              {
                color: brand.brandFg,
                opacity: 0.6,
                fontFamily: Fonts.regular,
                fontSize: 13,
                flex: 1,
                includeFontPadding: false,
              } as never
            }
          >
            {searchPlaceholder}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
