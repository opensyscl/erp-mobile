/**
 * Capa realtime de la app — punto de entrada único.
 *
 * Arquitectura:
 *   - events.ts       catálogo tipado de canales/eventos (espejo del backend)
 *   - client.ts       cliente pusher-js → Laravel Reverb (singleton, lazy)
 *   - invalidation.ts mapa central evento → query keys
 *   - useRealtimeHub  hub único montado en (app)/_layout.tsx
 *   - useRealtime     consumo ad-hoc de payloads en pantallas
 */
export {
  disconnectRealtime,
  getRealtimeState,
  onReconnected,
  onRealtimeStateChange,
  subscribe,
  type RealtimeState,
  type SubscribeHandle,
} from './client';
export * from './events';
export { invalidationRules, type RealtimeContext } from './invalidation';
export { useRealtime } from './useRealtime';
export { useRealtimeHub } from './useRealtimeHub';
