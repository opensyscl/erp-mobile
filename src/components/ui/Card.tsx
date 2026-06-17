import { useColorScheme, type ViewProps } from 'react-native';
import { Surface } from 'heroui-native';

import { cn } from '~/lib/cn';
import { palette, shadows } from '~/theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'flat' | 'outlined' | 'elevated';
  /** Override del shadow level. Default: `md` para `elevated`, ninguno para los demás. */
  shadow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClass = {
  flat: 'bg-bg-subtle',
  outlined: 'bg-bg-elevated',
  elevated: 'bg-bg-elevated',
};

// `none` = `p-0` explícito: el Surface de heroui trae `p-4` en su base, hay que
// pisarlo o las cards sin padding lo heredarían.
const paddingClass = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * Card — wrapper sobre `Surface` de heroui-native (alpha.16, base nativewind).
 *
 * Mantiene la API pública previa (variant/shadow/padding/className/ViewProps) para
 * que las pantallas no cambien. Renderiza HeroUI por debajo:
 *   - `variant="none"` en el Surface → su theming queda neutro; el look lo damos
 *     con nuestras clases semánticas vía className.
 *   - **Borde vía `style`, NO `border-border`:** heroui define la clave de color
 *     `border` como `hsl(var(--border))` y nosotros como `rgb(var(--border))` →
 *     colisión. Dentro del Surface (componente heroui) `border-border` resolvía al
 *     borde de heroui (color equivocado/oscuro). Lo fijamos con el token explícito.
 *   - El merge interno del Surface (`tv()` + tailwind-merge) deja ganar a nuestro
 *     className; neutralizamos su `overflow-hidden` (el View previo era visible).
 *   - Sombra como antes: objeto RN vía `style`.
 */
export function Card({
  variant = 'outlined',
  shadow,
  padding = 'md',
  className,
  style,
  ...props
}: CardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = palette[scheme];

  // Default shadow level: 'md' para elevated, ninguno para los otros (limpio).
  const level = shadow ?? (variant === 'elevated' ? 'md' : 'none');
  const shadowStyle = level === 'none' ? null : shadows[level];

  // Borde solo en outlined, con color del token (sin pasar por `border-border`).
  const borderStyle =
    variant === 'outlined' ? { borderWidth: 1, borderColor: colors.border } : null;

  return (
    <Surface
      variant="none"
      {...props}
      style={[borderStyle, shadowStyle, style]}
      className={cn('overflow-visible rounded-2xl', variantClass[variant], paddingClass[padding], className)}
    />
  );
}
