import { keepPreviousData, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

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
    },
  },
});
