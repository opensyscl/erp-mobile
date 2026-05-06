/**
 * Tipografía única para toda la app.
 *
 * Usamos DM Sans — la sans geométrica de Colophon (Google Fonts):
 *   - Caracteres redondeados con buena personalidad
 *   - Pesos 400/500/600/700 disponibles
 *   - Excelente legibilidad y respiración
 *
 * Cuando referencies fuentes en estilos imperativos:
 *   { fontFamily: Fonts.semibold }
 */

export const Fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export type FontWeight = keyof typeof Fonts;
