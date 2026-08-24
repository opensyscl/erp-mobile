import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiRequest } from '~/lib/api';
import { queryKeys } from '~/lib/queryKeys';
import { Channels, RealtimeEvents, useRealtime } from '~/realtime';
import { useTenantStore } from '~/stores/tenant';

export interface FleetDriver {
  id: number;
  name: string | null;
  lat: number;
  lng: number;
  loadStatus?: string | null;
}

interface FleetLocationsResponse {
  data: Array<{
    driver_id: number;
    driver_name: string | null;
    load_id: number | null;
    load_status?: string | null;
    lat: number;
    lng: number;
  }>;
}

/**
 * Posiciones de la flota EN VIVO. Semilla por REST (`/routes/fleet/locations`)
 * + updates por WS (`routes.driver.location`, ping ~8s por driver). Mover un
 * pin existente lo hace el mapa nativo, así que el merge de estado es barato;
 * por eso este evento se consume acá y NO invalida queries (evita la tormenta
 * de refetch — ver src/realtime/invalidation.ts).
 */
export function useFleetLocations(enabled = true) {
  const tenantId = useTenantStore((s) => s.tenant?.id ?? null);
  const [live, setLive] = useState<Record<number, FleetDriver>>({});

  const { data } = useQuery({
    queryKey: queryKeys.routes.fleet,
    queryFn: () =>
      apiRequest<FleetLocationsResponse>({
        method: 'GET',
        url: '/api/mobile/routes/fleet/locations',
      }),
    enabled,
    // El realtime hace el trabajo fino; esto es solo un fallback de resync.
    refetchInterval: 60_000,
  });

  // Semilla / resync inicial.
  useEffect(() => {
    if (!data?.data) return;
    setLive(() => {
      const seed: Record<number, FleetDriver> = {};
      for (const d of data.data) {
        seed[d.driver_id] = {
          id: d.driver_id,
          name: d.driver_name,
          lat: d.lat,
          lng: d.lng,
          loadStatus: d.load_status ?? null,
        };
      }
      return seed;
    });
  }, [data]);

  // Updates live: movemos solo el driver que pingueó.
  useRealtime(
    enabled && tenantId ? Channels.tenantRoutes(tenantId) : null,
    RealtimeEvents.RouteDriverLocation,
    (p) => {
      setLive((prev) => ({
        ...prev,
        [p.driver_id]: {
          id: p.driver_id,
          name: prev[p.driver_id]?.name ?? null,
          lat: p.lat,
          lng: p.lng,
          loadStatus: prev[p.driver_id]?.loadStatus ?? null,
        },
      }));
    },
  );

  return Object.values(live);
}
