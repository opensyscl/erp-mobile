import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { forwardRef, useEffect } from 'react';
import { View } from 'react-native';

import { AppBottomSheet } from '~/components/AppBottomSheet';
import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Bell, Package, Truck } from '~/lib/icons';
import { useNotificationsStore, type InAppNotification, type NotifKind } from '~/stores/notifications';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

const ICONS: Record<NotifKind, 'package' | 'truck' | 'bell'> = {
  'route.load.created': 'truck',
  'route.load.confirmed': 'truck',
  'route.load.closed': 'truck',
  'route.order.created': 'package',
  'route.order.delivered': 'package',
  'route.order.cancelled': 'package',
  'route.order.payment': 'package',
  'sale.created': 'package',
  'stock.changed': 'package',
  'approval.changed': 'bell',
};

function timeAgo(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

/**
 * Sheet con feed de notificaciones realtime. Al abrirse, marca todas como
 * vistas (resetea el contador del bell badge).
 */
export const NotificationsSheet = forwardRef<BottomSheetModalType>(function NotificationsSheet(_props, ref) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const list = useNotificationsStore((s) => s.list);
  const markAllSeen = useNotificationsStore((s) => s.markAllSeen);
  const clear = useNotificationsStore((s) => s.clear);

  // Marcar como vistas cuando el sheet se monta y hay items
  useEffect(() => {
    if (list.length > 0) markAllSeen();
  }, [list.length, markAllSeen]);

  return (
    <AppBottomSheet ref={ref} snapPoints={['70%', '92%']} scroll>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View className="flex-row items-baseline justify-between">
          <View>
            <Text variant="overline" tone="brand">
              Notificaciones
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 22,
                lineHeight: 30,
                letterSpacing: -0.4,
                color: colors.fg,
                marginTop: 4,
                includeFontPadding: false,
              } as never}
            >
              Actividad reciente
            </Text>
          </View>
          {list.length > 0 ? (
            <Pressable haptic="selection" onPress={clear}>
              <Text variant="caption" tone="muted">
                Limpiar
              </Text>
            </Pressable>
          ) : null}
        </View>

        {list.length === 0 ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: colors.bgMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={28} color={colors.fgSubtle} strokeWidth={1.6} />
            </View>
            <Text variant="bodyStrong" className="mt-4">
              Sin novedades
            </Text>
            <Text variant="caption" tone="muted" className="mt-1 text-center">
              Cuando entreguen pedidos, abran cargas o lleguen{'\n'}avisos vas a verlos acá.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            {list.map((n) => (
              <NotifRow key={n.id} notif={n} />
            ))}
          </View>
        )}
      </View>
    </AppBottomSheet>
  );
});

function NotifRow({ notif }: { notif: InAppNotification }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const iconKind = ICONS[notif.kind];
  const Icon = iconKind === 'truck' ? Truck : iconKind === 'package' ? Package : Bell;

  const accent =
    notif.kind === 'route.order.delivered'
      ? colors.success
      : notif.kind === 'route.order.cancelled'
        ? colors.danger
        : notif.kind === 'route.order.created' || notif.kind === 'route.load.created'
          ? colors.warning
          : colors.fgMuted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: accent + '18',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={accent} strokeWidth={1.6} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {notif.title}
        </Text>
        {notif.body ? (
          <Text variant="caption" tone="muted" numberOfLines={2} className="mt-0.5">
            {notif.body}
          </Text>
        ) : null}
        <Text variant="caption" tone="subtle" className="mt-1">
          {timeAgo(notif.receivedAt)}
        </Text>
      </View>
    </View>
  );
}
