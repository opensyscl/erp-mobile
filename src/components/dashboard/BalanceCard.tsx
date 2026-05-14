import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { View } from 'react-native';

import { Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ChevronRight, Eye, EyeOff } from '~/lib/icons';
import { formatCLP } from '~/lib/format';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Hero card estilo fintech (Cleva/Lucia ref): gradient pastel suave, balance
 * gigante centrado, toggle eye, selector de contexto (sucursal/moneda) y un
 * par de botones primary/secondary inline. Empty state: monto $0 visible pero
 * en `tone-secondary` con sub label.
 */
export function BalanceCard({
  amount,
  count,
  countLabel = 'Boletas',
  delta,
  contextLabel,
  onContextPress,
  primary,
  secondary,
  menu,
  loading,
}: {
  amount: number;
  count: number;
  countLabel?: string;
  delta?: { value: number; label?: string };
  /** Pill en esquina superior derecha (ej. nombre de sucursal). */
  contextLabel?: string;
  onContextPress?: () => void;
  primary?: { label: string; icon?: React.ReactNode; onPress?: () => void };
  secondary?: { label: string; icon?: React.ReactNode; onPress?: () => void };
  menu?: { onPress?: () => void };
  loading?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [hidden, setHidden] = useState(false);
  const hasData = count > 0;

  // Gradient pastel suave (brand-subtle a bg-elevated con leve tint cobalto)
  const gradStart = brand.brandSubtle;
  const gradEnd = scheme === 'dark' ? colors.bgElevated : 'rgb(245 248 255)';

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        {/* Top row */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => setHidden((h) => !h)} haptic="selection" className="flex-row items-center gap-1.5">
            <Text
              style={
                {
                  fontFamily: Fonts.medium,
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.fgMuted,
                  letterSpacing: -0.1,
                  includeFontPadding: false,
                } as never
              }
            >
              Ventas de hoy
            </Text>
            {hidden ? (
              <EyeOff size={14} color={colors.fgMuted} />
            ) : (
              <Eye size={14} color={colors.fgMuted} />
            )}
          </Pressable>
          {contextLabel ? (
            <Pressable
              onPress={onContextPress}
              haptic="selection"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 10,
                paddingRight: 6,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.6)',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={
                  {
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    lineHeight: 16,
                    color: colors.fg,
                    includeFontPadding: false,
                  } as never
                }
                numberOfLines={1}
              >
                {contextLabel}
              </Text>
              <ChevronRight size={12} color={colors.fgMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Amount */}
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: 18,
                lineHeight: 24,
                color: hasData ? colors.fg : colors.fgMuted,
                includeFontPadding: false,
              } as never
            }
          >
            $
          </Text>
          {loading ? (
            <Skeleton className="h-10 w-48" />
          ) : hidden ? (
            <Text
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 36,
                  lineHeight: 44,
                  color: colors.fgMuted,
                  letterSpacing: -1.2,
                  includeFontPadding: false,
                } as never
              }
            >
              •••••••
            </Text>
          ) : (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 36,
                  lineHeight: 44,
                  color: colors.fg,
                  letterSpacing: -1.2,
                  fontVariant: ['tabular-nums'],
                  includeFontPadding: false,
                  flexShrink: 1,
                } as never
              }
            >
              {formatCLP(amount).replace(/^\$/, '')}
            </Text>
          )}
        </View>

        {/* Sub line: count + delta */}
        <View className="flex-row items-center gap-2 mt-1.5">
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
            {hasData ? `${count} ${countLabel}` : 'Sin movimientos hoy'}
          </Text>
          {delta ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor:
                  (delta.value >= 0 ? colors.success : colors.danger) + '22',
              }}
            >
              <Text
                style={
                  {
                    fontFamily: Fonts.semibold,
                    fontSize: 10,
                    lineHeight: 14,
                    color: delta.value >= 0 ? colors.success : colors.danger,
                    includeFontPadding: false,
                  } as never
                }
              >
                {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value).toFixed(1)}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action pair + menu */}
        {primary || secondary ? (
          <View className="flex-row items-center gap-2 mt-5">
            {primary ? (
              <Pressable
                onPress={primary.onPress}
                haptic="medium"
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: colors.fg,
                }}
              >
                {primary.icon}
                <Text
                  style={
                    {
                      fontFamily: Fonts.semibold,
                      fontSize: 14,
                      lineHeight: 20,
                      color: colors.bgElevated,
                      letterSpacing: -0.2,
                      includeFontPadding: false,
                    } as never
                  }
                >
                  {primary.label}
                </Text>
              </Pressable>
            ) : null}
            {secondary ? (
              <Pressable
                onPress={secondary.onPress}
                haptic="selection"
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {secondary.icon}
                <Text
                  style={
                    {
                      fontFamily: Fonts.semibold,
                      fontSize: 14,
                      lineHeight: 20,
                      color: colors.fg,
                      letterSpacing: -0.2,
                      includeFontPadding: false,
                    } as never
                  }
                >
                  {secondary.label}
                </Text>
              </Pressable>
            ) : null}
            {menu ? (
              <Pressable
                onPress={menu.onPress}
                haptic="selection"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 3,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: colors.fg,
                    }}
                  />
                ))}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}
