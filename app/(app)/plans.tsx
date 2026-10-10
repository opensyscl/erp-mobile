import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Button, Pressable, Screen, Text } from '~/components/ui';
import { toast } from '~/components/Toast';
import { apiRequest } from '~/lib/api';
import { ArrowLeft } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette, withAlpha } from '~/theme/tokens';

const T = palette.light;

interface Plan {
  slug: string;
  name: string;
  price: string;
  price_raw: number;
  is_free: boolean;
  billing_interval: string;
  description: string | null;
  features: string[];
  is_current: boolean;
}

interface PlansResponse {
  plans: Plan[];
  checkout_url: string;
  current_plan_slug: string | null;
}

const intervalLabel = (interval: string): string => {
  if (interval === 'year' || interval === 'yearly' || interval === 'annual') return '/año';
  return '/mes';
};

/**
 * Planes — pantalla nativa de planes disponibles. Muestra nombre, precio y
 * features de cada plan; "Elegir plan" abre el checkout web (el pago se
 * completa en la web con Stripe/Transbank). Se llega desde el overlay de
 * "prueba terminada" o desde ajustes.
 */
export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.plans.all,
    queryFn: () => apiRequest<PlansResponse>({ method: 'GET', url: '/api/mobile/plans' }),
  });

  const openCheckout = async (plan: Plan) => {
    const url = data?.checkout_url;
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else toast.error('No se pudo abrir', 'Activa tu plan desde la web de OpenSys.');
    } catch {
      toast.error('No se pudo abrir', 'Activa tu plan desde la web de OpenSys.');
    }
  };

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: T.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: T.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          haptic="selection"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: T.bg,
          }}
        >
          <ArrowLeft size={20} color={T.fg} />
        </Pressable>
        <View>
          <Text
            style={{ color: T.fg, fontFamily: Fonts.semibold, fontSize: 19, letterSpacing: -0.4 }}
          >
            Planes
          </Text>
          <Text style={{ color: T.fgSubtle, fontFamily: Fonts.regular, fontSize: 12.5 }}>
            Elegí el que mejor le queda a tu negocio
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.brand} />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: T.fgMuted,
              fontFamily: Fonts.regular,
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            No pudimos cargar los planes. Revisa tu conexión.
          </Text>
          <Button brand onPress={() => refetch()}>
            Reintentar
          </Button>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 32,
            gap: 16,
          }}
        >
          {(data?.plans ?? []).map((plan, i) => (
            <PlanCard key={plan.slug} plan={plan} index={i} onChoose={() => openCheckout(plan)} />
          ))}

          <Text
            style={{
              color: T.fgSubtle,
              fontFamily: Fonts.regular,
              fontSize: 11.5,
              textAlign: 'center',
              marginTop: 4,
              lineHeight: 17,
            }}
          >
            El pago se completa de forma segura en la web de OpenSys.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

function PlanCard({ plan, index, onChoose }: { plan: Plan; index: number; onChoose: () => void }) {
  const current = plan.is_current;

  return (
    <Animated.View
      entering={FadeInUp.delay(60 * index).duration(300)}
      style={{
        backgroundColor: T.bgElevated,
        borderRadius: 22,
        borderWidth: current ? 1.5 : 1,
        borderColor: current ? T.brand : T.border,
        padding: 20,
        ...(current ? brandShadow(T.brand, 'sm') : {}),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{ color: T.fg, fontFamily: Fonts.semibold, fontSize: 18, letterSpacing: -0.3 }}
        >
          {plan.name}
        </Text>
        {current ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: withAlpha(T.brand, 0.12),
            }}
          >
            <Text style={{ color: T.brand, fontFamily: Fonts.semibold, fontSize: 11 }}>
              Tu plan
            </Text>
          </View>
        ) : null}
      </View>

      {/* Precio */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 }}>
        <Text style={{ color: T.fg, fontFamily: Fonts.semibold, fontSize: 30, letterSpacing: -1 }}>
          {plan.is_free ? 'Gratis' : plan.price}
        </Text>
        {!plan.is_free ? (
          <Text
            style={{
              color: T.fgSubtle,
              fontFamily: Fonts.regular,
              fontSize: 14,
              marginBottom: 5,
            }}
          >
            {intervalLabel(plan.billing_interval)}
          </Text>
        ) : null}
      </View>

      {plan.description ? (
        <Text
          style={{
            color: T.fgMuted,
            fontFamily: Fonts.regular,
            fontSize: 13.5,
            lineHeight: 20,
            marginTop: 8,
          }}
        >
          {plan.description}
        </Text>
      ) : null}

      {/* Features */}
      {plan.features.length > 0 ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {plan.features.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: withAlpha(T.success, 0.14),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <Check size={12} color={T.success} />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: T.fgMuted,
                  fontFamily: Fonts.regular,
                  fontSize: 13.5,
                  lineHeight: 20,
                }}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 20 }}>
        {current ? (
          <View
            style={{
              height: 50,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: T.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: T.fgMuted, fontFamily: Fonts.semibold, fontSize: 14.5 }}>
              Plan actual
            </Text>
          </View>
        ) : (
          <Button brand haptic="medium" onPress={onChoose}>
            {plan.is_free ? 'Comenzar gratis' : 'Elegir plan'}
          </Button>
        )}
      </View>
    </Animated.View>
  );
}

function Check({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
