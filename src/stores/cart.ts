import { create } from 'zustand';

export interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  totals: () => { count: number; total: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  add: (item, qty = 1) =>
    set((s) => {
      const existing = s.items.find((i) => i.product_id === item.product_id);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.product_id === item.product_id ? { ...i, quantity: i.quantity + qty } : i,
          ),
        };
      }
      return { items: [...s.items, { ...item, quantity: qty }] };
    }),

  setQty: (productId, qty) =>
    set((s) => ({
      items:
        qty <= 0
          ? s.items.filter((i) => i.product_id !== productId)
          : s.items.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i)),
    })),

  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) })),

  clear: () => set({ items: [] }),

  totals: () => {
    const items = get().items;
    return {
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
    };
  },
}));
