import { ActivityIndicator, View } from 'react-native';
import { useBrand } from '~/hooks/useBrand';
import { cn } from '~/lib/cn';
import { Pressable, type PressableExtraProps } from './Pressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand active:opacity-90',
  secondary: 'bg-bg-muted active:bg-bg-subtle',
  ghost: 'bg-transparent active:bg-bg-muted',
  danger: 'bg-danger active:opacity-90',
  outline: 'bg-transparent border border-border-strong active:bg-bg-muted',
};

const variantText: Record<Variant, 'inverse' | 'default' | 'brand'> = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'default',
  danger: 'inverse',
  outline: 'default',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-10 px-4 rounded-md',
  md: 'h-13 px-5 rounded-lg',
  lg: 'h-15 px-6 rounded-xl',
};

const sizeTextVariant: Record<Size, 'callout' | 'bodyStrong' | 'headline'> = {
  sm: 'callout',
  md: 'bodyStrong',
  lg: 'headline',
};

export interface ButtonProps extends Omit<PressableExtraProps, 'children'> {
  children: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  /**
   * Rellena el primary con el color de marca del tenant (`useBrand`) en vez del
   * azul de sistema (`bg-brand`). Para CTAs de pantallas de negocio (rutas,
   * ventas…) que deben respirar la marca. Solo aplica a `variant="primary"`.
   */
  brand?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  className,
  brand = false,
  haptic = 'medium',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const brandColors = useBrand();
  const brandFill = brand && variant === 'primary';
  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      haptic={isDisabled ? 'none' : haptic}
      scale={isDisabled ? 'none' : 'normal'}
      style={brandFill ? { backgroundColor: brandColors.brand } : undefined}
      className={cn(
        'flex-row items-center justify-center',
        sizeClass[size],
        brandFill ? 'active:opacity-90' : variantClass[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={brandFill ? brandColors.brandFg : variant === 'primary' || variant === 'danger' ? 'white' : undefined}
        />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text
            variant={sizeTextVariant[size]}
            tone={variantText[variant]}
            style={brandFill ? { color: brandColors.brandFg } : undefined}
          >
            {children}
          </Text>
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
