import type { BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { AppBottomSheet } from '~/components/AppBottomSheet';
import { toast } from '~/components/Toast';
import { Button, Pressable, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ApiError, apiRequest } from '~/lib/api';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

type Reason = 'purchase' | 'count' | 'damage' | 'return' | 'manual';

const REASONS: { id: Reason; label: string }[] = [
  { id: 'count', label: 'Conteo' },
  { id: 'purchase', label: 'Compra' },
  { id: 'damage', label: 'Merma' },
  { id: 'return', label: 'Devolución' },
  { id: 'manual', label: 'Otro' },
];

interface Props {
  visible: boolean;
  productId: number;
  productName: string;
  currentStock: number;
  onClose: () => void;
}

export function AdjustStockSheet({ visible, productId, productName, currentStock, onClose }: Props) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModalType>(null);

  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<Reason>('count');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sincronizar visible prop con ref imperativo
  useEffect(() => {
    if (visible) {
      setDelta(0);
      setReason('count');
      setNotes('');
      setError(null);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: async (input: { delta: number; reason: Reason; notes?: string }) => {
      return apiRequest({
        method: 'POST',
        url: `/api/mobile/products/${productId}/adjust-stock`,
        data: input,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', String(productId)] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock actualizado', `${delta > 0 ? '+' : ''}${delta} unidades · ${reason}`);
      onClose();
    },
    onError: (err) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof ApiError) {
        const fieldErr = err.errors?.delta?.[0];
        setError(fieldErr ?? err.message);
      } else {
        setError('No pudimos aplicar el ajuste.');
      }
    },
  });

  const newStock = currentStock + delta;
  const submitting = mutation.isPending;

  const bump = (n: number) => {
    void Haptics.selectionAsync();
    setDelta((d) => d + n);
  };

  const handleSubmit = () => {
    if (delta === 0) {
      setError('El cambio no puede ser 0.');
      return;
    }
    setError(null);
    mutation.mutate({ delta, reason, notes: notes.trim() || undefined });
  };

  return (
    <AppBottomSheet
      ref={sheetRef}
      snapPoints={['70%', '92%']}
      onDismiss={onClose}
      scroll
    >
      <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
        <Text variant="overline" tone="brand">
          Ajustar stock
        </Text>
        <Text variant="title" className="mt-1.5" numberOfLines={2}>
          {productName}
        </Text>
        <Text variant="caption" tone="muted" className="mt-1">
          Stock actual:{' '}
          <Text variant="caption" style={{ fontFamily: Fonts.medium, color: colors.fg }}>
            {currentStock}
          </Text>
        </Text>

        {/* Stepper */}
        <View
          style={{
            marginTop: 22,
            borderRadius: 16,
            backgroundColor: colors.bgSubtle,
            padding: 18,
            alignItems: 'center',
          }}
        >
          <Text variant="overline" tone="subtle">
            Nuevo stock
          </Text>
          <Text
            style={{
              fontFamily: Fonts.semibold,
              fontSize: 44,
              lineHeight: 50,
              letterSpacing: -1.5,
              marginTop: 4,
              color: newStock < 0 ? colors.danger : colors.fg,
              fontVariant: ['tabular-nums'],
            }}
          >
            {newStock}
          </Text>
          {delta !== 0 ? (
            <Text
              variant="caption"
              tone={delta > 0 ? 'success' : 'warning'}
              style={{ fontFamily: Fonts.medium, fontVariant: ['tabular-nums'] }}
            >
              {delta > 0 ? `+${delta}` : delta} unidades
            </Text>
          ) : (
            <Text variant="caption" tone="subtle">
              sin cambios
            </Text>
          )}

          <View className="flex-row gap-2 mt-4">
            <StepperButton label="−10" onPress={() => bump(-10)} />
            <StepperButton label="−1" onPress={() => bump(-1)} />
            <StepperButton label="+1" onPress={() => bump(1)} primary />
            <StepperButton label="+10" onPress={() => bump(10)} primary />
          </View>
        </View>

        {/* Reason */}
        <Text variant="overline" tone="subtle" className="mt-5 mb-2">
          Razón
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {REASONS.map((r) => {
            const active = reason === r.id;
            return (
              <Pressable
                key={r.id}
                haptic="selection"
                onPress={() => setReason(r.id)}
                className="rounded-full px-3.5"
                style={{
                  height: 32,
                  justifyContent: 'center',
                  backgroundColor: active ? brand.brand : colors.bgMuted,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: -0.1,
                    color: active ? brand.brandFg : colors.fgMuted,
                  }}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notes */}
        <Text variant="overline" tone="subtle" className="mt-5 mb-2">
          Nota (opcional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: conteo físico, daño en bodega…"
          placeholderTextColor={colors.fgSubtle}
          multiline
          maxLength={500}
          style={{
            minHeight: 56,
            borderRadius: 12,
            backgroundColor: colors.bgSubtle,
            padding: 14,
            fontFamily: Fonts.regular,
            fontSize: 14,
            color: colors.fg,
          }}
        />

        {error ? (
          <Text variant="caption" tone="danger" className="mt-3">
            {error}
          </Text>
        ) : null}

        <View className="flex-row gap-3 mt-6 mb-2">
          <View style={{ flex: 1 }}>
            <Button variant="secondary" onPress={onClose} disabled={submitting}>
              Cancelar
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button onPress={handleSubmit} loading={submitting}>
              Aplicar
            </Button>
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
}

function StepperButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  return (
    <Pressable
      haptic="none"
      onPress={onPress}
      className="rounded-xl px-4"
      style={{
        height: 44,
        justifyContent: 'center',
        backgroundColor: primary ? brand.brand : colors.bgElevated,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        minWidth: 60,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 15,
          color: primary ? brand.brandFg : colors.fg,
          letterSpacing: -0.2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
