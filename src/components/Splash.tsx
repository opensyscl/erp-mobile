import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '~/theme/tokens';
import { LogoDot, Wordmark } from './Logo';

interface SplashProps {
  onFinish: () => void;
  minDurationMs?: number;
}

const DOT_SIZE = 28;

/**
 * Splash con motion — branding firme, sin overproducción:
 *
 *   0–420ms   dot entra con spring (overshoot sutil) + fade
 *   80ms+     2 anillos de pulso se expanden desde el dot (radar), stagger 240ms
 *   200ms     wordmark fade-in con slide-x (spring suave)
 *   600ms+    latido del dot en loop (scale 1 → 1.06) mientras la app hidrata
 *   minDur+   exit "zoom-through": el logo escala fuerte hacia la cámara
 *             mientras el layer se desvanece y revela la app (380ms ease-in)
 *
 * El fondo matchea el native splash de expo-splash-screen (#FFFFFF) para que
 * el handoff nativo → JS no flashee.
 */
export function Splash({ onFinish, minDurationMs = 1100 }: SplashProps) {
  const layerOpacity = useSharedValue(1);
  const groupScale = useSharedValue(1);
  const dotScale = useSharedValue(0.3);
  const dotOpacity = useSharedValue(0);
  const heartbeat = useSharedValue(1);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkX = useSharedValue(14);

  useEffect(() => {
    // Entrada del dot — spring con overshoot contenido
    dotOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    dotScale.value = withSpring(1, { damping: 12, stiffness: 220, mass: 0.7 });

    // Anillos de pulso (radar) — progress 0→1 mapea scale y fade en el style
    ring1.value = withDelay(
      80,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    ring2.value = withDelay(
      320,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Wordmark — acompaña con slide+fade
    wordmarkOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
    wordmarkX.value = withDelay(200, withSpring(0, { damping: 16, stiffness: 180 }));

    // Latido sutil mientras la app termina de hidratar
    heartbeat.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );

    // Exit zoom-through: el logo "atraviesa" la cámara y el layer revela la app
    groupScale.value = withDelay(
      minDurationMs,
      withTiming(9, { duration: 380, easing: Easing.in(Easing.cubic) }),
    );
    layerOpacity.value = withDelay(
      minDurationMs + 60,
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [
    dotOpacity,
    dotScale,
    groupScale,
    heartbeat,
    layerOpacity,
    minDurationMs,
    onFinish,
    ring1,
    ring2,
    wordmarkOpacity,
    wordmarkX,
  ]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }));
  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: groupScale.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value * heartbeat.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - ring1.value),
    transform: [{ scale: 0.8 + ring1.value * 1.8 }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: 0.28 * (1 - ring2.value),
    transform: [{ scale: 0.8 + ring2.value * 2.4 }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateX: wordmarkX.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: palette.light.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        },
        layerStyle,
      ]}
    >
      <Animated.View
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, groupStyle]}
      >
        <View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Anillos de pulso detrás del dot */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                borderWidth: 1.5,
                borderColor: palette.light.brand,
              },
              ring1Style,
            ]}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                borderWidth: 1.5,
                borderColor: palette.light.brand,
              },
              ring2Style,
            ]}
          />
          <Animated.View style={dotStyle}>
            <LogoDot size={DOT_SIZE} />
          </Animated.View>
        </View>
        <Animated.View style={wordmarkStyle}>
          <Wordmark size="lg" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
