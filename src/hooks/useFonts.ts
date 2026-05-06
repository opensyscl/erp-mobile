import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useFonts as useExpoFonts } from 'expo-font';

/**
 * Carga DM Sans (4 pesos) al arrancar la app. El root layout espera a
 * `loaded === true` antes de renderizar el contenido.
 */
export function useFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useExpoFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  return { loaded, error };
}
