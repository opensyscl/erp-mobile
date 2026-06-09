import { type BottomSheetModal as BottomSheetModalType, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback } from 'react';
import { View } from 'react-native';

import { AppBottomSheet } from '~/components/AppBottomSheet';
import { Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { disconnectRealtime } from '~/realtime';
import { ENV_PRESETS, useDevEnvStore, type DevEnvId } from '~/stores/devEnv';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

import { toast } from './Toast';

/**
 * Sheet oculto para alternar entorno (local/staging/prod). Se abre tocando
 * el logo 4 veces (gesto useFourTapGesture). Persiste la elección en
 * SecureStore y desconecta el WS para que el próximo subscribe re-conecte
 * al host nuevo.
 */
export const DevEnvSheet = forwardRef<BottomSheetModalType>(function DevEnvSheet(_props, ref) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const current = useDevEnvStore((s) => s.current);
  const setCurrent = useDevEnvStore((s) => s.setCurrent);

  const handlePick = useCallback(
    async (id: DevEnvId) => {
      await setCurrent(id);
      // Forzar reconexión del WS al nuevo host
      disconnectRealtime();
      toast.success(
        'Entorno cambiado',
        id === 'default' ? 'Usando .env del build' : `Apuntando a ${id}`,
      );
      (ref as { current?: BottomSheetModalType | null })?.current?.dismiss();
    },
    [ref, setCurrent],
  );

  return (
    <AppBottomSheet ref={ref} snapPoints={['65%']}>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <Text variant="overline" tone="brand">
          Modo desarrollo
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
          Cambiar entorno
        </Text>
        <Text variant="caption" tone="muted" className="mt-1">
          La selección persiste hasta que la cambies. Cierra sesión después para
          re-loguearte contra el nuevo backend.
        </Text>

        <View className="mt-5 gap-2">
          <PresetRow
            id="default"
            label="Default · .env del build"
            description="Usa los EXPO_PUBLIC_* del bundle"
            active={current === 'default'}
            onPress={() => void handlePick('default')}
          />
          {ENV_PRESETS.map((p) => (
            <PresetRow
              key={p.id}
              id={p.id}
              label={p.label}
              description={`${p.description}\n${p.apiUrl}`}
              active={current === p.id}
              onPress={() => void handlePick(p.id)}
            />
          ))}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
});

function PresetRow({
  label,
  description,
  active,
  onPress,
}: {
  id: DevEnvId;
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  return (
    <Pressable
      haptic="selection"
      onPress={onPress}
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.bgElevated,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? colors.success : colors.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: active ? colors.success : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {active ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.success,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
