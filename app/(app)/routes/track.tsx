import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { HeaderPattern } from '~/components/HeaderPattern';
import { RouteLiveMap, type MapStop } from '~/components/RouteLiveMap';
import { Button, Pressable, Text } from '~/components/ui';
import { useCurrentPosition } from '~/hooks/useCurrentPosition';
import { apiRequest } from '~/lib/api';
import { queryKeys } from '~/lib/queryKeys';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { type TrackingStatus } from '~/hooks/useDriverTracking';
import { useTrackingStore } from '~/stores/tracking';
import { useSafeBack } from '~/hooks/useSafeBack';
import { ArrowLeft, Navigation, Radio, Truck } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

type Scheme = 'light' | 'dark';

/**
 * Metadata de cada estado del tracking. El color sale de la paleta semántica
 * (nunca hex crudo): verde=en vivo, ámbar=pausado, rojo=problema, gris=inactivo.
 */
interface RouteOrderLite {
  status?: string;
  client?: { name?: string | null; lat?: number | null; lng?: number | null } | null;
}

function statusMeta(
  status: TrackingStatus,
  colors: (typeof palette)[Scheme],
): { label: string; hint: string; tint: string; live: boolean } {
  switch (status) {
    case 'tracking':
      return {
        label: 'En vivo',
        hint: 'El panel de flota te ve en tiempo real.',
        tint: colors.success,
        live: true,
      };
    case 'requesting':
      return {
        label: 'Conectando…',
        hint: 'Pidiendo permiso de ubicación.',
        tint: colors.accent,
        live: false,
      };
    case 'paused':
      return {
        label: 'Pausado',
        hint: 'Reanudá para volver a compartir tu posición.',
        tint: colors.warning,
        live: false,
      };
    case 'denied':
      return {
        label: 'Permiso denegado',
        hint: 'Habilitá la ubicación en los ajustes del teléfono.',
        tint: colors.danger,
        live: false,
      };
    case 'unavailable':
      return {
        label: 'GPS no disponible',
        hint: 'Tu dispositivo no puede entregar la ubicación ahora.',
        tint: colors.danger,
        live: false,
      };
    case 'error':
      return {
        label: 'Error de ubicación',
        hint: 'Algo falló al leer el GPS. Probá de nuevo.',
        tint: colors.danger,
        live: false,
      };
    default:
      return {
        label: 'Sin iniciar',
        hint: 'Activá el envío para aparecer en el mapa de flota.',
        tint: colors.fgSubtle,
        live: false,
      };
  }
}

export default function DriverTrackScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const user = useAuthStore((s) => s.user);
  const safeBack = useSafeBack('/(app)/routes');

  // Ruta activa del driver (paradas para el mapa). Solo driver.
  const isDriverRole = user?.role === 'tenant_driver';
  const { data: today } = useQuery({
    queryKey: queryKeys.routes.today('self'),
    queryFn: () =>
      apiRequest<{ data: { id: number; orders?: RouteOrderLite[] } | null }>({
        method: 'GET',
        url: '/api/mobile/routes/today',
      }),
    enabled: isDriverRole,
  });

  // Posición GPS local del dispositivo para pintar el mapa (independiente del
  // toggle de compartir — queremos verte aunque no estés transmitiendo).
  const { position: gpsPosition } = useCurrentPosition(isDriverRole);

  // Un solo emisor de ubicación: el global gobernado por el store. Esta pantalla
  // solo enciende/apaga el envío y muestra su estado. Antes tenía un segundo
  // pinger propio, por eso "Pausar" no detenía el envío de fondo.
  const setSharing = useTrackingStore((s) => s.setSharing);
  const storeStatus = useTrackingStore((s) => s.status);
  const lastPing = useTrackingStore((s) => s.lastPing);
  const pingCount = useTrackingStore((s) => s.pingCount);

  const status: TrackingStatus = (storeStatus === 'permission-denied' ? 'denied' : storeStatus) as TrackingStatus;
  const lastPosition = lastPing
    ? { lat: lastPing.lat, lng: lastPing.lng, accuracy: lastPing.accuracy ?? 0, speed: lastPing.speed }
    : null;
  const lastPingAt = lastPing ? Date.parse(lastPing.recorded_at) : null;
  const error: string | null = null;
  const start = () => setSharing(true);
  const stop = () => setSharing(false);

  // Datos derivados para el mapa: driver (GPS local → fallback último ping) y
  // paradas (pedidos con coords del cliente).
  const mapDriver = gpsPosition ?? (lastPosition ? { lat: lastPosition.lat, lng: lastPosition.lng } : null);
  const routeStops: MapStop[] = (today?.data?.orders ?? [])
    .filter((o) => o.client?.lat != null && o.client?.lng != null)
    .map((o) => ({
      lat: o.client!.lat as number,
      lng: o.client!.lng as number,
      label: o.client?.name ?? undefined,
      done: o.status === 'delivered' || o.status === 'cancelled',
    }));
  const nextStop = routeStops.find((s) => !s.done) ?? null;
  const doneCount = routeStops.filter((s) => s.done).length;

  const openNavigation = (dest: MapStop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    void Linking.openURL(url).catch(() => undefined);
  };

  const meta = statusMeta(status, colors);
  const isActive = status === 'tracking';
  const isRetry = status === 'denied' || status === 'unavailable' || status === 'error';

  // Tick vivo cada segundo mientras trackea, para que "hace Xs" corra solo.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);
  const secsSinceLastPing =
    lastPingAt !== null ? Math.max(0, Math.floor((now - lastPingAt) / 1000)) : null;

  // Pulso del radar en el hero: dos anillos que expanden y se desvanecen.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, pulse]);

  const ringA = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.6 }],
    opacity: 0.45 * (1 - pulse.value),
  }));
  const ringB = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ((pulse.value + 0.5) % 1) * 1.6 }],
    opacity: 0.35 * (1 - ((pulse.value + 0.5) % 1)),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero brand — estado del tracking con radar pulsante */}
        <View
          style={{
            backgroundColor: brand.brand,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 92,
            overflow: 'hidden',
          }}
        >
          <HeaderPattern color={brand.brandFg} intensity={1.0} />
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.20)']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <Animated.View entering={FadeInDown.duration(220)}>
            <View className="flex-row items-center justify-between">
              <Pressable
                haptic="selection"
                onPress={safeBack}
                accessibilityLabel="Volver"
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: withAlpha(brand.brandFg, 0.18) }}
              >
                <ArrowLeft size={18} color={brand.brandFg} />
              </Pressable>
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                Mi ubicación
              </Text>
              <View style={{ width: 40 }} />
            </View>
          </Animated.View>

          {/* Radar central */}
          <Animated.View
            entering={FadeIn.delay(120).duration(260)}
            style={{ alignItems: 'center', marginTop: 24 }}
          >
            <View style={{ width: 108, height: 108, alignItems: 'center', justifyContent: 'center' }}>
              {isActive ? (
                <>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        width: 108,
                        height: 108,
                        borderRadius: 54,
                        backgroundColor: withAlpha(brand.brandFg, 0.5),
                      },
                      ringA,
                    ]}
                  />
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        width: 108,
                        height: 108,
                        borderRadius: 54,
                        backgroundColor: withAlpha(brand.brandFg, 0.5),
                      },
                      ringB,
                    ]}
                  />
                </>
              ) : null}
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: withAlpha(brand.brandFg, 0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: withAlpha(brand.brandFg, 0.28),
                }}
              >
                {isActive ? (
                  <Radio size={30} color={brand.brandFg} strokeWidth={1.8} />
                ) : (
                  <Navigation size={28} color={brand.brandFg} strokeWidth={1.8} />
                )}
              </View>
            </View>

            <View
              className="flex-row items-center gap-2"
              style={{
                marginTop: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: withAlpha(brand.brandFg, 0.16),
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: meta.live ? brand.brandFg : withAlpha(brand.brandFg, 0.6),
                }}
              />
              <Text
                style={{
                  color: brand.brandFg,
                  fontFamily: Fonts.semibold,
                  fontSize: 13,
                  letterSpacing: -0.1,
                  includeFontPadding: false,
                } as never}
              >
                {meta.label}
              </Text>
            </View>

            <Text
              style={{
                color: brand.brandFg,
                opacity: 0.78,
                fontFamily: Fonts.regular,
                fontSize: 13,
                lineHeight: 19,
                textAlign: 'center',
                marginTop: 10,
                maxWidth: 280,
              }}
            >
              {meta.hint}
            </Text>
          </Animated.View>
        </View>

        {/* Card de acción — flota sobre el hero */}
        <Animated.View
          entering={FadeInUp.delay(140).duration(220)}
          className="mx-5"
          style={{ marginTop: -64 }}
        >
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 18,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: withAlpha(brand.brand, 0.12),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={22} color={brand.brand} strokeWidth={1.7} />
              </View>
              <View className="flex-1 min-w-0">
                <Text variant="bodyStrong" numberOfLines={1}>
                  {user?.name ?? 'Repartidor'}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {isActive ? 'Compartiendo tu posición en vivo' : 'Ubicación en pausa'}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              {status === 'requesting' ? (
                <Button brand size="lg" loading disabled>
                  Conectando…
                </Button>
              ) : isActive ? (
                <Button variant="outline" size="lg" onPress={stop}>
                  Pausar envío
                </Button>
              ) : status === 'denied' ? (
                // Tras un "no", el OS no vuelve a preguntar → hay que ir a Ajustes.
                <Button brand size="lg" onPress={() => void Linking.openSettings()}>
                  Abrir Ajustes
                </Button>
              ) : (
                <Button brand size="lg" onPress={() => void start()}>
                  {isRetry ? 'Reintentar' : 'Iniciar envío de ubicación'}
                </Button>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Mapa de ruta en vivo — tu posición + próxima parada */}
        {isDriverRole && (mapDriver || routeStops.length > 0) ? (
          <Animated.View entering={FadeInUp.delay(170).duration(220)} className="mx-5 mt-3">
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
              }}
            >
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 6, paddingTop: 2, paddingBottom: 10 }}
              >
                <Text variant="overline" tone="subtle">
                  Mapa de ruta
                </Text>
                {routeStops.length > 0 ? (
                  <Text variant="caption" tone="muted">
                    {doneCount}/{routeStops.length} entregadas
                  </Text>
                ) : null}
              </View>

              <RouteLiveMap driver={mapDriver} stops={routeStops} brand={brand.brand} height={300} />

              {nextStop ? (
                <View style={{ marginTop: 12 }}>
                  <Text variant="overline" tone="subtle">
                    Próxima parada
                  </Text>
                  <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 2 }}>
                    {nextStop.label ?? 'Parada'}
                  </Text>
                  <Button brand size="lg" onPress={() => openNavigation(nextStop)} style={{ marginTop: 10 }}>
                    Navegar
                  </Button>
                </View>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {/* Telemetría en vivo */}
        {lastPosition ? (
          <Animated.View entering={FadeInUp.delay(200).duration(220)} className="mx-5 mt-3">
            <View
              style={{
                backgroundColor: colors.bgElevated,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 18,
              }}
            >
              <View className="flex-row items-center justify-between">
                <Text variant="overline" tone="subtle">
                  Señal en vivo
                </Text>
                {isActive ? (
                  <View
                    className="flex-row items-center gap-1.5"
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: withAlpha(colors.success, 0.12),
                    }}
                  >
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success }} />
                    <Text
                      style={{
                        color: colors.success,
                        fontFamily: Fonts.semibold,
                        fontSize: 10,
                        letterSpacing: 0.4,
                        includeFontPadding: false,
                      } as never}
                    >
                      TRANSMITIENDO
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Tiles: precisión + velocidad */}
              <View className="flex-row gap-2.5" style={{ marginTop: 14 }}>
                <Tile
                  label="Precisión"
                  value={`±${Math.round(lastPosition.accuracy)}`}
                  unit="m"
                  tint={colors.accent}
                  colors={colors}
                />
                <Tile
                  label="Velocidad"
                  value={String(Math.round(((lastPosition.speed ?? 0) > 0 ? lastPosition.speed! : 0) * 3.6))}
                  unit="km/h"
                  tint={brand.brand}
                  colors={colors}
                />
                <Tile
                  label="Pings"
                  value={String(pingCount)}
                  unit=""
                  tint={colors.success}
                  colors={colors}
                />
              </View>

              {/* Coordenadas + último ping */}
              <View
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  gap: 10,
                }}
              >
                <DataRow label="Coordenadas" colors={colors}>
                  <Text
                    style={{
                      color: colors.fg,
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      fontVariant: ['tabular-nums'],
                      includeFontPadding: false,
                    } as never}
                  >
                    {lastPosition.lat.toFixed(5)}, {lastPosition.lng.toFixed(5)}
                  </Text>
                </DataRow>
                {secsSinceLastPing !== null ? (
                  <DataRow label="Último ping" colors={colors}>
                    <Text
                      style={{
                        color: secsSinceLastPing <= 15 ? colors.success : colors.fgMuted,
                        fontFamily: Fonts.medium,
                        fontSize: 13,
                        fontVariant: ['tabular-nums'],
                        includeFontPadding: false,
                      } as never}
                    >
                      hace {secsSinceLastPing}s
                    </Text>
                  </DataRow>
                ) : null}
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* Error */}
        {error ? (
          <Animated.View entering={FadeIn.duration(200)} className="mx-5 mt-3">
            <View
              style={{
                backgroundColor: withAlpha(colors.danger, 0.1),
                borderRadius: 18,
                borderWidth: 1,
                borderColor: withAlpha(colors.danger, 0.3),
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: colors.danger,
                  fontFamily: Fonts.medium,
                  fontSize: 13,
                  lineHeight: 19,
                  includeFontPadding: false,
                } as never}
              >
                {error}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Hint */}
        <Text
          variant="caption"
          tone="subtle"
          className="mx-6 mt-4"
          style={{ lineHeight: 18 }}
        >
          Mantené la app abierta para seguir enviando tu ubicación. Si bloqueás la
          pantalla, el sistema puede suspender el GPS.
        </Text>
      </ScrollView>
    </View>
  );
}

/* ─────────────── Tile — métrica compacta ─────────────── */

function Tile({
  label,
  value,
  unit,
  tint,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  tint: string;
  colors: (typeof palette)[Scheme];
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgSubtle,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <Text variant="overline" tone="subtle" numberOfLines={1}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1" style={{ marginTop: 6 }}>
        <Text
          style={{
            color: tint,
            fontFamily: Fonts.semibold,
            fontSize: 20,
            letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
            includeFontPadding: false,
          } as never}
          numberOfLines={1}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={{
              color: colors.fgSubtle,
              fontFamily: Fonts.medium,
              fontSize: 11,
              includeFontPadding: false,
            } as never}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ─────────────── DataRow — label izq / valor der ─────────────── */

function DataRow({
  label,
  colors,
  children,
}: {
  label: string;
  colors: (typeof palette)[Scheme];
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        style={{
          color: colors.fgMuted,
          fontFamily: Fonts.regular,
          fontSize: 13,
          includeFontPadding: false,
        } as never}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
