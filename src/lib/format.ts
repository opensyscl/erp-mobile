export function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}
