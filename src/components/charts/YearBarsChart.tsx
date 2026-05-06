import { View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Fonts } from '~/theme/fonts';

interface MonthDatum {
  label: string;
  value: number;
  isCurrent?: boolean;
}

interface YearBarsChartProps {
  months: MonthDatum[];
  width: number;
  height?: number;
  brand: string;
  brandSubtle: string;
  fg: string;
  fgSubtle: string;
  border: string;
  /** Si true muestra una línea de promedio dashed sobre los datos */
  showAverage?: boolean;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  if (n === 0) return '0';
  return `$${Math.round(n)}`;
}

/**
 * Chart anual de barras con grid + labels eje Y + opcional línea de promedio.
 *
 * Layout:
 *   - 36px reservados a la izquierda para labels del eje Y
 *   - 24px abajo para labels de meses
 *   - Barras tienen padding 6px entre cada una
 *   - Mes actual se resalta con color brand pleno; los demás con brandSubtle
 */
export function YearBarsChart({
  months,
  width,
  height = 220,
  brand,
  brandSubtle,
  fg,
  fgSubtle,
  border,
  showAverage = true,
}: YearBarsChartProps) {
  const PAD_LEFT = 38;
  const PAD_RIGHT = 8;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 26;

  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;

  const values = months.map((m) => m.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  // Aseguramos un rango mínimo para que las barras chicas se vean
  const top = max > 0 ? max * 1.1 : 1;
  const bottom = min < 0 ? min * 1.1 : 0;
  const range = top - bottom;

  const yToPx = (v: number) => PAD_TOP + ((top - v) / range) * chartH;

  // Grid Y: 4 líneas
  const gridLines = [
    top,
    top - range * 0.25,
    top - range * 0.5,
    top - range * 0.75,
    bottom,
  ];

  // Width de cada barra
  const slotW = chartW / months.length;
  const barW = Math.max(slotW * 0.55, 6);

  // Promedio (excluyendo ceros para no sesgar cuando hay meses vacíos)
  const nonZero = values.filter((v) => v > 0);
  const avg = nonZero.length > 0 ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const avgY = yToPx(avg);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Grid lines + Y labels */}
        {gridLines.map((v, i) => {
          const y = yToPx(v);
          return (
            <Line
              key={`grid-${i}`}
              x1={PAD_LEFT}
              y1={y}
              x2={width - PAD_RIGHT}
              y2={y}
              stroke={border}
              strokeWidth={1}
              strokeDasharray={i === gridLines.length - 1 ? undefined : '2 4'}
              opacity={i === gridLines.length - 1 ? 0.7 : 0.5}
            />
          );
        })}
        {gridLines.map((v, i) => {
          const y = yToPx(v);
          return (
            <SvgText
              key={`ylabel-${i}`}
              x={PAD_LEFT - 6}
              y={y + 3}
              fill={fgSubtle}
              fontSize={9}
              fontFamily={Fonts.medium}
              textAnchor="end"
            >
              {formatCompact(v)}
            </SvgText>
          );
        })}

        {/* Bars */}
        {months.map((m, i) => {
          const x = PAD_LEFT + slotW * i + (slotW - barW) / 2;
          const v = m.value;
          if (v === 0) return null;
          const y = yToPx(Math.max(v, 0));
          const yZero = yToPx(0);
          const h = Math.abs(yZero - y);
          const fill = m.isCurrent ? brand : brandSubtle;
          return (
            <Rect
              key={`bar-${i}`}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={3}
              fill={fill}
            />
          );
        })}

        {/* Average dashed line */}
        {showAverage && avg > 0 ? (
          <Path
            d={`M ${PAD_LEFT} ${avgY} L ${width - PAD_RIGHT} ${avgY}`}
            stroke={fg}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.45}
          />
        ) : null}

        {/* X labels */}
        {months.map((m, i) => {
          const x = PAD_LEFT + slotW * i + slotW / 2;
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={x}
              y={height - 8}
              fill={m.isCurrent ? fg : fgSubtle}
              fontSize={9}
              fontFamily={m.isCurrent ? Fonts.semibold : Fonts.medium}
              textAnchor="middle"
            >
              {m.label}
            </SvgText>
          );
        })}

        {/* Active month dot */}
        {months.map((m, i) => {
          if (!m.isCurrent) return null;
          const x = PAD_LEFT + slotW * i + slotW / 2;
          return (
            <Path
              key={`dot-${i}`}
              d={`M ${x - 1.5} ${height - 18} L ${x + 1.5} ${height - 18}`}
              stroke={brand}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </View>
  );
}
