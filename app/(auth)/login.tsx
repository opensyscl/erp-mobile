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
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoAccountsSheet } from '~/components/DemoAccountsSheet';
import { DevEnvSheet } from '~/components/DevEnvSheet';
import { LogoMark } from '~/components/Logo';
import { Pressable, Screen, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useFourTapGesture } from '~/hooks/useFourTapGesture';
import { ApiError } from '~/lib/api';
import { resolveApiUrl } from '~/lib/env';
import { toast } from '~/components/Toast';
import { ArrowLeft, Eye, EyeOff } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

/**
 * Login pantalla — variante "minimal":
 *   - Fondo plano, sin hero ni patrón
 *   - Logo pequeño centrado, tipografía grande
 *   - Inputs tipo píldora con borde sutil
 *   - Botón primario pill (alto contraste con el bg de la pantalla)
 *   - Acciones secundarias como links de texto al pie
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
    demoSheet.current?.dismiss();
  };

  // Prellenado en dev — chips por plan (botillería). NO shipea a prod.
  const DEV_ACCOUNTS: {
    id: 'starter' | 'growth' | 'enterprise';
    label: string;
    email: string;
    password: string;
    tenant: string;
  }[] = [
    { id: 'starter',    label: 'Starter',    email: 'botilleria.starter@demo.cl',    password: '12345678', tenant: 'botilleria-starter' },
    { id: 'growth',     label: 'Growth',     email: 'botilleria.growth@demo.cl',     password: '12345678', tenant: 'botilleria-growth' },
    { id: 'enterprise', label: 'Enterprise', email: 'botilleria.enterprise@demo.cl', password: '12345678', tenant: 'botilleria-enterprise' },
  ];
  const [email, setEmail] = useState(__DEV__ ? DEV_ACCOUNTS[0]!.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_ACCOUNTS[0]!.password : '');
  const [showPassword, setShowPassword] = useState(false);

  const fillAccount = async (acct: (typeof DEV_ACCOUNTS)[number]) => {
    await setSlug(acct.tenant);
    setEmail(acct.email);
    setPassword(acct.password);
  };

  const submitting = status === 'authenticating';

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error('Faltan datos', 'Email y contraseña son requeridos.');
      return;
    }
    try {
      await login({ email: email.trim(), password, tenantSlug: slug });
      toast.success('Bienvenido', `Sesión iniciada como ${email.trim()}`);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 422 || e.status === 401) {
          toast.error(
            'Credenciales incorrectas',
            slug ? `Revisa email/contraseña (tenant "${slug}").` : 'Revisa tu email y contraseña.',
          );
        } else if (e.status === 0 || e.status >= 500) {
          toast.error(
            'Error de conexión',
            `Status ${e.status}. ¿El backend está corriendo en ${resolveApiUrl()}?`,
          );
        } else {
          toast.error('Error', e.message || `Error ${e.status} desde el backend`);
        }
      } else if (e instanceof Error) {
        toast.error('Error', e.message || 'No pudimos iniciar sesión.');
      } else {
        toast.error('Sin conexión', 'No pudimos iniciar sesión. Reintenta.');
      }
    }
  };

  // Botón primario: alto contraste contra el bg (negro en light, blanco en dark)
  const primaryBg = scheme === 'dark' ? colors.fg : colors.fg;
  const primaryFg = scheme === 'dark' ? colors.bg : colors.bg;

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8 }}
        >
          {/* Top bar — solo back */}
          <View style={{ paddingHorizontal: 20, height: 44, justifyContent: 'center' }}>
            <Pressable
              haptic="selection"
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} color={colors.fg} />
            </Pressable>
          </View>

          {/* Hero centrado */}
          <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 36 }}>
            <Animated.View entering={FadeIn.duration(380)}>
              <Pressable
                onPress={logoTap.onPress}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.bgSubtle,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <LogoMark size={32} />
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(80).duration(360).springify()}
              style={{ alignItems: 'center', marginTop: 26 }}
            >
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: Fonts.semibold,
                  fontSize: 30,
                  lineHeight: 38,
                  letterSpacing: -0.8,
                }}
              >
                Bienvenido
              </Text>
              {slug ? (
                <Pressable
                  haptic="selection"
                  onPress={() => router.replace('/(auth)/tenant')}
                  style={{ marginTop: 6 }}
                >
                  <Text
                    style={{
                      color: colors.fgMuted,
                      fontFamily: Fonts.regular,
                      fontSize: 14,
                      letterSpacing: -0.1,
                    }}
                  >
                    a <Text style={{ color: colors.fg, fontFamily: Fonts.medium }}>{slug}</Text>
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {__DEV__ ? (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                {DEV_ACCOUNTS.map((acct) => {
                  const active = email === acct.email;
                  return (
                    <Pressable
                      key={acct.id}
                      haptic="selection"
                      onPress={() => fillAccount(acct)}
                      style={{
                        flex: 1,
                        height: 34,
                        borderRadius: 999,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? colors.fg : 'transparent',
                        borderWidth: 1,
                        borderColor: active ? colors.fg : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.bg : colors.fgMuted,
                          fontFamily: Fonts.medium,
                          fontSize: 12,
                          letterSpacing: 0.1,
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

            <PillInput
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <PillInput
              ref={passwordRef}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              rightSlot={
                <Pressable
                  haptic="selection"
                  onPress={() => setShowPassword((v) => !v)}
                  style={{
                    width: 40,
                    height: 40,
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

            <View style={{ marginTop: 8 }}>
              <PillButton
                onPress={handleSubmit}
                loading={submitting}
                bg={primaryBg}
                fg={primaryFg}
                label="Continuar"
              />
            </View>

            {/* Acciones secundarias */}
            <View style={{ marginTop: 22, alignItems: 'center', gap: 14 }}>
              <Pressable haptic="selection">
                <Text
                  style={{
                    color: colors.fgMuted,
                    fontFamily: Fonts.medium,
                    fontSize: 13,
                  }}
                >
                  ¿Olvidaste tu clave?
                </Text>
              </Pressable>

              {__DEV__ ? (
                <Pressable
                  haptic="selection"
                  onPress={() => demoSheet.current?.present()}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
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
                      fontSize: 13,
                      letterSpacing: -0.1,
                    }}
                  >
                    Ver todas las cuentas demo
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Footer compliance */}
          <View
            style={{
              alignItems: 'center',
              paddingHorizontal: 32,
              paddingBottom: insets.bottom + 18,
              paddingTop: 36,
              marginTop: 'auto',
              gap: 6,
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
            <Text variant="caption" tone="subtle" style={{ opacity: 0.6, textAlign: 'center' }}>
              © OpenSys ERP
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DevEnvSheet ref={devEnvSheet} />
      <DemoAccountsSheet ref={demoSheet} onPick={handleDemoPick} />
    </Screen>
  );
}

/* ─────────────────────── PillInput ─────────────────────── */

interface PillInputProps {
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
  rightSlot?: ReactNode;
}

const PillInput = forwardRef<RNTextInput, PillInputProps>(function PillInput(
  {
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
    rightSlot,
  },
  ref,
) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 999,
        backgroundColor: colors.bgSubtle,
        paddingHorizontal: 20,
        paddingRight: rightSlot ? 8 : 20,
        borderWidth: 1,
        borderColor: focused ? colors.fg : colors.border,
      }}
    >
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
    </View>
  );
});

/* ─────────────────────── PillButton ─────────────────────── */

interface PillButtonProps {
  onPress: () => void;
  loading?: boolean;
  bg: string;
  fg: string;
  label: string;
}

function PillButton({ onPress, loading, bg, fg, label }: PillButtonProps) {
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
            height: 56,
            borderRadius: 999,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.85 : 1,
          },
          animStyle,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {loading ? (
            <Animated.View
              entering={FadeIn.duration(160)}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
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
      </Animated.View>
    </Pressable>
  );
}
