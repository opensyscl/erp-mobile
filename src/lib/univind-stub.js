// Stub for the `univind` package (unpublished from npm).
// heroui-native uses it internally for theme + insets propagation.
// We provide the minimal surface it needs to avoid runtime crashes.
import { useColorScheme } from 'react-native';

export const Uniwind = {
  updateInsets: () => {},
};

export function useUniwind() {
  const scheme = useColorScheme();
  return { theme: scheme ?? 'light' };
}
