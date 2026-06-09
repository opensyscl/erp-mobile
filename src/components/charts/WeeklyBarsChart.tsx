import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export interface WeeklyBarDatum {
  /** Etiqueta corta visible bajo la barra (Lun, Mar…). */
  label: string;
  /** Valor numérico, escalable contra el max. */
  value: number;
  /** Marca este día como "el actual" — dibuja dot + tooltip. */
  current?: boolean;
}

/**
 * Bar chart semanal con estética wedge (dos rectángulos cream/dark side-by-side
 * por barra). Inspirado en el referente "User in The Last Week".
 *
 * Si algún punto tiene `current: true`, se dibuja un dot blanco con halo y un
 * tooltip pill arriba con el valor formateado.
 */
export function WeeklyBarsChart({
  data,
  width,
  height = 180,
  tooltipFormat = (n) => `$${n.toLocaleString('es-CL')}`,
  yTicks = 2,
}: {
  data: WeeklyBarDatum[];
  width: number;
  height?: number;
  tooltipFormat?: (n: number) => string;
  yTicks?: number;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const PAD_LEFT = 38;
  const PAD_RIGHT = 8;
  const PAD_TOP = 38; // espacio para tooltip
  const PAD_BOTTOM = 26; // espacio para labels X
  const chartW = width - PAD_LEFT - PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  // Redondear hacia arriba al próximo "nice" para los ticks (10K, 20K, 40K, etc.)
  const niceMax = niceCeil(maxValue);

  const barSlotW = chartW / data.length;
  const barW = Math.min(40, barSlotW * 0.62);
  const halfW = barW / 2 - 1; // -1 para separación visual

  const cream = scheme === 'dark' ? 'rgba(255, 249, 230, 0.18)' : '#F5EFE0';
  const dark = scheme === 'dark' ? '#0F1116' : '#1A1A1A';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Y axis tick lines + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = PAD_TOP + (chartH * i) / yTicks;
          return (
            <Line
              key={i}
              x1={PAD_LEFT}
              x2={width - PAD_RIGHT}
              y1={y}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.7}
            />
          );
        })}

        {data.map((d, i) => {
          const ratio = d.value / niceMax;
          const h = Math.max(2, chartH * ratio);
          const x = PAD_LEFT + i * barSlotW + barSlotW / 2;
          const y = PAD_TOP + chartH - h;
          const rectRadius = Math.min(6, h / 2);

          return (
            <Rect
              key={`bar-${i}`}
              x={x - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx={rectRadius}
              ry={rectRadius}
              fill={cream}
            />
          );
        })}

        {/* Mitad derecha dark superpuesta */}
        {data.map((d, i) => {
          const ratio = d.value / niceMax;
          const h = Math.max(2, chartH * ratio);
          const x = PAD_LEFT + i * barSlotW + barSlotW / 2;
          const y = PAD_TOP + chartH - h;
          const rectRadius = Math.min(6, h / 2);
          return (
            <Rect
              key={`barR-${i}`}
              x={x}
              y={y}
              width={halfW}
              height={h}
              rx={rectRadius}
              ry={rectRadius}
              fill={dark}
            />
          );
        })}

        {/* Vertical line + dot tooltip on current */}
        {data.map((d, i) => {
          if (!d.current) return null;
          const ratio = d.value / niceMax;
          const h = Math.max(2, chartH * ratio);
          const x = PAD_LEFT + i * barSlotW + barSlotW / 2;
          const y = PAD_TOP + chartH - h;
          return (
            <Fragment key={`current-${i}`}>
              <Line
                x1={x}
                x2={x}
                y1={PAD_TOP - 14}
                y2={PAD_TOP + chartH}
                stroke={colors.fg}
                strokeWidth={1}
                opacity={0.35}
                strokeDasharray="3 3"
              />
              <Circle
                cx={x}
                cy={y}
                r={6}
                fill={colors.bgElevated}
                stroke={colors.fg}
                strokeWidth={2}
              />
            </Fragment>
          );
        })}
      </Svg>

      {/* Y labels overlay */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = PAD_TOP + (chartH * i) / yTicks - 7;
        const val = niceMax * (1 - i / yTicks);
        return (
          <View
            key={`yl-${i}`}
            style={{ position: 'absolute', left: 0, top: y, width: PAD_LEFT - 4, alignItems: 'flex-end' }}
          >
            <Text
              style={
                {
                  fontFamily: Fonts.regular,
                  fontSize: 10,
                  lineHeight: 14,
                  color: colors.fgSubtle,
                  fontVariant: ['tabular-nums'],
                  includeFontPadding: false,
                } as never
              }
            >
              {formatTick(val)}
            </Text>
          </View>
        );
      })}

      {/* X labels */}
      {data.map((d, i) => (
        <View
          key={`xl-${i}`}
          style={{
            position: 'absolute',
            top: height - PAD_BOTTOM + 6,
            left: PAD_LEFT + i * barSlotW,
            width: barSlotW,
            alignItems: 'center',
          }}
        >
          <Text
            style={
              {
                fontFamily: Fonts.medium,
                fontSize: 11,
                lineHeight: 14,
                color: d.current ? colors.fg : colors.fgSubtle,
                includeFontPadding: false,
              } as never
            }
          >
            {d.label}
          </Text>
        </View>
      ))}

      {/* Tooltip on current */}
      {data.map((d, i) => {
        if (!d.current) return null;
        const ratio = d.value / niceMax;
        const h = Math.max(2, chartH * ratio);
        const x = PAD_LEFT + i * barSlotW + barSlotW / 2;
        const y = PAD_TOP + chartH - h;
        // tooltip pill anchorado al centro de la barra current, encima del dot
        return (
          <View
            key={`tip-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: Math.max(2, y - 30),
              left: x - 50,
              width: 100,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <Text
                style={
                  {
                    fontFamily: Fonts.semibold,
                    fontSize: 12,
                    lineHeight: 16,
                    color: colors.fg,
                    fontVariant: ['tabular-nums'],
                    includeFontPadding: false,
                  } as never
                }
              >
                {tooltipFormat(d.value)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function niceCeil(n: number): number {
  if (n <= 0) return 10;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const m = n / base;
  let nice: number;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 4) nice = 4;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}
