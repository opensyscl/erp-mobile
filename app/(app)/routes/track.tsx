import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useDriverTracking, type TrackingStatus } from '~/hooks/useDriverTracking';
import { useAuthStore } from '~/stores/auth';
import { withAlpha } from '~/theme/tokens';

const STATUS_META: Record<TrackingStatus, { label: string; tint: string }> = {
  idle: { label: 'Sin iniciar', tint: '#94a3b8' },
  requesting: { label: 'Pidiendo permiso…', tint: '#0ea5e9' },
  tracking: { label: 'Enviando ubicación', tint: '#16a34a' },
  denied: { label: 'Permiso denegado', tint: '#dc2626' },
  unavailable: { label: 'GPS no disponible', tint: '#dc2626' },
  paused: { label: 'Pausado', tint: '#f59e0b' },
  error: { label: 'Error', tint: '#dc2626' },
};

export default function DriverTrackScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const user = useAuthStore((s) => s.user);

  const { status, lastPosition, pingCount, lastPingAt, error, start, stop } =
    useDriverTracking({ intervalSec: 8, distanceMeters: 5 });

  const meta = STATUS_META[status];

  const secsSinceLastPing = useMemo(() => {
    if (!lastPingAt) return null;
    return Math.floor((Date.now() - lastPingAt) / 1000);
  }, [lastPingAt, pingCount, status]);

  const isActive = status === 'tracking';
  const canStart =
    status === 'idle' || status === 'paused' || status === 'denied' || status === 'unavailable' || status === 'error';

  return (
    <>
      <Stack.Screen options={{ title: 'Mi ubicación' }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        className="flex-1 bg-bg"
      >
        <Animated.View entering={FadeIn} className="px-4 pt-4 gap-4">
          {/* Header card */}
          <Card className="p-5 gap-3">
            <View>
              <Text variant="caption" className="uppercase tracking-wider opacity-60">
                Hola
              </Text>
              <Text variant="title" className="mt-0.5">
                {user?.name ?? 'Driver'}
              </Text>
              <Text variant="body" className="opacity-70 mt-0.5">
                Activá el envío de tu ubicación para que el panel de flota te vea en vivo.
              </Text>
            </View>

            {/* Status pill */}
            <View
              className="flex-row items-center gap-2 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: withAlpha(meta.tint, isDark ? 0.13 : 0.08),
              }}
            >
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: meta.tint,
                  shadowColor: meta.tint,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isActive ? 0.6 : 0,
                  shadowRadius: isActive ? 6 : 0,
                }}
              />
              <Text variant="body" className="font-semibold" style={{ color: meta.tint }}>
                {meta.label}
              </Text>
            </View>

            {/* Actions */}
            {canStart ? (
              <Button onPress={() => void start()} variant="primary" size="lg">
                Iniciar envío de ubicación
              </Button>
            ) : (
              <Button onPress={stop} variant="outline" size="lg">
                Pausar
              </Button>
            )}
          </Card>

          {/* Live data */}
          {lastPosition && (
            <Card className="p-5 gap-3">
              <Text variant="caption" className="uppercase tracking-wider opacity-60">
                Posición actual
              </Text>

              <View className="flex-row justify-between">
                <Text variant="body" className="opacity-60">
                  Lat / Lng
                </Text>
                <Text variant="body" className="font-mono">
                  {lastPosition.lat.toFixed(6)}, {lastPosition.lng.toFixed(6)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text variant="body" className="opacity-60">
                  Precisión
                </Text>
                <Text variant="body" className="font-mono">
                  ±{Math.round(lastPosition.accuracy)} m
                </Text>
              </View>

              {lastPosition.speed !== null && lastPosition.speed > 0 && (
                <View className="flex-row justify-between">
                  <Text variant="body" className="opacity-60">
                    Velocidad
                  </Text>
                  <Text variant="body" className="font-mono">
                    {Math.round(lastPosition.speed * 3.6)} km/h
                  </Text>
                </View>
              )}

              <View className="h-px bg-border my-1" />

              <View className="flex-row justify-between">
                <Text variant="body" className="opacity-60">
                  Pings enviados
                </Text>
                <Text variant="body" tone="brand" className="font-bold">
                  {pingCount}
                </Text>
              </View>

              {secsSinceLastPing !== null && (
                <View className="flex-row justify-between">
                  <Text variant="body" className="opacity-60">
                    Último ping
                  </Text>
                  <Text variant="body" className="font-mono">
                    hace {secsSinceLastPing} s
                  </Text>
                </View>
              )}
            </Card>
          )}

          {error && (
            <Card className="p-4 border-l-4 border-rose-500">
              <Text variant="body" className="text-rose-600 dark:text-rose-400">
                {error}
              </Text>
            </Card>
          )}

          <Text variant="caption" className="opacity-50 px-2">
            Mantené la app abierta para que sigamos recibiendo tu ubicación. Si bloqueás
            la pantalla, el sistema puede suspender el GPS.
          </Text>
        </Animated.View>
      </ScrollView>
    </>
  );
}
