import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { palette } from '~/theme/tokens';

/**
 * Tab bar fija al borde inferior: barra full-width con bg matching la surface,
 * top border sutil, ícono activo en círculo brand. Reemplaza el Tabs default
 * vía la prop `tabBar` de Expo Router/React Navigation.
 *
 * Filtra screens con `href: null` (no se renderizan en el bar). Cada item
 * recibe el `tabBarIcon` declarado en las options de su `<Tabs.Screen>`.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const insets = useSafeAreaInsets();

  // Filtrar solo screens cuya tabBarItem está habilitada (href !== null)
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

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 6,
        backgroundColor: colors.bgElevated,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.32 : 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        elevation: Platform.OS === 'android' ? 8 : 0,
      }}
    >
      {visibleRoutes.map(({ route, index }) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key]!;
        const IconFn = (options.tabBarIcon ?? null) as
          | ((props: { color: string; size: number; focused: boolean }) => React.ReactNode)
          | null;

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

        const iconColor = isFocused ? brand.brandFg : colors.fgMuted;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            haptic="selection"
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isFocused ? brand.brand : 'transparent',
              }}
            >
              {IconFn
                ? IconFn({ color: iconColor, size: 18, focused: isFocused })
                : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
