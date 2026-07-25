/**
 * Tipos de las respuestas API del ERP OpenSys.
 * Se mantienen alineados con los Resources de Laravel.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  role: string | null;
  avatar_url: string | null;
  permissions: string[];
}

/** Helper para chequeo legible: ¿el user tiene ese rol? */
export function userHasRole(user: User | null | undefined, role: string): boolean {
  return user?.role === role;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  timezone: string;
  currency: string;
  modules: string[];
}

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  is_default: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant: Tenant;
  branches: Branch[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface DailyKPIs {
  sales_total: number;
  sales_count: number;
  ticket_avg: number;
  margin_pct: number;
  delta_pct: number;
  trend: number[];
  currency: string;
  as_of: string;
}

export interface RecentActivityItem {
  id: number;
  /** Boleta formateada, ej. "#000123". Vacío si la venta no tiene correlativo. */
  receipt: string;
  /** Cliente de la venta, o "Venta rápida" si fue sin cliente. */
  title: string;
  amount: number;
  created_at: string | null;
}

export interface RecentActivityResponse {
  items: RecentActivityItem[];
  currency: string;
}
