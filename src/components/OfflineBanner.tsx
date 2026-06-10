import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '~/components/ui';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

/**
 * Banner global "Sin conexión" — se monta una vez en el root layout.
 * Complementa el stack offline: las queries se pausan (onlineManager),
 * las mutaciones fallan rápido (networkMode always) y esto le dice al
 * usuario POR QUÉ. Desaparece solo al volver la red.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return unsub;
  }, []);

  if (!offline) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(220)}
      exiting={SlideOutUp.duration(180)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 998,
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        alignItems: 'center',
        backgroundColor: palette.light.fg,
      }}
    >
      <View className="flex-row items-center gap-2">
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: withAlpha(palette.light.fgInverse, 0.6),
          }}
        />
        <Text
          style={{
            color: palette.light.fgInverse,
            fontFamily: Fonts.medium,
            fontSize: 12,
            letterSpacing: -0.1,
          }}
        >
          Sin conexión — mostrando datos guardados
        </Text>
      </View>
    </Animated.View>
  );
}
