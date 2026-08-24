/**
 * IDs de ventas hechas en ESTE dispositivo. Sirve para no mostrar un toast de
 * "Venta nueva" por tu propia venta — ya viste la confirmación del POS. El
 * evento realtime igual llega (y actualiza números/bell), solo suprimimos el
 * toast redundante. Set acotado con expiración simple (la venta y su broadcast
 * ocurren casi al mismo tiempo).
 */
const own = new Map<number, number>(); // saleId -> epoch ms
const TTL_MS = 30_000;

export function markOwnSale(id: number): void {
  own.set(id, Date.now());
  // Limpieza oportunista de entradas viejas.
  if (own.size > 50) {
    const now = Date.now();
    for (const [k, t] of own) if (now - t > TTL_MS) own.delete(k);
  }
}

export function isOwnSale(id: number): boolean {
  const t = own.get(id);
  if (t == null) return false;
  if (Date.now() - t > TTL_MS) {
    own.delete(id);
    return false;
  }
  return true;
}
