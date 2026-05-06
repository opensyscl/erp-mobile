/**
 * Tipos del API de Routes (módulo de reparto del ERP).
 * Espejo de los Resources de Laravel en `app/Http/Resources/Api/MobileRoute*`.
 */

export interface RouteClient {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface RouteOrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  subtotal: number;
}

export type RouteOrderStatus = 'pending' | 'delivered' | 'cancelled';
export type RoutePaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface RouteOrder {
  id: number;
  order_number: string;
  status: RouteOrderStatus;
  payment_status: RoutePaymentStatus;
  subtotal: number;
  tax: number;
  total: number;
  amount_paid: number;
  payment_method: string | null;
  notes: string | null;
  client: RouteClient | null;
  items: RouteOrderItem[];
  created_at: string | null;
}

export interface RouteLoadProgress {
  total: number;
  delivered: number;
  pending: number;
  pct: number;
}

export interface RouteLoadAmounts {
  total: number;
  collected: number;
  pending: number;
}

export interface RouteLoad {
  id: number;
  status: 'open' | 'closed' | 'cancelled';
  notes: string | null;
  driver: { id: number; name: string } | null;
  branch: { id: number; name: string } | null;
  orders: RouteOrder[];
  progress: RouteLoadProgress;
  amounts: RouteLoadAmounts;
  created_at: string | null;
  closed_at: string | null;
  confirmed_at: string | null;
}
