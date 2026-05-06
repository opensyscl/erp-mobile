import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { palette } from '~/theme/tokens';
import { useColorScheme } from '~/hooks/useColorScheme';

/**
 * Ilustraciones abstractas geométricas para hero cards. Composiciones
 * intencionales con la paleta de marca — no genéricas, no slop.
 */

interface SpotProps {
  size?: number;
}

/**
 * "Stack" — tres hojas/registros apilados con un número de marca encima.
 * Sugiere: aprobaciones pendientes, registros por revisar.
 */
export function StackSpot({ size = 96 }: SpotProps) {
  const scheme = useColorScheme();
  const c = palette[scheme];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Hoja de fondo (rotada izquierda) */}
      <G transform="translate(50 50) rotate(-8) translate(-30 -36)">
        <Rect width={60} height={72} rx={10} fill={c.brandSubtle} />
      </G>
      {/* Hoja media (rotada derecha) */}
      <G transform="translate(50 50) rotate(6) translate(-30 -36)">
        <Rect width={60} height={72} rx={10} fill={c.bgElevated} stroke={c.border} strokeWidth={1} />
      </G>
      {/* Hoja delantera */}
      <G transform="translate(20 18)">
        <Rect width={60} height={72} rx={10} fill={c.bgElevated} stroke={c.borderStrong} strokeWidth={1} />
        {/* Líneas de contenido */}
        <Rect x={10} y={14} width={28} height={3} rx={1.5} fill={c.fgSubtle} opacity={0.5} />
        <Rect x={10} y={22} width={40} height={3} rx={1.5} fill={c.bgMuted} />
        <Rect x={10} y={30} width={32} height={3} rx={1.5} fill={c.bgMuted} />
        {/* Bullet brand */}
        <Circle cx={14} cy={48} r={3} fill={c.brand} />
        <Rect x={22} y={46} width={28} height={3} rx={1.5} fill={c.fgMuted} opacity={0.6} />
        <Circle cx={14} cy={58} r={3} fill={c.accent} />
        <Rect x={22} y={56} width={20} height={3} rx={1.5} fill={c.fgMuted} opacity={0.6} />
      </G>
    </Svg>
  );
}

/**
 * "Pulse" — círculo de marca + ondas concéntricas. Sugiere actividad/realtime.
 */
export function PulseSpot({ size = 96 }: SpotProps) {
  const scheme = useColorScheme();
  const c = palette[scheme];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Circle cx={50} cy={50} r={40} stroke={c.brand} strokeWidth={1} opacity={0.12} />
      <Circle cx={50} cy={50} r={28} stroke={c.brand} strokeWidth={1} opacity={0.22} />
      <Circle cx={50} cy={50} r={18} fill={c.brandSubtle} />
      <Circle cx={50} cy={50} r={10} fill={c.brand} />
    </Svg>
  );
}

/**
 * "Bars" — gráfico de barras minimalista para sección de ventas/reportes.
 */
export function BarsSpot({ size = 96 }: SpotProps) {
  const scheme = useColorScheme();
  const c = palette[scheme];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Rect x={14} y={56} width={14} height={32} rx={3} fill={c.brandSubtle} />
      <Rect x={32} y={42} width={14} height={46} rx={3} fill={c.brandSubtle} />
      <Rect x={50} y={28} width={14} height={60} rx={3} fill={c.brand} />
      <Rect x={68} y={48} width={14} height={40} rx={3} fill={c.accent} />
      {/* Línea de baseline */}
      <Path d="M10 88 L 90 88" stroke={c.border} strokeWidth={1} />
      {/* Punto destacado encima de la barra brand */}
      <Circle cx={57} cy={28} r={3} fill={c.brand} stroke={c.bgElevated} strokeWidth={2} />
    </Svg>
  );
}
