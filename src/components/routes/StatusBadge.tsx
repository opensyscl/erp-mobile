import { View } from 'react-native';

import { Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

export type RouteOrderStatus = 'pending' | 'delivered' | 'cancelled';

const LABEL: Record<RouteOrderStatus, string> = {
  pending: 'Pendiente',
  delivered: 'Entregada',
  cancelled: 'No entregada',
};

const TONE: Record<RouteOrderStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

export function StatusBadge({ status, size = 'sm' }: { status: RouteOrderStatus; size?: 'sm' | 'md' }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const tone = TONE[status];
  const fg = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : colors.danger;

  const padX = size === 'md' ? 9 : 7;
  const padY = size === 'md' ? 3 : 2;
  const fontSize = size === 'md' ? 12 : 11;
  const dot = size === 'md' ? 6 : 5;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: padX,
        paddingVertical: padY,
        borderRadius: 999,
        backgroundColor: fg + '18',
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: fg }} />
      <Text
        style={
          {
            fontFamily: Fonts.semibold,
            fontSize,
            lineHeight: fontSize + 4,
            color: fg,
            letterSpacing: -0.1,
            includeFontPadding: false,
          } as never
        }
      >
        {LABEL[status]}
      </Text>
    </View>
  );
}
