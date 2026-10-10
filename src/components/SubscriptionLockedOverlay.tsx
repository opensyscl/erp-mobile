import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { ImageBackground, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Pressable, Text } from '~/components/ui';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

const T = palette.light;
const BANNER = require('../../assets/images/trial-banner.png');

/**
 * SubscriptionLockedOverlay — bloqueo "prueba terminada".
 *   Se monta a nivel sesión (app/(app)/_layout) y cubre toda la app cuando el
 *   tenant tiene `system_locked` (prueba gratis vencida sin pago). No se puede
 *   cerrar: solo activar el plan (abre la facturación web) o cerrar sesión.
 *   Espejo del overlay web (resources/js/components/SystemLockedOverlay.tsx):
 *   card blanco con header de imagen + fade, sobre un fondo oscuro difuminado.
 */
export function SubscriptionLockedOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const tenantLocked = useTenantStore((s) => s.tenant?.system_locked ?? false);
  const logout = useAuthStore((s) => s.logout);

  // TEMP (solo dev): fuerza el overlay para previsualizar el diseño en el celu
  // sin necesidad de un tenant vencido en el backend. QUITAR antes de release.
  const FORCE_SHOW = __DEV__ && true;
  const locked = FORCE_SHOW || tenantLocked;

  // Dejamos pasar la pantalla de planes: es a donde lleva "Activar mi plan".
  // Si el overlay la cubriera, sería inalcanzable (mismo criterio que la web
  // con el tab de facturación).
  if (!locked || pathname?.endsWith('/plans')) return null;

  // Abre la pantalla nativa de planes; el pago se completa en la web desde ahí.
  const handleActivate = () => router.push('/(app)/plans');

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      <BlurView
        intensity={28}
        tint="dark"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: withAlpha('#0B0B0F', 0.55),
        }}
      >
        <Animated.View
          entering={FadeInUp.delay(90).duration(340)}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: T.bgElevated,
            borderRadius: 28,
            overflow: 'hidden',
            shadowColor: '#0a0d14',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.35,
            shadowRadius: 48,
            elevation: 24,
          }}
        >
          {/* Header — imagen de marca con fade a blanco (igual que la web) */}
          <View style={{ height: 132 }}>
            <ImageBackground source={BANNER} resizeMode="cover" style={{ flex: 1 }}>
              <LinearGradient
                colors={['transparent', withAlpha(T.bgElevated, 0.0), T.bgElevated]}
                locations={[0, 0.45, 1]}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 }}
              />
            </ImageBackground>
          </View>

          {/* Cuerpo */}
          <View style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24 }}>
            <Text
              style={{
                color: T.fg,
                fontFamily: Fonts.semibold,
                fontSize: 23,
                lineHeight: 29,
                letterSpacing: -0.5,
                textAlign: 'center',
              }}
            >
              Tu prueba gratis terminó
            </Text>

            <Text
              style={{
                color: T.fgMuted,
                fontFamily: Fonts.regular,
                fontSize: 14,
                lineHeight: 21,
                textAlign: 'center',
                marginTop: 10,
              }}
            >
              ¡Gracias por probar OpenSys! Activá un plan cuando quieras para seguir operando — tus
              productos, ventas y configuración te esperan intactos.
            </Text>

            <View style={{ marginTop: 24, gap: 4 }}>
              <Button brand haptic="medium" onPress={handleActivate}>
                Activar mi plan
              </Button>

              <Pressable
                haptic="selection"
                onPress={() => logout()}
                style={{
                  height: 46,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: T.fgMuted, fontFamily: Fonts.medium, fontSize: 14 }}>
                  Cerrar sesión
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Animated.View>
  );
}
