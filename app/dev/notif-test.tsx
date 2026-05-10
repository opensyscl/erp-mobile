import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Text } from '~/components/ui';

const PRESETS = [
  {
    title: 'Nueva venta',
    body: 'Boleta #1234 — $45.890 (Carlos Gómez)',
    data: { type: 'sale.created', sale_id: 1234 },
  },
  {
    title: 'Stock bajo',
    body: 'Tornillo 1/4" — quedan 8 unidades',
    data: { type: 'product.stock.changed', product_id: 42 },
  },
  {
    title: 'Ruta R-000412 entregada',
    body: 'Cobraste $184.391 en Construcciones El Roble',
    data: { type: 'route.order.delivered', order_id: 412 },
  },
];

export default function NotifTestScreen() {
  const router = useRouter();
  const [last, setLast] = useState<string | null>(null);

  async function fire(p: (typeof PRESETS)[number]): Promise<void> {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, data: p.data, sound: 'default' },
      trigger: null,
    });
    setLast(`${p.title} · id=${id.slice(0, 8)}`);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Test notificaciones' }} />
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <Text style={{ fontSize: 13, opacity: 0.7 }}>
            Dispara una local notification (no usa Expo Push). Útil en emulador.
          </Text>
        </Card>

        {PRESETS.map((p) => (
          <Button key={p.title} onPress={() => fire(p)}>
            {p.title}
          </Button>
        ))}

        {last && (
          <Card style={{ padding: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 12 }}>Última: {last}</Text>
          </Card>
        )}

        <View style={{ marginTop: 24 }}>
          <Button onPress={() => router.back()}>Volver</Button>
        </View>
      </View>
    </>
  );
}
