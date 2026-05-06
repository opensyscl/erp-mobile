import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * router.back() falla con "GO_BACK was not handled" cuando el usuario
 * llega a una pantalla por redirect / deep link y no hay stack. Este
 * helper cae a un fallback en ese caso.
 */
export function useSafeBack(fallback: Href = '/(app)/' as Href): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [router, fallback]);
}
