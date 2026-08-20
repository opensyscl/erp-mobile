/**
 * Variables de entorno expuestas por Expo (prefijo EXPO_PUBLIC_).
 * Las leemos en un solo lugar para tipar y validar.
 *
 * Soportamos override en runtime via `useDevEnvStore` — el primer request
 * después de cambiar el switch ya usa la nueva URL (api.ts lee
 * `resolveApiUrl()` per-request via interceptor).
 */

import { getActivePreset } from '~/stores/devEnv';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  console.warn('[env] EXPO_PUBLIC_API_URL no está definido. Usando fallback.');
}

const tenantMode = process.env.EXPO_PUBLIC_TENANT_MODE;
if (tenantMode && tenantMode !== 'header' && tenantMode !== 'subdomain') {
  console.warn(`[env] EXPO_PUBLIC_TENANT_MODE inválido: ${tenantMode}`);
}

export const env = {
  apiUrl: apiUrl ?? 'https://app.opensys.cl',
  tenantMode: (tenantMode ?? 'header') as 'header' | 'subdomain',
  realtime: {
    host: process.env.EXPO_PUBLIC_REVERB_HOST || null,
    port: Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 443),
    scheme: (process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'https') as 'https' | 'http',
    key: process.env.EXPO_PUBLIC_REVERB_KEY || null,
  },
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || null,
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || null,
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || null,
} as const;

/** API base URL — chequea override de devEnv primero. */
export function resolveApiUrl(): string {
  const preset = getActivePreset();
  return preset?.apiUrl ?? env.apiUrl;
}

/** Realtime config — chequea override de devEnv primero. */
export function resolveRealtime(): {
  host: string | null;
  port: number;
  scheme: 'http' | 'https';
  key: string | null;
} {
  const preset = getActivePreset();
  if (preset) {
    return {
      host: preset.realtimeHost,
      port: preset.realtimePort,
      scheme: preset.realtimeScheme,
      key: preset.realtimeKey,
    };
  }
  return env.realtime;
}
