/**
 * Sthamly 07/06: la app no se ve bien en dark mode (cards con bgElevated
 * casi negras pierden jerarquía sobre el bg general). Bloqueamos en light
 * hasta que el dark mode esté tuneado pieza por pieza.
 *
 * Cuando se reactive: restaurar el flow original
 *   const system = useRNColorScheme() ?? 'light';
 *   const preference = useThemeStore((s) => s.preference);
 *   return preference === 'system' ? system : preference;
 */
export function useColorScheme(): 'light' | 'dark' {
  return 'light';
}
