import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button, Screen, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { apiRequest, ApiError } from '~/lib/api';
import { ScanLine } from '~/lib/icons';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface BarcodeProduct {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  stock: number;
  price: number;
  status: 'ok' | 'low' | 'out';
}

const SCREEN_W = Dimensions.get('window').width;
const FRAME_SIZE = Math.min(SCREEN_W - 80, 280);

export default function ScanScreen() {
  const brand = useBrand();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['product', 'barcode', scanned],
    queryFn: async () => {
      if (!scanned) throw new Error('no code');
      const res = await apiRequest<{ data: BarcodeProduct }>({
        method: 'GET',
        url: `/api/mobile/products/by-barcode/${scanned}`,
      });
      return res.data;
    },
    enabled: !!scanned,
    retry: false,
  });

  const handleBarcode = useCallback(
    (code: string) => {
      if (scanned) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanned(code);
    },
    [scanned],
  );

  const reset = () => setScanned(null);

  if (!permission) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text variant="body" tone="muted">
            Pidiendo permiso de cámara…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="items-center justify-center"
            style={{
              height: 84,
              width: 84,
              borderRadius: 28,
              backgroundColor: brand.brandSubtle,
            }}
          >
            <ScanLine size={36} color={brand.brand} />
          </View>
          <Text variant="title" className="mt-6 text-center">
            Activar cámara
          </Text>
          <Text variant="body" tone="muted" className="mt-2 text-center">
            Necesitamos acceso a la cámara para escanear códigos de barra y QR de productos.
          </Text>
          <View className="mt-7 w-full max-w-xs">
            <Button onPress={() => void requestPermission()}>Permitir cámara</Button>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : (e) => handleBarcode(e.data)}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
        }}
      >
        <ScanOverlay />
      </CameraView>

      {/* Sheet con el resultado */}
      {scanned ? (
        <ResultSheet
          code={scanned}
          product={data}
          loading={isFetching}
          isError={isError}
          error={error}
          onClose={reset}
          onOpenDetail={(id) => {
            reset();
            router.push(`/(app)/products/${id}` as never);
          }}
        />
      ) : null}
    </View>
  );
}

function ScanOverlay() {
  const brand = useBrand();

  // Línea animada que recorre el frame
  const y = useSharedValue(0);
  if (y.value === 0) {
    y.value = withRepeat(
      withTiming(FRAME_SIZE, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const cornerSize = 22;
  const cornerThick = 3;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE,
          position: 'relative',
        }}
      >
        {/* Background dim alrededor del frame se logra con un overlay distinto si fuera necesario.
            Aquí dejamos la cámara visible dentro del frame y oscurecemos solo afuera abajo. */}
        {/* Esquinas */}
        <Corner pos="tl" size={cornerSize} thick={cornerThick} color={brand.brandFg} />
        <Corner pos="tr" size={cornerSize} thick={cornerThick} color={brand.brandFg} />
        <Corner pos="bl" size={cornerSize} thick={cornerThick} color={brand.brandFg} />
        <Corner pos="br" size={cornerSize} thick={cornerThick} color={brand.brandFg} />

        {/* Línea animada */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: brand.brand,
              opacity: 0.85,
              shadowColor: brand.brand,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 6,
            },
            lineStyle,
          ]}
        />
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 60,
          alignSelf: 'center',
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Text style={{ color: palette.light.fgInverse, fontFamily: Fonts.medium, fontSize: 13 }}>
          Apunta al código de barras
        </Text>
      </View>
    </View>
  );
}

function Corner({
  pos,
  size,
  thick,
  color,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  size: number;
  thick: number;
  color: string;
}) {
  const isTop = pos === 'tl' || pos === 'tr';
  const isLeft = pos === 'tl' || pos === 'bl';
  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        left: isLeft ? 0 : undefined,
        right: !isLeft ? 0 : undefined,
        borderTopWidth: isTop ? thick : 0,
        borderBottomWidth: !isTop ? thick : 0,
        borderLeftWidth: isLeft ? thick : 0,
        borderRightWidth: !isLeft ? thick : 0,
        borderColor: color,
        borderTopLeftRadius: pos === 'tl' ? 10 : 0,
        borderTopRightRadius: pos === 'tr' ? 10 : 0,
        borderBottomLeftRadius: pos === 'bl' ? 10 : 0,
        borderBottomRightRadius: pos === 'br' ? 10 : 0,
      }}
    />
  );
}

function ResultSheet({
  code,
  product,
  loading,
  isError,
  error,
  onClose,
  onOpenDetail,
}: {
  code: string;
  product: BarcodeProduct | undefined;
  loading: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onOpenDetail: (id: number) => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const apiErr = error instanceof ApiError ? error : null;
  const notFound = apiErr?.status === 404;

  return (
    <Animated.View
      entering={undefined}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.bgElevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 22,
        paddingBottom: 32,
        shadowColor: '#0a0d14',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 16,
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
      </View>

      <View className="flex-row items-center gap-2 mb-3">
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: loading ? colors.warning : isError ? colors.danger : colors.success,
          }}
        />
        <Text variant="overline" tone="subtle">
          {loading ? 'Buscando…' : isError ? (notFound ? 'No encontrado' : 'Error') : 'Encontrado'}
        </Text>
      </View>

      <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: colors.fgSubtle, letterSpacing: 0.4 }}>
        Código
      </Text>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 18,
                lineHeight: 25,
          color: colors.fg,
          letterSpacing: -0.3,
          marginTop: 2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {code}
      </Text>

      {loading ? (
        <Text variant="body" tone="muted" className="mt-4">
          Consultando producto…
        </Text>
      ) : notFound ? (
        <Text variant="body" tone="muted" className="mt-4">
          Este código no existe en tu inventario. Puedes agregarlo como producto nuevo.
        </Text>
      ) : isError ? (
        <Text variant="body" tone="danger" className="mt-4">
          {apiErr?.message ?? 'No pudimos consultar el producto.'}
        </Text>
      ) : product ? (
        <View className="mt-4 flex-row items-center gap-3">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.bgMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: Fonts.semibold, fontSize: 14, color: colors.fgSubtle }}>
              {(product.category ?? product.name)[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {product.name}
            </Text>
            <View className="flex-row items-baseline gap-2 mt-1">
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 16,
                  letterSpacing: -0.2,
                  color: colors.fg,
                  fontVariant: ['tabular-nums'],
                }}
              >
                ${Math.round(product.price).toLocaleString('es-CL')}
              </Text>
              <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                · stock {product.stock}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View className="flex-row gap-3 mt-6">
        <View style={{ flex: 1 }}>
          <Button variant="secondary" onPress={onClose}>
            Escanear otro
          </Button>
        </View>
        {product ? (
          <View style={{ flex: 1 }}>
            <Button onPress={() => onOpenDetail(product.id)}>Ver detalle</Button>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

