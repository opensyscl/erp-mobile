import { View } from 'react-native';

import { Pressable, Text } from '~/components/ui';

/**
 * Tile cuadrado para grid 2 columnas — icon en círculo brand-subtle + label.
 * Distinto del `QuickActionChip` (chip 96×96 con bg lleno, para scroll horizontal).
 */
export function QuickActionTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <View className="w-1/2 px-1.5 py-1.5">
      <Pressable
        onPress={onPress}
        haptic="selection"
        className="rounded-2xl bg-bg-elevated border border-border p-4"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle">
          {icon}
        </View>
        <Text variant="bodyStrong" className="mt-3">
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
