import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '~/theme/tokens';
import { LogoDot, Wordmark } from './Logo';

interface SplashProps {
  onFinish: () => void;
  minDurationMs?: number;
}

/**
 * Splash minimalista estilo MindHub: dot de marca + wordmark sobre fondo blanco.
 * Cero overproducción — el branding habla solo. Animación corta y firme.
 *
 *   0–280ms   dot escala de 0.6 → 1, opacity 0 → 1 (cubic-out)
 *   140ms     wordmark fade-in con slide-x desde 8px (sutil acompañamiento)
 *   minDur+   exit fade-out global (260ms cubic-in)
 */
export function Splash({ onFinish, minDurationMs = 700 }: SplashProps) {
  const layerOpacity = useSharedValue(1);
  const dotScale = useSharedValue(0.6);
  const dotOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkX = useSharedValue(8);

  useEffect(() => {
    dotOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    dotScale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    wordmarkOpacity.value = withDelay(
      140,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    );
    wordmarkX.value = withDelay(
      140,
      withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );

    layerOpacity.value = withDelay(
      minDurationMs,
      withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [dotOpacity, dotScale, layerOpacity, minDurationMs, onFinish, wordmarkOpacity, wordmarkX]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
    transform: [{ scale: dotScale.value }],
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Animated.View style={dotStyle}>
          <LogoDot size={28} />
        </Animated.View>
        <Animated.View style={wordmarkStyle}>
          <Wordmark size="lg" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
