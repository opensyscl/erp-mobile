// Stub for `univind` — unpublished from npm, imported internally by heroui-native.
// Covers all 5 exports the library uses. Components render with fallback colors;
// NativeWind handles actual class resolution via its own pipeline.
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export const Uniwind = {
  updateInsets: () => {},
};

export function useUniwind() {
  const scheme = useColorScheme();
  return { theme: scheme ?? 'light' };
}

// Resolves Tailwind class names → RN style object.
// We return {} so heroui-native falls back to its inline style props.
export function useResolveClassNames(_className) {
  return useMemo(() => ({}), [_className]);
}

// Resolves CSS variable names like '--color-background' → color string.
// Returns empty strings; heroui-native falls back to hardcoded defaults.
export function useCSSVariable(cssVariables) {
  return useMemo(() => cssVariables.map(() => ''), [cssVariables]);
}

// HOC that gives a component access to univind context. Identity is enough.
export function withUniwind(Component) {
  return Component;
}
