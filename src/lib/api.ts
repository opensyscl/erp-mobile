import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from './env';
import { secureStorage, StorageKeys } from './storage';

export class ApiError extends Error {
  status: number;
  code: string | null;
  errors: Record<string, string[]> | null;
  constructor(message: string, status: number, code: string | null, errors: Record<string, string[]> | null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Construye la baseURL según el modo de tenant configurado:
 * - header: baseURL fija + header X-Tenant
 * - subdomain: tenant insertado como subdominio
 */
function buildBaseURL(tenantSlug: string | null): string {
  if (env.tenantMode === 'subdomain' && tenantSlug) {
    const url = new URL(env.apiUrl);
    url.hostname = `${tenantSlug}.${url.hostname.replace(/^[^.]+\./, '')}`;
    return url.origin;
  }
  return env.apiUrl;
}

/**
 * Hooks que se inyectan desde el provider de Auth para manejar
 * 401 (logout forzado) sin que api.ts dependa del store directamente.
 */
type Hooks = {
  onUnauthorized?: () => void | Promise<void>;
  onForbidden?: () => void;
};
const hooks: Hooks = {};
export const setApiHooks = (h: Hooks) => Object.assign(hooks, h);

let cachedTenant: string | null = null;
let cachedToken: string | null = null;

export async function primeApiCache(): Promise<void> {
  const [tenant, token] = await Promise.all([
    secureStorage.get(StorageKeys.TenantSlug),
    secureStorage.get(StorageKeys.AuthToken),
  ]);
  cachedTenant = tenant;
  cachedToken = token;
}

export function setTenant(slug: string | null): void {
  cachedTenant = slug;
  if (slug) void secureStorage.set(StorageKeys.TenantSlug, slug);
  else void secureStorage.remove(StorageKeys.TenantSlug);
}

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (token) void secureStorage.set(StorageKeys.AuthToken, token);
  else void secureStorage.remove(StorageKeys.AuthToken);
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.apiUrl,
    timeout: 20000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Client': 'opensys-mobile',
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.baseURL = buildBaseURL(cachedTenant);
    if (cachedToken) {
      config.headers.set('Authorization', `Bearer ${cachedToken}`);
    }
    if (env.tenantMode === 'header' && cachedTenant) {
      config.headers.set('X-Tenant', cachedTenant);
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<{ message?: string; errors?: Record<string, string[]>; code?: string }>) => {
      const status = error.response?.status ?? 0;
      const data = error.response?.data;
      const url = error.config?.url ?? '';

      // 401 dispara logout SOLO si NO es un endpoint de auth.
      // Si pegamos /auth/login con creds malas → 401 propagado al componente.
      // Si pegamos /auth/logout con token vencido → 401 silencioso (ya estamos saliendo).
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/logout');

      if (status === 401 && !isAuthEndpoint) {
        await hooks.onUnauthorized?.();
      } else if (status === 403) {
        hooks.onForbidden?.();
      }

      throw new ApiError(
        data?.message ?? error.message ?? 'Error de red',
        status,
        data?.code ?? null,
        data?.errors ?? null,
      );
    },
  );

  return client;
}

export const api = createClient();

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<T>(config);
  return res.data;
}
