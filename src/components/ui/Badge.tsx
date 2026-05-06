import { View } from 'react-native';
import { cn } from '~/lib/cn';
import { Text } from './Text';

type Variant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const variantBg: Record<Variant, string> = {
  neutral: 'bg-bg-muted',
  brand: 'bg-brand-subtle',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
};

const variantFg: Record<Variant, 'default' | 'brand' | 'success' | 'warning' | 'danger'> = {
  neutral: 'default',
  brand: 'brand',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

interface BadgeProps {
  children: string;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', variantBg[variant], className)}>
      <Text variant="caption" tone={variantFg[variant]}>
        {children}
      </Text>
    </View>
  );
}
