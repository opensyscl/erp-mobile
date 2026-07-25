export function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fecha corta + hora para filas de actividad, ej. "Hoy 14:32", "Ayer 09:05",
 * "12 jul 18:40". Usa "Hoy"/"Ayer" para las fechas recientes.
 */
export function formatActivityDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const startOfDay = (x: Date): number =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);

  if (dayDiff === 0) return `Hoy ${time}`;
  if (dayDiff === 1) return `Ayer ${time}`;
  const date = d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  return `${date} ${time}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
