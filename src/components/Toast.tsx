import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable as RNPressable, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { create } from 'zustand';

import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import { Text } from './ui/Text';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ items: [...s.items, { id, duration: 3500, ...t }] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** API global. Importa desde cualquier lado:
 *   import { toast } from '~/components/Toast';
 *   toast.success('Venta creada', 'Total $12.500');
 */
export const toast = {
  success(title: string, description?: string, duration?: number) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return useToastStore.getState().push({ kind: 'success', title, description, duration });
  },
  error(title: string, description?: string, duration?: number) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return useToastStore.getState().push({ kind: 'error', title, description, duration });
  },
  warning(title: string, description?: string, duration?: number) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return useToastStore.getState().push({ kind: 'warning', title, description, duration });
  },
  info(title: string, description?: string, duration?: number) {
    return useToastStore.getState().push({ kind: 'info', title, description, duration });
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id);
  },
};

/**
 * customSileo — API espejo del de la web (resources/js/providers/SileoProvider.tsx).
 * Acepta string | { title, description } igual que en la web, así el código compartido
 * funciona sin cambios. Internamente usa el mismo store de toast.
 *
 *   import { customSileo } from '~/components/Toast';
 *   customSileo.success('Stock actualizado');
 *   customSileo.error({ title: 'No se pudo guardar', description: 'Reintenta.' });
 */
type SileoContent = string | { title: string; description?: string };

const fromContent = (content: SileoContent): { title: string; description?: string } =>
  typeof content === 'string' ? { title: content } : content;

export const customSileo = {
  success(content: SileoContent, _actions?: unknown, options?: { duration?: number }) {
    const { title, description } = fromContent(content);
    return toast.success(title, description, options?.duration);
  },
  error(content: SileoContent, _actions?: unknown, options?: { duration?: number }) {
    const { title, description } = fromContent(content);
    return toast.error(title, description, options?.duration);
  },
  warning(content: SileoContent, _actions?: unknown, options?: { duration?: number }) {
    const { title, description } = fromContent(content);
    return toast.warning(title, description, options?.duration);
  },
  info(content: SileoContent, _actions?: unknown, options?: { duration?: number }) {
    const { title, description } = fromContent(content);
    return toast.info(title, description, options?.duration);
  },
  dismiss(id: string) {
    toast.dismiss(id);
  },
  hide(id: string) {
    toast.dismiss(id);
  },
};

/** Hook con el mismo nombre que la web. */
export const useSileo = () => customSileo;

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      {items.map((t, i) => (
        <ToastCard key={t.id} item={t} index={i} />
      ))}
    </View>
  );
}

function ToastCard({ item, index }: { item: ToastItem; index: number }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const dismiss = useToastStore((s) => s.dismiss);

  // Animación con shared values: control fino de entrada y salida.
  // Evitamos `entering`/`exiting` de Reanimated porque su spring tiene overshoot
  // que se ve "tropeloso", y la salida queda colgada cuando varios apilan.
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);

  useEffect(() => {
    // Entrada: 220ms cubic-out, sin overshoot.
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });

    // Salida automática: 220ms antes del dismiss empieza a desvanecerse.
    const exitDelayMs = Math.max(item.duration - 220, 0);
    const exitTimeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(-8, { duration: 220, easing: Easing.in(Easing.cubic) });
    }, exitDelayMs);

    const dismissTimeout = setTimeout(() => dismiss(item.id), item.duration);

    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(dismissTimeout);
    };
  }, [dismiss, item.duration, item.id, opacity, translateY]);

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) });
    translateY.value = withTiming(-8, { duration: 180, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(dismiss)(item.id);
    });
  };

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const iconColor =
    item.kind === 'success'
      ? colors.success
      : item.kind === 'error'
        ? colors.danger
        : item.kind === 'warning'
          ? colors.warning
          : colors.brand;

  const accentBg =
    item.kind === 'success'
      ? colors.success
      : item.kind === 'error'
        ? colors.danger
        : item.kind === 'warning'
          ? colors.warning
          : colors.brand;

  return (
    <Animated.View
      style={[
        {
          marginHorizontal: 16,
          marginTop: index === 0 ? 0 : 8,
          backgroundColor: colors.bgElevated,
          borderRadius: 16,
          shadowColor: '#0a0d14',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 18,
          elevation: 8,
          overflow: 'hidden',
          width: '92%',
          maxWidth: 460,
          borderWidth: 1,
          borderColor: colors.border,
        },
        animStyle,
      ]}
    >
      <RNPressable onPress={handleDismiss}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: accentBg + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ToastIcon kind={item.kind} color={iconColor} />
          </View>
          <View style={{ flex: 1, paddingTop: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 14,
                letterSpacing: -0.2,
                color: colors.fg,
                lineHeight: 20,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text variant="caption" tone="muted" className="mt-0.5" numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
      </RNPressable>
    </Animated.View>
  );
}

function ToastIcon({ kind, color }: { kind: ToastKind; color: string }) {
  if (kind === 'success') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5l4 4L19 7"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (kind === 'error') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'warning') {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M12 8v5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M12 16.5v0.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 11v6" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M12 7.5v0.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}
