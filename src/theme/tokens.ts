/**
 * Design tokens — espejo del tema "cozy-cream-blue" del ERP web.
 * Ver `bookforce/erp/resources/css/app.css` para la fuente.
 *
 * Cuando NativeWind sirve, usa las clases (`bg-brand`, `text-fg-muted`).
 * Cuando un API es imperativo (Reanimated, gradientes, StatusBar) usa estos.
 */

/**
 * Aplica alpha a un color en formato `rgb(R G B)` o `rgb(R, G, B)` o `#RRGGBB`.
 * Necesario porque concatenar hex alpha (`color + '18'`) a strings `rgb(...)`
 * produce strings inválidas que RN no parsea — el alpha se pierde y el fondo
 * sale 100% opaco, ocultando texto del mismo color encima.
 */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const m = color.match(/rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*\)/);
  if (!m) return color;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

export const palette = {
  light: {
    bg: 'rgb(247 248 250)',
    bgSubtle: 'rgb(250 250 252)',
    bgMuted: 'rgb(235 235 237)',
    bgElevated: 'rgb(255 255 255)',
    fg: 'rgb(26 26 26)',
    fgMuted: 'rgb(90 90 90)',
    fgSubtle: 'rgb(144 144 144)',
    fgInverse: 'rgb(255 255 255)',
    border: 'rgb(232 230 224)',
    borderStrong: 'rgb(216 213 205)',
    brand: 'rgb(17 109 251)',
    brandFg: 'rgb(255 255 255)',
    brandSubtle: 'rgb(232 240 254)',
    secondary: 'rgb(157 186 247)',
    secondaryFg: 'rgb(255 255 255)',
    accent: 'rgb(142 203 208)',
    accentFg: 'rgb(255 255 255)',
    success: 'rgb(5 150 105)',
    warning: 'rgb(241 179 122)',
    danger: 'rgb(237 141 127)',
    purple: 'rgb(181 163 230)',
  },
  dark: {
    bg: 'rgb(13 14 17)',
    bgSubtle: 'rgb(18 19 23)',
    bgMuted: 'rgb(28 30 36)',
    bgElevated: 'rgb(22 23 28)',
    fg: 'rgb(245 245 248)',
    fgMuted: 'rgb(165 165 175)',
    fgSubtle: 'rgb(120 120 134)',
    fgInverse: 'rgb(13 14 17)',
    border: 'rgb(38 40 48)',
    borderStrong: 'rgb(58 60 70)',
    brand: 'rgb(88 145 255)',
    brandFg: 'rgb(13 14 17)',
    brandSubtle: 'rgb(22 38 78)',
    secondary: 'rgb(157 186 247)',
    secondaryFg: 'rgb(13 14 17)',
    accent: 'rgb(142 203 208)',
    accentFg: 'rgb(13 14 17)',
    success: 'rgb(64 192 128)',
    warning: 'rgb(240 168 64)',
    danger: 'rgb(248 113 113)',
    purple: 'rgb(181 163 230)',
  },
} as const;

/**
 * Sombras — sistema "Linear/Things". Soft + tight, nunca harsh.
 *
 * El color base es un azul-slate oscuro (#0a0d14), no negro puro — los negros
 * puros se ven sucios sobre fondos claros. Las opacities están tuneadas para
 * ser visibles pero discretas; valores más altos vienen de offsets más altos,
 * no de opacity.
 *
 * En Android `elevation` controla la altura de Material — mantenemos valores
 * bajos para que la sombra no se vea tipo "stack". iOS respeta los 4 props.
 */
const SHADOW_RGB = '10, 13, 20';
const sc = (alpha: number) => `rgba(${SHADOW_RGB}, ${alpha})`;

/**
 * Sombras vía `boxShadow` (RN 0.81 + new arch) — una sola prop, suave y difusa
 * por igual en iOS y Android (Android ya no usa el `elevation` Material, más
 * duro). Cada nivel es una sombra EN CAPAS: una de contacto (tight, cerca del
 * borde) + una ambiente (grande y tenue). Eso da la sensación smooth premium
 * sin verse pesada. Todo centralizado: cambiar acá afecta a toda la app.
 */
export const shadows = {
  /** Borders sutiles, hover state, chips presionados. */
  xs: {
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, color: sc(0.04) }],
  },
  /** Cards listadas, dropdowns, toolbars. */
  sm: {
    boxShadow: [
      { offsetX: 0, offsetY: 1, blurRadius: 2, spreadDistance: 0, color: sc(0.03) },
      { offsetX: 0, offsetY: 4, blurRadius: 12, spreadDistance: -2, color: sc(0.05) },
    ],
  },
  /** Cards elevated por default — Hero cards flotantes, Card variant="elevated". */
  md: {
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 4, spreadDistance: -1, color: sc(0.04) },
      { offsetX: 0, offsetY: 10, blurRadius: 24, spreadDistance: -3, color: sc(0.06) },
    ],
  },
  /** Sheets, modals, floating action bar, callouts importantes. */
  lg: {
    boxShadow: [
      { offsetX: 0, offsetY: 4, blurRadius: 8, spreadDistance: -2, color: sc(0.05) },
      { offsetX: 0, offsetY: 18, blurRadius: 40, spreadDistance: -6, color: sc(0.08) },
    ],
  },
  /** Hero callouts, splash overlays. */
  xl: {
    boxShadow: [
      { offsetX: 0, offsetY: 8, blurRadius: 16, spreadDistance: -4, color: sc(0.05) },
      { offsetX: 0, offsetY: 30, blurRadius: 60, spreadDistance: -10, color: sc(0.10) },
    ],
  },
} as const;

/**
 * Sombra tintada con color de marca — usar SOLO en CTAs primarios y hero
 * brand-colored cards para que destaquen. No abusar.
 */
export function brandShadow(brand: string, intensity: 'sm' | 'md' | 'lg' = 'md') {
  const cfg = {
    sm: { offset: 3, blur: 12, spread: -2, alpha: 0.22 },
    md: { offset: 6, blur: 20, spread: -3, alpha: 0.26 },
    lg: { offset: 12, blur: 32, spread: -6, alpha: 0.3 },
  }[intensity];
  // `brand` puede venir hex (#rrggbb) o rgb(...) — withAlpha normaliza ambos.
  return {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: cfg.offset,
        blurRadius: cfg.blur,
        spreadDistance: cfg.spread,
        color: withAlpha(brand, cfg.alpha),
      },
    ],
  };
}

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const motion = {
  duration: {
    instant: 100,
    fast: 180,
    base: 240,
    slow: 360,
    slower: 480,
  },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    spring: { damping: 18, stiffness: 220, mass: 1 },
    springSnappy: { damping: 22, stiffness: 320, mass: 0.8 },
  },
} as const;

export const layout = {
  screenPadding: 20,
  bottomTabHeight: 56,
  headerHeight: 56,
  inputHeight: 52,
  buttonHeight: 52,
  buttonHeightSm: 40,
} as const;

/** Stroke fino para iconos — espeja `--icon-stroke: 1` del web pero +0.5 para legibilidad mobile. */
export const iconDefaults = {
  size: 22,
  strokeWidth: 1.5,
} as const;

export type ColorScheme = 'light' | 'dark';
export type ColorToken = keyof typeof palette.light;
