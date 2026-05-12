import { create } from 'zustand';
import { apiRequest, setAuthToken } from '~/lib/api';
import { disconnectRealtime } from '~/lib/realtime';
import { secureStorage, StorageKeys } from '~/lib/storage';
import type { AuthResponse, User } from '~/types/api';
import { useTenantStore } from './tenant';

type Status = 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: Status;
  user: User | null;
  token: string | null;
  hydrate: () => Promise<void>;
  login: (input: { email: string; password: string; tenantSlug?: string | null }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  token: null,

  hydrate: async () => {
    const [token, userRaw] = await Promise.all([
      secureStorage.get(StorageKeys.AuthToken),
      secureStorage.get(StorageKeys.AuthUser),
    ]);
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        setAuthToken(token);
        set({ status: 'authenticated', token, user });
        return;
      } catch {
        // datos corruptos — caer a unauth
      }
    }
    set({ status: 'unauthenticated', token: null, user: null });
  },

  login: async ({ email, password, tenantSlug }) => {
    set({ status: 'authenticating' });
    // Si vino slug explícito, lo seteamos antes para que el interceptor mande
    // X-Tenant. Si no, el backend deduce el tenant del email.
    if (tenantSlug) {
      await useTenantStore.getState().setSlug(tenantSlug);
    }
    try {
      const res = await apiRequest<AuthResponse>({
        method: 'POST',
        url: '/api/mobile/auth/login',
        data: { email, password, device_name: 'mobile' },
      });
      setAuthToken(res.token);
      await secureStorage.set(StorageKeys.AuthUser, JSON.stringify(res.user));
      // Backend devolvió el tenant resuelto → siempre lo guardamos
      await useTenantStore.getState().setSlug(res.tenant.slug);
      await useTenantStore.getState().setTenantData(res.tenant, res.branches);
      set({ status: 'authenticated', token: res.token, user: res.user });
    } catch (error) {
      set({ status: 'unauthenticated', token: null, user: null });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiRequest({ method: 'POST', url: '/api/mobile/auth/logout' });
    } catch {
      // si el server rechaza, limpiamos local igual
    }
    disconnectRealtime();
    setAuthToken(null);
    await Promise.all([
      secureStorage.remove(StorageKeys.AuthToken),
      secureStorage.remove(StorageKeys.AuthUser),
    ]);
    await useTenantStore.getState().reset();
    set({ status: 'unauthenticated', token: null, user: null });
  },
}));
