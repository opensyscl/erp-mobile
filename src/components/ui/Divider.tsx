import { View } from 'react-native';
import { cn } from '~/lib/cn';

interface DividerProps {
  className?: string;
  vertical?: boolean;
}

export function Divider({ className, vertical }: DividerProps) {
  return (
    <View
      className={cn(
        'bg-border',
        vertical ? 'w-px self-stretch' : 'h-px w-full',
        className,
      )}
    />
  );
}
