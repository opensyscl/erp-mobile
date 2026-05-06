import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '~/stores/theme';

export function useColorScheme(): 'light' | 'dark' {
  const system = useRNColorScheme() ?? 'light';
  const preference = useThemeStore((s) => s.preference);
  return preference === 'system' ? system : preference;
}
