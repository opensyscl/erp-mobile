import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { formatCLP } from '~/lib/format';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface OrderStateBreakdown {
  completed: number;
  refunded?: number;
  pending?: number;
}

/**
 * Hero card de Margen de Ganancia — inspirado en el bloque "Margen de Ganancia"
 * de la web. Donut con margin% real (sweep proporcional al margin_pct), monto
 * central, breakdown Ingresos/Costos, progress de meta y barra de estado de
 * órdenes. En empty state (sin ventas) oculta el donut y muestra placeholder.
 *
 * Tone alterna el color de fondo (brand cobalto o neutral elevado).
 */
export function MarginGauge({
  amount,
  count,
  countLabel = 'Órdenes',
  marginPct,
  costs,
  goal,
  orders,
  periodLabel,
  tone = 'brand',
  loading,
}: {
  amount: number;
  count: number;
  countLabel?: string;
  marginPct: number;
  costs?: number;
  goal?: number;
  orders?: OrderStateBreakdown;
  periodLabel?: string;
  tone?: 'brand' | 'neutral';
  loading?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const isBrand = tone === 'brand';
  const hasData = count > 0;

  const bg = isBrand ? brand.brand : colors.bgElevated;
  const fg = isBrand ? brand.brandFg : colors.fg;
  const fgMuted = isBrand ? brand.brandFg : colors.fgMuted;
  const trackColor = isBrand ? 'rgba(255,255,255,0.18)' : colors.bgMuted;
  const arcColor = isBrand ? 'rgba(255,255,255,0.95)' : brand.brand;
  const pillBg = isBrand ? 'rgba(255,255,255,0.18)' : colors.bgMuted;

  // Donut geometry — arc cubre el 75% del círculo (3/4 de vuelta).
  const SIZE = 156;
  const STROKE = 12;
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const sweepFrac = 0.75;
  const totalDash = c * sweepFrac;
  const pct = Math.max(0, Math.min(100, marginPct)) / 100;
  const filled = totalDash * pct;

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 20,
        padding: 18,
        borderWidth: isBrand ? 0 : 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <Text
          style={
            {
              fontFamily: Fonts.semibold,
              fontSize: 15,
              lineHeight: 20,
              color: fg,
              opacity: isBrand ? 0.95 : 1,
              letterSpacing: -0.2,
              includeFontPadding: false,
            } as never
          }
        >
          Margen de Ganancia
        </Text>
        {periodLabel ? (
          <View
            style={{
              backgroundColor: pillBg,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}
          >
            <Text
              style={
                {
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  lineHeight: 14,
                  color: fg,
                  opacity: isBrand ? 0.9 : 0.7,
                  includeFontPadding: false,
                } as never
              }
            >
              {periodLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Donut + centro — siempre visible (ghost track en empty state) */}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
            {/* Track 270° (siempre) */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              stroke={trackColor}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${totalDash} ${c}`}
              strokeDashoffset={c * 0.125}
              transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
            />
            {/* Arc proporcional al margin% (solo si hay data) */}
            {hasData && filled > 0 ? (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                stroke={arcColor}
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${filled} ${c}`}
                strokeDashoffset={c * 0.125}
                transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
              />
            ) : null}
          </Svg>
          <View style={{ alignItems: 'center', maxWidth: SIZE - 28 }}>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={
                    {
                      fontFamily: Fonts.semibold,
                      fontSize: 30,
                      lineHeight: 36,
                      color: fg,
                      letterSpacing: -0.8,
                      fontVariant: ['tabular-nums'],
                      includeFontPadding: false,
                    } as never
                  }
                >
                  {formatCLP(amount)}
                </Text>
                <Text
                  style={
                    {
                      fontFamily: Fonts.regular,
                      fontSize: 12,
                      lineHeight: 16,
                      color: fgMuted,
                      opacity: isBrand ? 0.75 : 0.7,
                      marginTop: 3,
                      letterSpacing: 0.2,
                      includeFontPadding: false,
                    } as never
                  }
                >
                  {hasData ? `${count} ${countLabel}` : 'Sin ventas todavía'}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Pill: margin% real (siempre que haya data) */}
        {hasData ? (
          <View
            style={{
              marginTop: -8,
              backgroundColor: pillBg,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 11,
                  lineHeight: 16,
                  color: fg,
                  letterSpacing: -0.1,
                  includeFontPadding: false,
                } as never
              }
            >
              {marginPct >= 0 ? '↑' : '↓'} {Math.abs(marginPct).toFixed(1)}% margen
            </Text>
          </View>
        ) : null}
      </View>

      {/* Separator sutil */}
      <View style={{ height: 1, backgroundColor: trackColor, marginTop: 18, marginHorizontal: -4, opacity: 0.6 }} />

      {/* Ingresos · Costos */}
      <View
        className="flex-row items-center justify-between"
        style={{ marginTop: 14, paddingHorizontal: 4 }}
      >
        <Stat label="Ingresos" value={formatCLP(amount)} fg={fg} fgMuted={fgMuted} isBrand={isBrand} />
        <Stat
          label="Costos"
          value={formatCLP(costs ?? 0)}
          fg={fg}
          fgMuted={fgMuted}
          isBrand={isBrand}
          alignEnd
        />
      </View>

      {/* Meta de Venta */}
      {goal && goal > 0 ? (
        <View
          style={{
            marginTop: 14,
            paddingHorizontal: 4,
          }}
        >
          <View className="flex-row items-end justify-between mb-1.5">
            <View>
              <Text
                style={
                  {
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    lineHeight: 16,
                    color: fg,
                    opacity: isBrand ? 0.95 : 1,
                    includeFontPadding: false,
                  } as never
                }
              >
                Meta de Venta
              </Text>
              <Text
                style={
                  {
                    fontFamily: Fonts.regular,
                    fontSize: 10,
                    lineHeight: 14,
                    color: fgMuted,
                    opacity: isBrand ? 0.75 : 0.7,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    marginTop: 1,
                    includeFontPadding: false,
                  } as never
                }
              >
                Mensual
              </Text>
            </View>
            <Text
              style={
                {
                  fontFamily: Fonts.semibold,
                  fontSize: 13,
                  lineHeight: 18,
                  color: fg,
                  fontVariant: ['tabular-nums'],
                  includeFontPadding: false,
                } as never
              }
            >
              {formatCLP(amount)}{' '}
              <Text
                style={
                  {
                    fontFamily: Fonts.regular,
                    fontSize: 11,
                    color: fgMuted,
                    opacity: 0.7,
                    includeFontPadding: false,
                  } as never
                }
              >
                / {formatCLP(goal)}
              </Text>
            </Text>
          </View>
          <ProgressBar pct={Math.min(100, (amount / goal) * 100)} trackColor={trackColor} fillColor={arcColor} />
        </View>
      ) : null}

      {/* Estado de Órdenes */}
      {orders && (orders.completed + (orders.refunded ?? 0) + (orders.pending ?? 0)) > 0 ? (
        <View style={{ marginTop: 14, paddingHorizontal: 4 }}>
          <Text
            style={
              {
                fontFamily: Fonts.medium,
                fontSize: 12,
                lineHeight: 16,
                color: fg,
                opacity: isBrand ? 0.95 : 1,
                marginBottom: 8,
                includeFontPadding: false,
              } as never
            }
          >
            Estado de Órdenes
          </Text>
          <OrdersBar orders={orders} trackColor={trackColor} fillColor={arcColor} />
          <View className="flex-row items-center justify-between mt-2">
            <Legend dot={arcColor} label="Completadas" value={`${orders.completed}`} fg={fg} fgMuted={fgMuted} isBrand={isBrand} />
            <Legend dot={fgMuted} label="Reembolsadas" value={`${orders.refunded ?? 0}`} fg={fg} fgMuted={fgMuted} isBrand={isBrand} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({
  label,
  value,
  fg,
  fgMuted,
  isBrand,
  alignEnd,
}: {
  label: string;
  value: string;
  fg: string;
  fgMuted: string;
  isBrand: boolean;
  alignEnd?: boolean;
}) {
  return (
    <View style={{ alignItems: alignEnd ? 'flex-end' : 'flex-start' }}>
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: fg,
            opacity: isBrand ? 0.7 : 0.5,
          }}
        />
        <Text
          style={
            {
              fontFamily: Fonts.regular,
              fontSize: 11,
              lineHeight: 14,
              color: fgMuted,
              opacity: isBrand ? 0.78 : 0.7,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              includeFontPadding: false,
            } as never
          }
        >
          {label}
        </Text>
      </View>
      <Text
        style={
          {
            fontFamily: Fonts.semibold,
            fontSize: 16,
            lineHeight: 22,
            color: fg,
            fontVariant: ['tabular-nums'],
            marginTop: 2,
            includeFontPadding: false,
          } as never
        }
      >
        {value}
      </Text>
    </View>
  );
}

function ProgressBar({ pct, trackColor, fillColor }: { pct: number; trackColor: string; fillColor: string }) {
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: trackColor,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

function OrdersBar({ orders, trackColor, fillColor }: { orders: OrderStateBreakdown; trackColor: string; fillColor: string }) {
  const total = orders.completed + (orders.refunded ?? 0) + (orders.pending ?? 0);
  const completedPct = total > 0 ? (orders.completed / total) * 100 : 0;
  return (
    <View
      style={{
        height: 6,
        borderRadius: 999,
        backgroundColor: trackColor,
        overflow: 'hidden',
        flexDirection: 'row',
      }}
    >
      <View style={{ width: `${completedPct}%`, height: '100%', backgroundColor: fillColor }} />
    </View>
  );
}

function Legend({
  dot,
  label,
  value,
  fg,
  fgMuted,
  isBrand,
}: {
  dot: string;
  label: string;
  value: string;
  fg: string;
  fgMuted: string;
  isBrand: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text
        style={
          {
            fontFamily: Fonts.regular,
            fontSize: 11,
            lineHeight: 16,
            color: fgMuted,
            opacity: isBrand ? 0.85 : 0.8,
            includeFontPadding: false,
          } as never
        }
      >
        {label}
      </Text>
      <Text
        style={
          {
            fontFamily: Fonts.semibold,
            fontSize: 11,
            lineHeight: 16,
            color: fg,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never
        }
      >
        ({value})
      </Text>
    </View>
  );
}
