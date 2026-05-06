import { type ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '~/lib/cn';

interface BaseProps {
  children: ReactNode;
  className?: string;
  edges?: { top?: boolean; bottom?: boolean };
  padded?: boolean;
}

/**
 * Screen — contenedor raíz con safe-area + paddings consistentes.
 * Variantes: <Screen> (sin scroll) y <Screen.Scroll> (ScrollView).
 */
export function Screen({ children, className, edges = { top: true, bottom: false }, padded = true }: BaseProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: edges.top ? insets.top : 0,
        paddingBottom: edges.bottom ? insets.bottom : 0,
      }}
      className={cn('flex-1 bg-bg', padded && 'px-5', className)}
    >
      {children}
    </View>
  );
}

interface ScrollProps extends BaseProps, Omit<ScrollViewProps, 'children'> {}

Screen.Scroll = function ScreenScroll({
  children,
  className,
  edges = { top: true, bottom: true },
  padded = true,
  contentContainerStyle,
  ...rest
}: ScrollProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          paddingTop: edges.top ? insets.top + 8 : 0,
          paddingBottom: edges.bottom ? insets.bottom + 24 : 24,
          paddingHorizontal: padded ? 20 : 0,
        },
        contentContainerStyle,
      ]}
      className={cn('flex-1 bg-bg', className)}
      {...rest}
    >
      {children}
    </ScrollView>
  );
};
