import { create } from 'zustand';

import { secureStorage, StorageKeys } from '~/lib/storage';

/**
 * Switcher de entorno (dev/prod) accesible vía gesto oculto en el logo.
 * Persiste la selección en SecureStore para que sobreviva al cierre de la app.
 *
 * Por diseño: el primer request luego del cambio ya usa la nueva URL (api.ts
 * lee `resolveApiUrl()` per-request via interceptor). Para realtime se llama a
 * `disconnectRealtime()` y el próximo subscribe re-conecta al host nuevo.
 */

export type DevEnvId = 'default' | 'local' | 'prod' | 'staging';

export interface EnvPreset {
  id: DevEnvId;
  label: string;
  description: string;
  apiUrl: string;
  realtimeHost: string;
  realtimePort: number;
  realtimeScheme: 'http' | 'https';
  realtimeKey: string;
}

export const ENV_PRESETS: EnvPreset[] = [
  {
    id: 'local',
    label: 'Local · LAN',
    description: 'ERP corriendo en Docker en tu compu (192.168.100.125)',
    apiUrl: 'http://192.168.100.125:8680',
    realtimeHost: '192.168.100.125',
    realtimePort: 9000,
    realtimeScheme: 'http',
    realtimeKey: 'reverb-key',
  },
  {
    id: 'staging',
    label: 'Staging',
    description: 'staging.erp.opensys.cl · Reverb en ws.erp.opensys.cl',
    apiUrl: 'https://staging.erp.opensys.cl',
    realtimeHost: 'ws.erp.opensys.cl',
    realtimePort: 443,
    realtimeScheme: 'https',
    realtimeKey: 'prod-key',
  },
  {
    id: 'prod',
    label: 'Producción',
    description: 'app.opensys.cl — clientes reales',
    apiUrl: 'https://app.opensys.cl',
    realtimeHost: 'app.opensys.cl',
    realtimePort: 443,
    realtimeScheme: 'https',
    realtimeKey: 'reverb-key',
  },
];

interface DevEnvState {
  current: DevEnvId;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setCurrent: (id: DevEnvId) => Promise<void>;
}

export const useDevEnvStore = create<DevEnvState>((set) => ({
  current: 'default',
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await secureStorage.get(StorageKeys.DevEnv);
      if (raw === 'local' || raw === 'prod' || raw === 'staging' || raw === 'default') {
        set({ current: raw, hydrated: true });
        return;
      }
    } catch {
      // ignore
    }
    set({ hydrated: true });
  },

  setCurrent: async (id) => {
    if (id === 'default') {
      await secureStorage.remove(StorageKeys.DevEnv);
    } else {
      await secureStorage.set(StorageKeys.DevEnv, id);
    }
    set({ current: id });
  },
}));

/**
 * Devuelve el preset activo, o `null` si está en 'default' (usar `env.ts`).
 */
export function getActivePreset(): EnvPreset | null {
  const id = useDevEnvStore.getState().current;
  if (id === 'default') return null;
  return ENV_PRESETS.find((p) => p.id === id) ?? null;
}
