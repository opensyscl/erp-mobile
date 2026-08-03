import { create } from 'zustand';

/**
 * Estado único del envío de ubicación del conductor.
 *
 * `sharing` es el interruptor que controla el conductor desde "Mi ubicación":
 * mientras esté en false, NO se emite GPS (arranca apagado — consentimiento
 * explícito). Antes había dos pingers (uno global y otro por pantalla) y el
 * botón "Pausar" solo frenaba uno; ahora hay un solo emisor gobernado por este
 * flag, así "Pausar" detiene de verdad el envío.
 */
export type TrackingStatus =
  | 'idle'
  | 'paused'
  | 'permission-denied'
  | 'tracking'
  | 'error'
  | 'unavailable';

export interface TrackingPing {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  route_load_id?: number | null;
}

interface TrackingState {
  sharing: boolean;
  status: TrackingStatus;
  lastPing: TrackingPing | null;
  pingCount: number;
  setSharing: (sharing: boolean) => void;
  toggleSharing: () => void;
  _setStatus: (status: TrackingStatus) => void;
  _setLastPing: (ping: TrackingPing | null) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  sharing: false,
  status: 'idle',
  lastPing: null,
  pingCount: 0,
  // Al apagar el envío se resetea el contador de la sesión.
  setSharing: (sharing) => set(sharing ? { sharing } : { sharing, pingCount: 0 }),
  toggleSharing: () => set((s) => ({ sharing: !s.sharing, pingCount: s.sharing ? 0 : s.pingCount })),
  _setStatus: (status) => set({ status }),
  _setLastPing: (lastPing) => set((s) => ({ lastPing, pingCount: s.pingCount + 1 })),
}));
