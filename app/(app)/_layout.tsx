import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { useDriverLocationTracking } from '~/hooks/useDriverLocationTracking';
import { apiRequest } from '~/lib/api';
import { queryKeys } from '~/lib/queryKeys';
import { useRealtimeHub } from '~/realtime';
import { useAuthStore } from '~/stores/auth';

/**
 * Layout del área autenticada — Stack nativo con transición push:
 * las pantallas de detalle entran deslizando desde la derecha y se apilan
 * sobre las tabs (swipe-back en iOS, back predictivo en Android).
 *
 * Las 7 pestañas viven en el grupo (tabs); todo lo demás bajo (app)/ es una
 * pantalla pusheada del stack.
 */
export default function AppLayout() {
  const user = useAuthStore((s) => s.user);

  // Hub realtime único: invalidación central de queries + feed del bell +
  // resync tras reconexión. Vive a nivel sesión, por encima de tabs y
  // pantallas pusheadas.
  useRealtimeHub();

  // GPS tracking del driver — solo cuando es driver y tiene una ruta activa.
  // El backend deduce el load_id si no lo pasamos, pero lo precargamos para
  // que el primer ping ya quede asociado correctamente.
  const isDriverRole = user?.role === 'tenant_driver';
  const { data: todayLoad } = useQuery({
    queryKey: queryKeys.routes.today('self'),
    queryFn: () =>
      apiRequest<{ data: { id: number } | null }>({
        method: 'GET',
        url: '/api/mobile/routes/today',
      }),
    enabled: isDriverRole,
    // SOLO realtime — sin polling. El hub invalida ['routes'] cuando llegan
    // routes.load.created / confirmed / closed por Reverb.
    refetchInterval: false,
  });
  // El driver puede compartir ubicación aunque todavía no tenga una carga
  // asignada hoy — el ping manda route_load_id null (el backend igual lo asocia
  // a su carga abierta si aparece una). Antes exigía carga activa, y por eso
  // "Iniciar envío" no hacía nada cuando el driver no tenía ruta.
  useDriverLocationTracking({
    enabled: isDriverRole,
    loadId: todayLoad?.data?.id ?? null,
    intervalMs: 30_000,
  });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
