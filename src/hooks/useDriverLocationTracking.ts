import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { apiRequest } from '~/lib/api';

/**
 * expo-location es un módulo nativo. Si la app no fue rebuildeada después
 * de agregarlo (APK viejo), el require explota con "Cannot find native
 * module 'ExpoLocation'". Lo cargamos lazy y silenciamos para que el resto
 * de la app siga funcionando — el tracking simplemente queda 'unavailable'.
 */
type LocationModule = typeof import('expo-location');
let LocationLib: LocationModule | null = null;
let locationLoadAttempted = false;

function tryLoadLocation(): LocationModule | null {
  if (locationLoadAttempted) return LocationLib;
  locationLoadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LocationLib = require('expo-location') as LocationModule;
  } catch {
    LocationLib = null;
  }
  return LocationLib;
}

interface UseDriverLocationTrackingArgs {
  /** True cuando el user es driver y tiene ruta activa. Si false, no trackea. */
  enabled: boolean;
  /** ID del load activo (para asociarlo en el ping). Si null, el backend lo deduce. */
  loadId?: number | null;
  /** Cada cuántos ms manda un ping. Default 30s. */
  intervalMs?: number;
}

interface PingPayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  route_load_id?: number | null;
}

/**
 * Pingea la posición GPS del driver al backend mientras `enabled` sea true.
 *
 * - Pide permiso foreground la primera vez.
 * - Cuando la app pasa a background, sigue tracking si tenemos permiso (las
 *   apps tipo Uber/Cornershop usan background location; acá lo dejamos en
 *   foreground only para no pelear con el flow de permisos doble).
 * - Si el ping falla (red, 5xx) lo ignora y reintenta en el próximo intervalo
 *   — no queremos bloquear la UI por GPS.
 */
export function useDriverLocationTracking({
  enabled,
  loadId,
  intervalMs = 30_000,
}: UseDriverLocationTrackingArgs): {
  status: 'idle' | 'permission-denied' | 'tracking' | 'error' | 'unavailable';
  lastPing: PingPayload | null;
} {
  const [status, setStatus] = useState<
    'idle' | 'permission-denied' | 'tracking' | 'error' | 'unavailable'
  >('idle');
  const [lastPing, setLastPing] = useState<PingPayload | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    async function start(): Promise<void> {
      if (!enabled) {
        setStatus('idle');
        return;
      }

      const Location = tryLoadLocation();
      if (!Location) {
        // APK viejo sin el módulo nativo. La app sigue funcionando sin GPS.
        setStatus('unavailable');
        return;
      }

      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (perm !== 'granted') {
        setStatus('permission-denied');
        return;
      }

      setStatus('tracking');

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5_000,
          distanceInterval: 10,
        },
        () => {
          // Solo guardamos la última lectura — el ping al server lo hace el timer.
        },
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      subRef.current = sub;

      const ping = async (): Promise<void> => {
        if (inFlightRef.current) return;
        if (appStateRef.current !== 'active') return;
        inFlightRef.current = true;
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const payload: PingPayload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
            speed: pos.coords.speed ?? null,
            heading: pos.coords.heading ?? null,
            recorded_at: new Date(pos.timestamp).toISOString(),
            route_load_id: loadId ?? null,
          };
          await apiRequest({
            method: 'POST',
            url: '/api/mobile/routes/location',
            data: payload,
          });
          if (!cancelled) setLastPing(payload);
        } catch {
          // Silencio: no rompemos UX por un ping perdido.
        } finally {
          inFlightRef.current = false;
        }
      };

      void ping();
      timerRef.current = setInterval(ping, intervalMs);
    }

    void start();

    const stateSub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
      stateSub.remove();
    };
  }, [enabled, loadId, intervalMs]);

  return { status, lastPing };
}
