/**
 * Design tokens — espejo del tema "cozy-cream-blue" del ERP web.
 * Ver `bookforce/erp/resources/css/app.css` para la fuente.
 *
 * Cuando NativeWind sirve, usa las clases (`bg-brand`, `text-fg-muted`).
 * Cuando un API es imperativo (Reanimated, gradientes, StatusBar) usa estos.
 */

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
 * Sombras — extra suaves para mantener la sensación "cozy".
 * Calibradas contra `--shadow-regular-xs: 0 1px 2px 0 #0a0d1408` del web (8% alpha).
 */
export const shadows = {
  xs: {
    shadowColor: '#0a0d14',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0a0d14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0a0d14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0a0d14',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

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
