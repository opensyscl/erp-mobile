import { View, type ViewProps } from 'react-native';
import { cn } from '~/lib/cn';

export interface CardProps extends ViewProps {
  variant?: 'flat' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClass = {
  flat: 'bg-bg-subtle',
  outlined: 'bg-bg-elevated border border-border',
  elevated: 'bg-bg-elevated shadow-sm',
};

const paddingClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'outlined',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      className={cn('rounded-xl', variantClass[variant], paddingClass[padding], className)}
    />
  );
}
