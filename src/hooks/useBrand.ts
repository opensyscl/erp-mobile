import { useColorScheme } from './useColorScheme';
import { useTenantStore } from '~/stores/tenant';
import { palette } from '~/theme/tokens';

/**
 * Brand colors dinámicos por tenant.
 *
 * Cada tenant define su `brand_color` en `settings.brand_color` (hex).
 * Este hook lee ese color y devuelve la triada `{brand, brandFg, brandSubtle}`
 * — fallback a la paleta default cobalto si el tenant no tiene color o el
 * formato es inválido.
 *
 * Lógica de derivación:
 *   - `brand`        = el hex del tenant (RGB)
 *   - `brandFg`      = blanco si el brand es oscuro, negro si es claro
 *   - `brandSubtle`  = mismo tono pero muy clarito (mezcla 92% con blanco)
 *
 * Usar en cualquier lugar donde antes hacías `palette[scheme].brand`.
 * Para clases NativeWind (`bg-brand`, `text-brand`) no aplica — esos siguen
 * el CSS var estático global. Reemplaza por inline `style` cuando importe.
 */

interface BrandColors {
  brand: string;
  brandFg: string;
  brandSubtle: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace('#', '').trim();
  let v = cleaned;
  if (v.length === 3) {
    v = v
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

function rgbToString([r, g, b]: [number, number, number]): string {
  return `rgb(${r} ${g} ${b})`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const norm = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

function lighten([r, g, b]: [number, number, number], factor: number): [number, number, number] {
  return [
    Math.min(255, Math.round(r + (255 - r) * factor)),
    Math.min(255, Math.round(g + (255 - g) * factor)),
    Math.min(255, Math.round(b + (255 - b) * factor)),
  ];
}

export function useBrand(): BrandColors {
  const scheme = useColorScheme();
  const tenantBrand = useTenantStore((s) => s.tenant?.brand_color ?? null);
  const fallback = palette[scheme];

  if (!tenantBrand) {
    return {
      brand: fallback.brand,
      brandFg: fallback.brandFg,
      brandSubtle: fallback.brandSubtle,
    };
  }

  const rgb = hexToRgb(tenantBrand);
  if (!rgb) {
    return {
      brand: fallback.brand,
      brandFg: fallback.brandFg,
      brandSubtle: fallback.brandSubtle,
    };
  }

  const lum = relativeLuminance(rgb);
  const fg = lum > 0.5 ? '#0F0F12' : '#FFFFFF';
  const subtle = lighten(rgb, 0.88);

  return {
    brand: rgbToString(rgb),
    brandFg: fg,
    brandSubtle: rgbToString(subtle),
  };
}
