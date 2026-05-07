import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
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

import { DemoAccountsSheet } from '~/components/DemoAccountsSheet';
import { DevEnvSheet } from '~/components/DevEnvSheet';
import { HeaderPattern } from '~/components/HeaderPattern';
import { LogoMark } from '~/components/Logo';
import { Pressable, Screen, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useFourTapGesture } from '~/hooks/useFourTapGesture';
import { ApiError } from '~/lib/api';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette, shadows } from '~/theme/tokens';

/**
 * Login pantalla — diseño "premium":
 *   - Hero con bg de marca + pattern delicado + LogoMark grande
 *   - Card flotante blanca que overlap el hero (estilo wallet apps)
 *   - Inputs flotantes con label que sube al focusear
 *   - Botón con shine y haptic
 *   - Footer compliance discreto
 */
export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const insets = useSafeAreaInsets();
  const slug = useTenantStore((s) => s.slug);
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);

  const passwordRef = useRef<RNTextInput>(null);
  const devEnvSheet = useRef<BottomSheetModalType>(null);
  const demoSheet = useRef<BottomSheetModalType>(null);
  const logoTap = useFourTapGesture(() => devEnvSheet.current?.present());

  const setSlug = useTenantStore((s) => s.setSlug);
  const handleDemoPick = async (slug: string, em: string, pw: string) => {
    await setSlug(slug);
    setEmail(em);
    setPassword(pw);
    setError(null);
    demoSheet.current?.dismiss();
  };

  // Prellenado en dev — chips para alternar entre admin y driver. NO shipea a prod.
  const DEV_ACCOUNTS: { id: 'admin' | 'driver'; label: string; email: string; password: string }[] = [
    { id: 'admin', label: 'Admin', email: 'ferreteria.routes@demo.cl', password: '12345678' },
    { id: 'driver', label: 'Repartidor', email: 'driver.routes@demo.cl', password: '12345678' },
  ];
  const [email, setEmail] = useState(__DEV__ ? DEV_ACCOUNTS[0]!.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_ACCOUNTS[0]!.password : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillAccount = (acct: (typeof DEV_ACCOUNTS)[number]) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setError(null);
  };

  const submitting = status === 'authenticating';

  const handleSubmit = async () => {
    if (!slug) {
      router.replace('/(auth)/tenant');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email y contraseña son requeridos.');
      return;
    }
    setError(null);
    try {
      await login({ email: email.trim(), password, tenantSlug: slug });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(
          e.status === 422 || e.status === 401
            ? 'Credenciales incorrectas.'
            : e.message,
        );
      } else {
        setError('No pudimos iniciar sesión. Reintenta.');
      }
    }
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
              paddingTop: insets.top + 12,
              paddingHorizontal: 20,
              paddingBottom: 96,
              overflow: 'hidden',
            }}
          >
            <HeaderPattern color={brand.brandFg} intensity={1.2} />

            <Pressable
              haptic="selection"
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={18} color={brand.brandFg} />
            </Pressable>

            <View style={{ marginTop: 36, alignItems: 'center' }}>
              <Animated.View entering={FadeIn.duration(360)}>
                <Pressable
                  onPress={logoTap.onPress}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    width: 76,
                    height: 76,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LogoMark size={48} variant="inverse" />
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(80).duration(360).springify()} style={{ alignItems: 'center', marginTop: 18 }}>
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
                  Estás entrando a
                </Text>
                <Text
                  style={{
                    color: brand.brandFg,
                    fontFamily: Fonts.semibold,
                    fontSize: 26,
                lineHeight: 36,
                    letterSpacing: -0.6,
                    marginTop: 6,
                  }}
                  numberOfLines={1}
                >
                  {slug ?? 'OpenSys'}
                </Text>
                <Pressable
                  haptic="selection"
                  onPress={() => router.replace('/(auth)/tenant')}
                  className="mt-3"
                >
                  <Text
                    style={{
                      color: brand.brandFg,
                      opacity: 0.75,
                      fontFamily: Fonts.regular,
                      fontSize: 12,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Cambiar de empresa
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>

          {/* CARD FLOTANTE con form */}
          <Animated.View
            entering={FadeInDown.delay(160).duration(420).springify()}
            style={{
              backgroundColor: colors.bgElevated,
              marginHorizontal: 20,
              marginTop: -68,
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadows.lg,
            }}
          >
            <Text variant="overline" tone="brand">
              Acceso
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semibold,
                fontSize: 24,
                lineHeight: 34,
                letterSpacing: -0.6,
                color: colors.fg,
                marginTop: 4,
              }}
            >
              Iniciar sesión
            </Text>

            {__DEV__ ? (
              <Pressable
                haptic="selection"
                onPress={() => demoSheet.current?.present()}
                style={{
                  marginTop: 14,
                  height: 38,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: brand.brandSubtle,
                  borderWidth: 1,
                  borderColor: brand.brand + '33',
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: brand.brand,
                  }}
                />
                <Text
                  style={{
                    color: brand.brand,
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: 0.2,
                    includeFontPadding: false,
                  } as never}
                >
                  Ver todas las cuentas demo
                </Text>
              </Pressable>
            ) : null}

            {__DEV__ ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {DEV_ACCOUNTS.map((acct) => {
                  const active = email === acct.email;
                  return (
                    <Pressable
                      key={acct.id}
                      haptic="selection"
                      onPress={() => fillAccount(acct)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? brand.brand : colors.bgSubtle,
                        borderWidth: 1,
                        borderColor: active ? brand.brand : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? brand.brandFg : colors.fgMuted,
                          fontFamily: Fonts.medium,
                          fontSize: 12,
                          letterSpacing: 0.2,
                          includeFontPadding: false,
                        } as never}
                      >
                        {acct.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={{ marginTop: 20, gap: 14 }}>
              <FloatingInput
                label="Correo electrónico"
                placeholder="tucorreo@empresa.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                icon={<Mail size={18} color={colors.fgMuted} />}
              />

              <FloatingInput
                ref={passwordRef}
                label="Contraseña"
                placeholder="••••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                icon={<Lock size={18} color={colors.fgMuted} />}
                rightSlot={
                  <Pressable
                    haptic="selection"
                    onPress={() => setShowPassword((v) => !v)}
                    style={{
                      width: 36,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.fgSubtle} />
                    ) : (
                      <Eye size={18} color={colors.fgSubtle} />
                    )}
                  </Pressable>
                }
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
                    <Text
                      style={{ color: '#fff', fontFamily: Fonts.bold, fontSize: 11, lineHeight: 12 }}
                    >
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

            <View className="flex-row items-center justify-between mt-4">
              <View />
              <Pressable haptic="selection">
                <Text
                  style={{
                    color: brand.brand,
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: -0.1,
                  }}
                >
                  Olvidé mi clave
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 18 }}>
              <ShinyButton
                onPress={handleSubmit}
                loading={submitting}
                bg={brand.brand}
                fg={brand.brandFg}
                label="Entrar"
              />
            </View>
          </Animated.View>

          {/* Footer compliance */}
          <Animated.View
            entering={FadeIn.delay(360).duration(360)}
            style={{
              alignItems: 'center',
              paddingHorizontal: 32,
              paddingVertical: 24,
              paddingBottom: insets.bottom + 16,
              gap: 4,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
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
              © OpenSys ERP · Tus datos no salen del tenant
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sheet oculto: tocar el LogoMark 4 veces para alternar entorno */}
      <DevEnvSheet ref={devEnvSheet} />

      {/* Sheet de cuentas demo (botón visible en __DEV__) */}
      <DemoAccountsSheet ref={demoSheet} onPick={handleDemoPick} />
    </Screen>
  );
}

/* ─────────────────────── FloatingInput ─────────────────────── */

interface FloatingInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: 'email' | 'password' | 'off';
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

const FloatingInput = forwardRef<RNTextInput, FloatingInputProps>(function FloatingInput(
  {
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    keyboardType = 'default',
    autoCapitalize,
    autoCorrect,
    autoComplete,
    returnKeyType = 'next',
    onSubmitEditing,
    icon,
    rightSlot,
  },
  ref,
) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [focused, setFocused] = useState(false);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: focused ? brand.brand : value ? colors.borderStrong : colors.border,
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
        {label}
      </Text>

      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: 52,
            borderRadius: 14,
            backgroundColor: colors.bgSubtle,
            paddingHorizontal: 14,
            borderWidth: 1.5,
          },
          containerStyle,
        ]}
      >
        {icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}
        <TextInput
          ref={ref as Ref<RNTextInput>}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.fgSubtle}
          selectionColor={brand.brand}
          cursorColor={brand.brand}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            fontFamily: Fonts.regular,
            fontSize: 15,
            letterSpacing: -0.1,
            color: colors.fg,
            paddingVertical: 0,
          }}
        />
        {rightSlot}
      </Animated.View>
    </View>
  );
});

/* ─────────────────────── ShinyButton ─────────────────────── */

interface ShinyButtonProps {
  onPress: () => void;
  loading?: boolean;
  bg: string;
  fg: string;
  label: string;
}

function ShinyButton({ onPress, loading, bg, fg, label }: ShinyButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      haptic="medium"
      disabled={loading}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 120 });
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
            shadowColor: bg,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 6,
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
            opacity: loading ? 0.85 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {loading ? (
              <Animated.View
                entering={FadeIn.duration(160)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: fg,
                  borderTopColor: 'transparent',
                }}
              />
            ) : null}
            <Text
              style={{
                color: fg,
                fontFamily: Fonts.semibold,
                fontSize: 15,
                letterSpacing: -0.2,
              }}
            >
              {loading ? 'Verificando…' : label}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

/** Mezcla simple en RGB hex. ratio 0..1 (0=color, 1=mix). */
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
