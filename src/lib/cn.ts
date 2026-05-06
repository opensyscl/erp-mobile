import { type ClassValue, clsx } from 'clsx';

/**
 * Class name helper — finos para componer variantes con NativeWind.
 * Usamos clsx en vez de cn() porque tailwind-merge no entiende RN well-shorthands.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
