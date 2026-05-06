import Svg, { Path } from 'react-native-svg';

/**
 * Sparkline minimalista para mini KPI cards.
 * Usa Path para área + línea sobre puntos normalizados.
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  width = 56,
  height = 28,
  color,
  strokeWidth = 1.4,
}: SparklineProps) {
  if (data.length === 0) {
    return <Svg width={width} height={height} />;
  }

  const max = Math.max(...data, 0.01);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const xStep = data.length === 1 ? width : width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * xStep;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${(data.length - 1) * xStep} ${height} L 0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Path d={areaPath} fill={color} fillOpacity={0.12} />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
