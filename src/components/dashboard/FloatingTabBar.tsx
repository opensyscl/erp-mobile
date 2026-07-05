import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

/**
 * Tab bar inferior — adaptativo según cantidad de tabs visibles:
 *   - 1-4 tabs → pill activo con icono + label (estilo Material You "chip").
 *   - 5+ tabs → sólo iconos (sin chip ni label) porque el label largo
 *     desborda el slot 1/n y descentra todo. El activo se distingue por
 *     color brand y un dot top.
 *
 * En ambos modos cada slot ocupa `flex: 1` (mismo width entre todos) y el
 * contenido se centra horizontalmente. Filtra screens con `href: null`.
 */
// App bloqueada en light — tokens canónicos de la paleta para unificar el
// hairline con el resto de la app (antes: #E5E5E5, un gris más frío que el borde).
const TAB_BAR_BG = palette.light.bgElevated;
const TAB_BAR_BORDER = palette.light.border;
const INACTIVE_FG = palette.light.fgSubtle;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const brand = useBrand();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => {
      const opts = descriptors[route.key]?.options;
      const item = (opts as { tabBarItemStyle?: { display?: string } } | undefined)?.tabBarItemStyle;
      const href = (opts as unknown as { href?: string | null } | undefined)?.href;
      if (href === null) return false;
      if (item?.display === 'none') return false;
      return true;
    });

  // Switch al modo "sólo iconos" cuando hay muchos tabs — sino el chip
  // del activo no entra en su 1/n del width y desbalancea la barra.
  const showLabels = visibleRoutes.length <= 4;
  const activeChipBg = withAlpha(brand.brand, 0.14);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {visibleRoutes.map(({ route, index }) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key]!;
        const IconFn = (options.tabBarIcon ?? null) as
          | ((props: { color: string; size: number; focused: boolean }) => React.ReactNode)
          | null;

        const labelRaw = options.tabBarLabel ?? options.title ?? route.name;
        const label = typeof labelRaw === 'string' ? labelRaw : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const iconColor = isFocused ? brand.brand : INACTIVE_FG;

        return (
          <View key={route.key} style={styles.slot}>
            <Pressable
              onPress={onPress}
              haptic="selection"
              style={[
                styles.item,
                isFocused && showLabels
                  ? { backgroundColor: activeChipBg, paddingHorizontal: 12 }
                  : null,
              ]}
            >
              {/* Indicador dot top — sólo en modo "icon only" para marcar el activo */}
              {isFocused && !showLabels ? (
                <View style={[styles.activeDot, { backgroundColor: brand.brand }]} />
              ) : null}

              {IconFn
                ? IconFn({ color: iconColor, size: 22, focused: isFocused })
                : null}

              {isFocused && showLabels ? (
                <Text
                  numberOfLines={1}
                  style={[styles.label, { color: brand.brand }]}
                >
                  {label}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
    backgroundColor: TAB_BAR_BG,
    borderTopWidth: 1,
    borderTopColor: TAB_BAR_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    maxWidth: '100%',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
});
