import { View, type ViewProps } from 'react-native';

import { cn } from '~/lib/cn';
import { shadows } from '~/theme/tokens';

export interface CardProps extends ViewProps {
  variant?: 'flat' | 'outlined' | 'elevated';
  /** Override del shadow level. Default: `md` para `elevated`, ninguno para los demás. */
  shadow?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClass = {
  flat: 'bg-bg-subtle',
  outlined: 'bg-bg-elevated border border-border',
  elevated: 'bg-bg-elevated',
};

const paddingClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'outlined',
  shadow,
  padding = 'md',
  className,
  style,
  ...props
}: CardProps) {
  // Default shadow level: 'md' para elevated, ninguno para los otros (limpio).
  const level = shadow ?? (variant === 'elevated' ? 'md' : 'none');
  const shadowStyle = level === 'none' ? null : shadows[level];

  return (
    <View
      {...props}
      style={[shadowStyle, style]}
      className={cn('rounded-2xl', variantClass[variant], paddingClass[padding], className)}
    />
  );
}
