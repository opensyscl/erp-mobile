import { useEffect, useState } from 'react';

/**
 * Posición GPS actual del dispositivo para PINTAR el mapa (no confundir con
 * useDriverLocationTracking, que ADEMÁS pingea al server según el toggle de
 * compartir). Este hook solo lee la ubicación local para ubicar al driver en
 * el mapa. Lazy-load de expo-location (módulo nativo) con fallback silencioso.
 */
type LocationModule = typeof import('expo-location');
let LocationLib: LocationModule | null = null;
let attempted = false;

function loadLocation(): LocationModule | null {
  if (attempted) return LocationLib;
  attempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LocationLib = require('expo-location') as LocationModule;
  } catch {
    LocationLib = null;
  }
  return LocationLib;
}

export type PositionStatus = 'idle' | 'granted' | 'denied' | 'unavailable' | 'error';

export function useCurrentPosition(enabled = true): {
  position: { lat: number; lng: number } | null;
  status: PositionStatus;
} {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<PositionStatus>('idle');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let sub: { remove: () => void } | null = null;

    (async () => {
      const Location = loadLocation();
      if (!Location) {
        setStatus('unavailable');
        return;
      }
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }
        setStatus('granted');

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setPosition({ lat: current.coords.latitude, lng: current.coords.longitude });
        }

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8_000, distanceInterval: 15 },
          (pos) => {
            if (!cancelled) setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
        );
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { position, status };
}
