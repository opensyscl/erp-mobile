import { useEffect } from 'react';
import { type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { cn } from '~/lib/cn';

export interface SkeletonProps extends ViewProps {
  className?: string;
}

/**
 * Skeleton con shimmer suave. Usar en lugar de spinners para que la UI
 * sienta que está renderizando contenido real, no esperando.
 */
export function Skeleton({ className, style, ...props }: SkeletonProps) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      {...props}
      style={[animatedStyle, style]}
      className={cn('rounded-md bg-bg-muted', className)}
    />
  );
}
