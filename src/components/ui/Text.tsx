import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { cn } from '~/lib/cn';
import { Fonts } from '~/theme/fonts';

/**
 * Variants tipográficos pulidos con DM Sans.
 *
 * IMPORTANTE: lineHeight ≥ 1.4× fontSize porque DM Sans tiene descenders
 * prominentes (g, p, y, j, q) que se cortan con line-heights apretados.
 * Si vas a hardcodear un fontSize en otro lado, sigue la misma regla.
 */

type Variant =
  | 'display' // hero numbers, screen titles
  | 'title' // section headers
  | 'headline' // card titles
  | 'body' // párrafos
  | 'bodyStrong' // párrafo con énfasis suave
  | 'callout' // hints, contextual info
  | 'caption' // metadata
  | 'overline'; // ALL CAPS labels

type Tone = 'default' | 'muted' | 'subtle' | 'inverse' | 'brand' | 'success' | 'warning' | 'danger';

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontFamily: Fonts.semibold, fontSize: 27, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.semibold, fontSize: 19, lineHeight: 26, letterSpacing: -0.3 },
  headline: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodyStrong: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  callout: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  caption: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0 },
  overline: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};

const toneClass: Record<Tone, string> = {
  default: 'text-fg',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
  inverse: 'text-fg-inverse',
  brand: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  /** Activa tabular-nums (números mono-anchos). Default true para variants display/title. */
  tabular?: boolean;
}

export function Text({
  variant = 'body',
  tone = 'default',
  tabular,
  className,
  style,
  ...props
}: TextProps) {
  const isNumeric = tabular ?? (variant === 'display' || variant === 'title');

  return (
    <RNText
      {...props}
      className={cn(toneClass[tone], className)}
      style={[
        variantStyle[variant],
        isNumeric ? { fontVariant: ['tabular-nums'] } : null,
        // includeFontPadding=false en Android para evitar el padding extra que corta descenders
        // y deja el texto con altura natural
        { includeFontPadding: false } as TextStyle,
        style,
      ]}
    />
  );
}
