import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { palette } from '~/theme/tokens';
import { useColorScheme } from '~/hooks/useColorScheme';
import { cn } from '~/lib/cn';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
  /**
   * `default` — card blanca con borde (se marca en brand al enfocar).
   * `soft` — relleno gris sin borde visible, look minimalista (ej. buscadores).
   */
  variant?: 'default' | 'soft';
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, hint, error, leftIcon, rightSlot, containerClassName, variant = 'default', onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const scheme = useColorScheme();

    const boxClass =
      variant === 'soft'
        ? cn(
            'h-13 flex-row items-center rounded-xl border bg-bg-muted px-4',
            error ? 'border-danger' : focused ? 'border-border' : 'border-transparent',
          )
        : cn(
            'h-13 flex-row items-center rounded-lg border bg-bg-elevated px-4',
            error ? 'border-danger' : focused ? 'border-brand' : 'border-border',
          );

    return (
      <View className={cn('gap-1.5', containerClassName)}>
        {label ? (
          <Text variant="callout" tone="muted">
            {label}
          </Text>
        ) : null}
        <View className={boxClass}>
          {leftIcon ? <View className="mr-2.5">{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            placeholderTextColor={palette[scheme].fgSubtle}
            selectionColor={palette[scheme].brand}
            cursorColor={palette[scheme].brand}
            className="flex-1 text-base text-fg"
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightSlot ? <View className="ml-2">{rightSlot}</View> : null}
        </View>
        {error ? (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="subtle">
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
