import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export type PressScale = 'none' | 'subtle' | 'normal' | 'strong';
export type PressHaptic = 'none' | 'light' | 'medium' | 'heavy' | 'selection';

const scaleMap: Record<PressScale, number> = {
  none: 1,
  subtle: 0.985,
  normal: 0.965,
  strong: 0.94,
};

const hapticMap: Record<Exclude<PressHaptic, 'none'>, () => void> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
};

export interface PressableExtraProps extends PressableProps {
  scale?: PressScale;
  haptic?: PressHaptic;
}

/**
 * Pressable con feedback físico: escala suave + háptica configurable.
 * Es la base de Button, Card-presionable, lista presionable, etc.
 */
export const Pressable = forwardRef<typeof RNPressable, PressableExtraProps>(
  ({ scale = 'normal', haptic = 'light', onPressIn, onPressOut, onPress, ...props }, ref) => {
    const sv = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: sv.value }] }));

    return (
      <AnimatedPressable
        // @ts-expect-error animated forwardRef typing
        ref={ref}
        style={animStyle}
        onPressIn={(e) => {
          sv.value = withSpring(scaleMap[scale], { damping: 18, stiffness: 320 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          sv.value = withSpring(1, { damping: 18, stiffness: 320 });
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic !== 'none') hapticMap[haptic]();
          onPress?.(e);
        }}
        {...props}
      />
    );
  },
);

Pressable.displayName = 'Pressable';
