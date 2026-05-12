import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { apiRequest } from '~/lib/api';

export type TrackingStatus =
  | 'idle'
  | 'requesting'
  | 'tracking'
  | 'denied'
  | 'unavailable'
  | 'paused'
  | 'error';

export interface LastPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UseDriverTrackingOptions {
  /** Cada cuántos segundos forzar un ping aunque no haya cambiado distancia. */
  intervalSec?: number;
  /** Mínimos metros de movimiento para que watchPosition dispare. */
  distanceMeters?: number;
}

/**
 * Hook para que un driver autenticado envíe su GPS al backend.
 *
 * Pide permisos foreground, escucha cambios de posición y pingea
 * `POST /routes/location` (mapeado por buildClient → endpoint mobile).
 *
 * Maneja resiliencia básica: si un ping falla por red, lo descarta;
 * el próximo intento llega solo con el siguiente update.
 */
export function useDriverTracking({
  intervalSec = 8,
  distanceMeters = 5,
}: UseDriverTrackingOptions = {}) {
  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [lastPosition, setLastPosition] = useState<LastPosition | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastPingRef = useRef<number>(0);
  const lastDataRef = useRef<LastPosition | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const sendPing = useCallback(async () => {
    const data = lastDataRef.current;
    if (!data) return;
    try {
      // Normalizar heading: expo-location devuelve -1 cuando no hay dirección
      // (típicamente cuando estás parado). El backend valida 0-360, así que
      // mandamos null en esos casos.
      const validHeading =
        data.heading !== null && data.heading >= 0 && data.heading <= 360
          ? data.heading
          : null;
      // Speed: a veces viene -1 o negativo. Solo lo mandamos si es >= 0.
      const validSpeed =
        data.speed !== null && data.speed >= 0 ? data.speed : null;

      await apiRequest({
        method: 'POST',
        url: '/api/mobile/routes/location',
        data: {
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          speed: validSpeed,
          heading: validHeading,
        },
      });
      if (!mountedRef.current) return;
      setPingCount((c) => c + 1);
      setLastPingAt(Date.now());
      setError(null);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.message ?? 'Error enviando ubicación');
    }
  }, []);

  const stop = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setStatus('paused');
  }, []);

  const start = useCallback(async () => {
    setStatus('requesting');
    setError(null);

    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        setError('Permiso de ubicación denegado.');
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('unavailable');
        setError('Los servicios de ubicación están desactivados.');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalSec * 1000,
          distanceInterval: distanceMeters,
        },
        (position) => {
          const data: LastPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 0,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: Date.now(),
          };
          lastDataRef.current = data;
          setLastPosition(data);
          setStatus('tracking');

          const now = Date.now();
          if (now - lastPingRef.current >= intervalSec * 1000) {
            lastPingRef.current = now;
            void sendPing();
          }
        },
      );

      watcherRef.current = subscription;

      // Tick de respaldo: si watchPosition no dispara seguido (driver
      // parado), asegurar un ping cada N segundos con la última pos.
      tickerRef.current = setInterval(() => {
        const now = Date.now();
        if (lastDataRef.current && now - lastPingRef.current >= intervalSec * 1000) {
          lastPingRef.current = now;
          void sendPing();
        }
      }, 2000);

      setStatus('tracking');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'Error iniciando GPS');
    }
  }, [intervalSec, distanceMeters, sendPing]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      watcherRef.current?.remove();
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  return {
    status,
    lastPosition,
    pingCount,
    lastPingAt,
    error,
    start,
    stop,
  };
}
