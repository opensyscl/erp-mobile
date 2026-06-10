import NetInfo from '@react-native-community/netinfo';
import { focusManager, keepPreviousData, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { ApiError } from './api';

// TanStack Query en RN no detecta red ni foreground solo — hay que cablearlo:
//   - onlineManager + NetInfo → refetchOnReconnect funciona al recuperar red.
//   - focusManager + AppState → las queries saben cuándo la app está activa.
// El resync grueso tras perder el socket lo maneja useRealtimeHub vía
// onReconnected() (los eventos WS perdidos no se recuperan).
// El flag vive en globalThis porque fast refresh re-evalúa este módulo y
// AppState.addEventListener acumularía un listener por recarga.
const g = globalThis as typeof globalThis & { __rqManagersWired?: boolean };
if (!g.__rqManagersWired) {
  g.__rqManagersWired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // Mantiene la última data conocida mientras refetchea — evita el flash
      // blanco al cambiar de tab y volver (Sthamly 08/06). Para deshabilitar
      // en una query puntual, pasale placeholderData: undefined en options.
      placeholderData: keepPreviousData,
    },
    mutations: {
      retry: false,
      // Con onlineManager cableado, el default 'online' PAUSA mutaciones sin
      // red (checkout colgado sin feedback). 'always' dispara igual y falla
      // rápido → el usuario ve el toast de error como siempre.
      networkMode: 'always',
    },
  },
});
