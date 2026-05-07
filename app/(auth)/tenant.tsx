import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { forwardRef, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevEnvSheet } from '~/components/DevEnvSheet';
import { HeaderPattern } from '~/components/HeaderPattern';
import { LogoMark, Wordmark } from '~/components/Logo';
import { Pressable, Screen, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useFourTapGesture } from '~/hooks/useFourTapGesture';
import { Building } from '~/lib/icons';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Tenant picker — primer paso de auth.
 * Mismo lenguaje visual que el login: hero con bg de marca + card flotante.
 *
 * En dev (__DEV__) prellenado con `ferreteria-routes` para acelerar pruebas.
 */
export default function TenantScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const insets = useSafeAreaInsets();
  const setSlug = useTenantStore((s) => s.setSlug);

  const [value, setValue] = useState(__DEV__ ? 'ferreteria-routes' : '');
  const [error, setError] = useState<string | null>(null);
  const devEnvSheet = useRef<BottomSheetModalType>(null);
  const logoTap = useFourTapGesture(() => devEnvSheet.current?.present());

  const handleContinue = async () => {
    const slug = value.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
      setError('Usa solo letras, números y guiones (2–40 caracteres).');
      return;
    }
    setError(null);
    await setSlug(slug);
    router.push('/(auth)/login');
  };

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* HERO con bg de marca */}
          <View
            style={{
              backgroundColor: brand.brand,
              paddingTop: insets.top + 24,
              paddingHorizontal: 20,
              paddingBottom: 110,
              overflow: 'hidden',
            }}
          >
            <HeaderPattern color={brand.brandFg} intensity={1.2} />

            {/* Wordmark top */}
            <Animated.View entering={FadeIn.duration(360)} style={{ alignSelf: 'flex-start' }}>
              <Wordmark size="md" tone="inverse" />
            </Animated.View>

            <View style={{ marginTop: 48, alignItems: 'center' }}>
              <Animated.View entering={FadeIn.delay(80).duration(360)}>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    width: 84,
                    height: 84,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12,
                    shadowRadius: 18,
                  }}
                >
                  <Pressable
                    onPress={logoTap.onPress}
                    style={{ alignItems: 'center', justifyContent: 'center' }}
                  >
                    <LogoMark size={52} variant="inverse" />
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(140).duration(360).springify()}
                style={{ alignItems: 'center', marginTop: 22 }}
              >
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.medium,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                  }}
                >
                  Bienvenido a OpenSys
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 30,
                lineHeight: 40,
                    letterSpacing: -0.9,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                >
                  Identifica tu empresa
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    opacity: 0.7,
                    fontFamily: Fonts.regular,
                    fontSize: 14,
                    lineHeight: 20,
                    textAlign: 'center',
                    marginTop: 8,
                    maxWidth: 320,
                  }}
                >
                  Ingresa el identificador único que te dió tu administrador.
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* CARD FLOTANTE */}
          <Animated.View
            entering={FadeInDown.delay(180).duration(420).springify()}
            style={{
              backgroundColor: colors.bgElevated,
              marginHorizontal: 20,
              marginTop: -84,
              borderRadius: 24,
              padding: 24,
              shadowColor: '#0a0d14',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.08,
              shadowRadius: 24,
              elevation: 6,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="overline" tone="brand">
              Empresa
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 22,
                lineHeight: 30,
                letterSpacing: -0.5,
                color: colors.fg,
                marginTop: 4,
              }}
            >
              ¿Cuál es tu identificador?
            </Text>

            <View style={{ marginTop: 18 }}>
              <SlugInput
                value={value}
                onChangeText={setValue}
                onSubmitEditing={handleContinue}
                error={error}
              />
            </View>

            {error ? (
              <Animated.View entering={FadeIn.duration(180)} className="mt-3">
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: colors.danger + '15',
                    borderWidth: 1,
                    borderColor: colors.danger + '30',
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: colors.danger,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: Fonts.bold, fontSize: 11, lineHeight: 12 }}>
                      !
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.danger,
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    {error}
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            <View style={{ marginTop: 18 }}>
              <ContinueButton
                onPress={handleContinue}
                bg={brand.brand}
                fg={brand.brandFg}
                disabled={!value.trim()}
              />
            </View>
          </Animated.View>

          {/* Info card */}
          <Animated.View
            entering={FadeIn.delay(360).duration(360)}
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              padding: 16,
              borderRadius: 14,
              backgroundColor: colors.bgSubtle,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: brand.brandSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={18} color={brand.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">¿No conoces tu identificador?</Text>
              <Text variant="caption" tone="muted" className="mt-1">
                Pídelo a tu administrador. Es la parte antes de
                <Text variant="caption" tone="muted" style={{ fontFamily: 'Menlo' }}>
                  {' '}
                  .app.opensys.cl
                </Text>{' '}
                en la URL del ERP web.
              </Text>
            </View>
          </Animated.View>

          {/* Footer compliance */}
          <Animated.View
            entering={FadeIn.delay(440).duration(360)}
            style={{
              alignItems: 'center',
              paddingHorizontal: 32,
              paddingVertical: 24,
              paddingBottom: insets.bottom + 16,
              gap: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.success,
                }}
              />
              <Text variant="caption" tone="subtle">
                Conexión segura · TLS encriptado
              </Text>
            </View>
            <Text variant="caption" tone="subtle" className="text-center" style={{ opacity: 0.7 }}>
              © OpenSys ERP
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sutil gradient sobre el body en dark mode */}
      {scheme === 'dark' ? (
        <LinearGradient
          colors={['transparent', colors.bg]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none' }}
        />
      ) : null}

      {/* Sheet oculto: tocar el LogoMark 4 veces para alternar entorno */}
      <DevEnvSheet ref={devEnvSheet} />
    </Screen>
  );
}

/* ─────────────── SlugInput ─────────────── */

interface SlugInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onSubmitEditing?: () => void;
  error: string | null;
}

const SlugInput = forwardRef<RNTextInput, SlugInputProps>(function SlugInput(
  { value, onChangeText, onSubmitEditing, error },
  ref,
) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [focused, setFocused] = useState(false);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.danger
      : focused
        ? brand.brand
        : value
          ? colors.borderStrong
          : colors.border,
  }));

  return (
    <View>
      <Text
        style={{
          color: focused ? brand.brand : colors.fgSubtle,
          fontFamily: Fonts.medium,
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Identificador
      </Text>

      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: 56,
            borderRadius: 14,
            backgroundColor: colors.bgSubtle,
            borderWidth: 1.5,
            paddingHorizontal: 14,
          },
          containerStyle,
        ]}
      >
        <TextInput
          ref={ref as Ref<RNTextInput>}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          placeholder="mi-empresa"
          placeholderTextColor={colors.fgSubtle}
          selectionColor={brand.brand}
          cursorColor={brand.brand}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          keyboardType="default"
          returnKeyType="next"
          style={{
            flex: 1,
            fontFamily: Fonts.medium,
            fontSize: 17,
            letterSpacing: -0.2,
            color: colors.fg,
            paddingVertical: 0,
          }}
        />
        <Text
          style={{
            color: colors.fgSubtle,
            fontFamily: 'Menlo',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          .app.opensys.cl
        </Text>
      </Animated.View>
    </View>
  );
});

void SlugInput;

/* ─────────────── ContinueButton ─────────────── */

interface ContinueButtonProps {
  onPress: () => void;
  bg: string;
  fg: string;
  disabled?: boolean;
}

function ContinueButton({ onPress, bg, fg, disabled }: ContinueButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      haptic={disabled ? 'none' : 'medium'}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) scale.value = withTiming(0.97, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 220 });
      }}
      scale="none"
    >
      <Animated.View
        style={[
          {
            height: 54,
            borderRadius: 14,
            overflow: 'hidden',
            opacity: disabled ? 0.4 : 1,
            shadowColor: bg,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: disabled ? 0 : 0.28,
            shadowRadius: 16,
            elevation: disabled ? 0 : 6,
          },
          animStyle,
        ]}
      >
        <LinearGradient
          colors={[bg, mixColor(bg, '#000', 0.18)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Text
            style={{
              color: fg,
              fontFamily: Fonts.semibold,
              fontSize: 15,
              letterSpacing: -0.2,
            }}
          >
            Continuar
          </Text>
          <Text
            style={{
              color: fg,
              fontFamily: Fonts.semibold,
              fontSize: 15,
            }}
          >
            →
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/** Mezcla simple en hex/rgb. ratio 0..1 */
function mixColor(hexA: string, hexB: string, ratio: number): string {
  const toRgb = (h: string): [number, number, number] | null => {
    if (h.startsWith('rgb')) {
      const m = h.match(/\d+/g);
      if (!m) return null;
      return [Number(m[0]), Number(m[1]), Number(m[2])];
    }
    const v = h.replace('#', '');
    if (v.length !== 6) return null;
    return [
      parseInt(v.slice(0, 2), 16),
      parseInt(v.slice(2, 4), 16),
      parseInt(v.slice(4, 6), 16),
    ];
  };
  const a = toRgb(hexA);
  const b = toRgb(hexB);
  if (!a || !b) return hexA;
  const mix = a.map((c, i) => Math.round(c * (1 - ratio) + b[i]! * ratio));
  return `rgb(${mix.join(' ')})`;
}
