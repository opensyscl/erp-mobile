import { create } from 'zustand';

export type NotifKind =
  | 'route.load.created'
  | 'route.load.confirmed'
  | 'route.load.closed'
  | 'route.order.created'
  | 'route.order.delivered'
  | 'route.order.cancelled'
  | 'route.order.payment'
  | 'sale.created'
  | 'stock.changed'
  | 'approval.changed';

export interface InAppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  receivedAt: number; // epoch ms
  payload?: Record<string, unknown>;
}

interface NotifState {
  list: InAppNotification[];
  lastSeenAt: number;
  push: (n: Omit<InAppNotification, 'id' | 'receivedAt'>) => void;
  markAllSeen: () => void;
  clear: () => void;
}

const MAX = 80;

export const useNotificationsStore = create<NotifState>((set) => ({
  list: [],
  lastSeenAt: 0,

  push: (n) =>
    set((s) => {
      const item: InAppNotification = {
        ...n,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        receivedAt: Date.now(),
      };
      return { list: [item, ...s.list].slice(0, MAX) };
    }),

  markAllSeen: () => set({ lastSeenAt: Date.now() }),

  clear: () => set({ list: [], lastSeenAt: Date.now() }),
}));

/** Selector: cuántas notifs llegaron desde el último markAllSeen. */
export function useUnseenCount(): number {
  return useNotificationsStore((s) => s.list.filter((n) => n.receivedAt > s.lastSeenAt).length);
}
