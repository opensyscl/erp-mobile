import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Mask,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Pattern de líneas decorativo para headers con bg de marca.
 *
 * Composición:
 *   1. Arcos concéntricos desde la esquina superior derecha — la "ola"
 *      orgánica que da personalidad. Stroke fino con un fade radial
 *      (más brillante cerca del origen, casi invisible hacia el centro).
 *   2. Líneas verticales sutiles a la izquierda — textura "papel" estilo
 *      blueprint, que respira.
 *   3. Vignette inferior muy sutil — ayuda al hero card flotante a
 *      ganar contraste cuando hace overlap.
 *
 * Inspirado en la app burgundy de referencia (las curvas orgánicas del
 * fondo) pero con la limpieza de un blueprint.
 */
interface HeaderPatternProps {
  height?: number;
  width?: number;
  color?: string;
  intensity?: number;
}

export function HeaderPattern({
  height = 380,
  width = 480,
  color = '#FFFFFF',
  intensity = 1,
}: HeaderPatternProps) {
  // Arcos: 7 anillos desde la esquina superior derecha (origen 0).
  const cx = width;
  const cy = 0;
  const arcs = [110, 170, 230, 290, 350, 420, 500];

  // Líneas verticales: 4 finas en la mitad izquierda, espaciadas como blueprint.
  const verticals = [12, 32, 56, 92];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Fade radial para los arcos: más visibles cerca de la esquina, se diluyen */}
          <LinearGradient id="arcMask" x1={1} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor="#fff" stopOpacity={1} />
            <Stop offset={0.55} stopColor="#fff" stopOpacity={0.4} />
            <Stop offset={1} stopColor="#fff" stopOpacity={0} />
          </LinearGradient>

          {/* Mascara para que los arcos se desvanezcan */}
          <Mask id="arcFade">
            <Rect width={width} height={height} fill="url(#arcMask)" />
          </Mask>

          {/* Vignette inferior */}
          <LinearGradient id="vg" x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0.6} stopColor="#000" stopOpacity={0} />
            <Stop offset={1} stopColor="#000" stopOpacity={0.1 * intensity} />
          </LinearGradient>

          {/* Fade horizontal para las líneas verticales: visibles a la izquierda, se diluyen al centro */}
          <LinearGradient id="vlinesMask" x1={0} y1={0} x2={1} y2={0}>
            <Stop offset={0} stopColor="#fff" stopOpacity={0.7} />
            <Stop offset={0.7} stopColor="#fff" stopOpacity={0} />
          </LinearGradient>
          <Mask id="vFade">
            <Rect width={width} height={height} fill="url(#vlinesMask)" />
          </Mask>
        </Defs>

        {/* Arcos concéntricos */}
        <Svg mask="url(#arcFade)">
          {arcs.map((r, i) => (
            <Circle
              key={`arc-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={(0.18 - i * 0.015) * intensity}
              fill="none"
            />
          ))}
        </Svg>

        {/* Líneas verticales finas (blueprint texture) */}
        <Svg mask="url(#vFade)">
          {verticals.map((x, i) => (
            <Line
              key={`v-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeOpacity={(0.06 - i * 0.005) * intensity}
            />
          ))}
        </Svg>

        {/* Vignette inferior */}
        <Rect width={width} height={height} fill="url(#vg)" />
      </Svg>
    </View>
  );
}
