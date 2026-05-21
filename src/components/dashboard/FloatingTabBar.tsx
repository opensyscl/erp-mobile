import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { palette } from '~/theme/tokens';

/**
 * Tab bar custom estilo "dock pill": píldora flotante con sombra, ícono activo
 * dentro de un círculo brand. Reemplaza el Tabs default vía la prop `tabBar`
 * de Expo Router/React Navigation.
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

  // En dev, los toasts de Expo Go viven en bottom ~0-60px y tapan el dock.
  // Lo subimos en __DEV__ y mantenemos el offset minimal en producción.
  const bottomOffset = __DEV__
    ? Math.max(insets.bottom + 56, 80)
    : Math.max(insets.bottom, 14);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: bottomOffset,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          paddingHorizontal: 5,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: scheme === 'dark' ? 0.32 : 0.10,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: Platform.OS === 'android' ? 4 : 0,
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
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isFocused ? brand.brand : 'transparent',
              }}
            >
              {IconFn
                ? IconFn({ color: iconColor, size: 18, focused: isFocused })
                : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
