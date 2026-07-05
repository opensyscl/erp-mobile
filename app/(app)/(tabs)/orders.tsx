import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriverOrdersBody } from '~/components/routes/DriverOrdersBody';
import { Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Plus } from '~/lib/icons';
import { palette } from '~/theme/tokens';

/**
 * Pestaña "Pedidos" del driver — su superficie de trabajo diaria. Reusa el
 * cuerpo compartido (tabs Pendientes/Entregados + lista) con un header de
 * título (sin back, porque es raíz de pestaña).
 */
export default function OrdersTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: colors.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="title">Pedidos</Text>
        <Pressable
          haptic="medium"
          onPress={() => router.push('/(app)/routes/orders/new' as never)}
          accessibilityLabel="Nuevo pedido"
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: brand.brand,
          }}
        >
          <Plus size={18} color={brand.brandFg} strokeWidth={2.2} />
        </Pressable>
      </View>

      <DriverOrdersBody />
    </View>
  );
}
