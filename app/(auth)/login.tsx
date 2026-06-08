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
import { HeroPattern } from '~/components/HeroPattern';
import { LogoMark } from '~/components/Logo';
import { Pressable, Screen, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useFourTapGesture } from '~/hooks/useFourTapGesture';
import { ApiError } from '~/lib/api';
import { resolveApiUrl } from '~/lib/env';
import { toast } from '~/components/Toast';
import { ArrowLeft, Eye, EyeOff, Lock, User } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette, withAlpha } from '~/theme/tokens';

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
  const tenant = useTenantStore((s) => s.tenant);
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

  // Prellenado mínimo en dev: dejamos email/password ya escritos con la cuenta
  // admin de ferreteria-routes para no perder tiempo tipeando al iterar. Para
  // alternar cuentas se usa el BottomSheet DemoAccountsSheet (link al pie).
  const DEV_DEFAULT = { email: 'ferreteria.routes@demo.cl', password: '12345678' };
  const [email, setEmail] = useState(__DEV__ ? DEV_DEFAULT.email : '');
  const [password, setPassword] = useState(__DEV__ ? DEV_DEFAULT.password : '');
  const [showPassword, setShowPassword] = useState(false);

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

  // Botón primario: alto contraste contra el bg (siempre negro→blanco texto
  // porque el theme está lockeado a light por ahora).
  const primaryBg = colors.fg;
  const primaryFg = colors.bg;

  // Hero con color sólido neutro #fafafa (del mockup del SVG que mandó
  // Sthamly) + patrón tileable encima. Independiente del brand del tenant
  // — más sobrio que el alpha previo y aguanta cualquier paleta.
  const heroBg = '#fafafa';
  // Logo del ERP por default (cuando el tenant no tiene logo propio).
  const fallbackLogo = 'https://erp.opensys.cl/logo/logo.png';

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: heroBg }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Hero — fondo sólido + patrón geométrico + back + logo grande */}
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingBottom: 56,
              backgroundColor: heroBg,
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <HeroPattern />
            {/* Back */}
            <View style={{ alignSelf: 'stretch', paddingHorizontal: 20, height: 44, justifyContent: 'center' }}>
              <Pressable
                haptic="selection"
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(auth)/tenant');
                  }
                }}
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

            {/* Logo grande centrado (con 4-tap secreto al DevEnvSheet) */}
            <Animated.View entering={FadeIn.duration(380)} style={{ marginTop: 20 }}>
              <Pressable
                onPress={logoTap.onPress}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.bg,
                  shadowColor: '#0a0d14',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.08,
                  shadowRadius: 18,
                  elevation: 6,
                }}
              >
                <LogoMark size={56} src={tenant?.logo_url ?? fallbackLogo} />
              </Pressable>
            </Animated.View>

            {slug ? (
              <Animated.View entering={FadeInUp.delay(80).duration(360)} style={{ marginTop: 14 }}>
                <Pressable haptic="selection" onPress={() => router.replace('/(auth)/tenant')}>
                  <Text
                    style={{
                      color: colors.fgMuted,
                      fontFamily: Fonts.regular,
                      fontSize: 13,
                      letterSpacing: -0.1,
                    }}
                  >
                    a <Text style={{ color: colors.fg, fontFamily: Fonts.medium }}>{slug}</Text>
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </View>

          {/* Card flotante — el form vive acá. El hero queda recortado por el border-radius. */}
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bg,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              marginTop: -28,
              paddingTop: 32,
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 24,
              gap: 18,
            }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: Fonts.semibold,
                fontSize: 26,
                letterSpacing: -0.6,
                textAlign: 'center',
              }}
            >
              Iniciar sesión
            </Text>

            <View style={{ gap: 12 }}>
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
                leftSlot={
                  <IconChip
                    color={palette.light.warning}
                    bg={withAlpha(palette.light.warning, 0.18)}
                    icon={<User size={14} color={palette.light.warning} />}
                  />
                }
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
                leftSlot={
                  <IconChip
                    color={brand.brand}
                    bg={withAlpha(brand.brand, 0.15)}
                    icon={<Lock size={14} color={brand.brand} />}
                  />
                }
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
            </View>

            {/* Row "¿Olvidaste?" + Continuar — como el mockup */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 4,
                gap: 12,
              }}
            >
              <Pressable haptic="selection" style={{ flexShrink: 1 }}>
                <Text
                  style={{
                    color: brand.brand,
                    fontFamily: Fonts.medium,
                    fontSize: 13,
                  }}
                >
                  ¿Olvidaste tu clave?
                </Text>
              </Pressable>

              <PillButton
                onPress={handleSubmit}
                loading={submitting}
                bg={primaryBg}
                fg={primaryFg}
                label="Continuar"
                compact
              />
            </View>

            {/* Demo cuentas (solo dev) — sustituye a los iconos sociales del mockup */}
            {__DEV__ ? (
              <View style={{ alignItems: 'center', marginTop: 16 }}>
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
                    Ver cuentas demo
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Footer mini — TLS + copyright al pie del card */}
            <View
              style={{
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: 24,
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
                  Conexión segura · TLS
                </Text>
              </View>
              <Text variant="caption" tone="subtle" style={{ opacity: 0.6 }}>
                © OpenSys ERP
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DevEnvSheet ref={devEnvSheet} />
      <DemoAccountsSheet ref={demoSheet} onPick={handleDemoPick} />
    </Screen>
  );
}

/* ─────────────────────── IconChip ─────────────────────── */
// Cuadradito redondeado de color suave con un ícono adentro. Usado como
// leftSlot de los PillInputs (estilo del mockup: chip naranja para usuario,
// azul/lila para candado). Acepta cualquier ícono.
function IconChip({ icon, color: _color, bg }: { icon: ReactNode; color: string; bg: string }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
      }}
    >
      {icon}
    </View>
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
  leftSlot?: ReactNode;
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
    leftSlot,
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
        gap: 10,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.bgSubtle,
        paddingLeft: leftSlot ? 14 : 20,
        paddingRight: rightSlot ? 8 : 20,
        borderWidth: 1,
        borderColor: focused ? colors.fg : colors.border,
      }}
    >
      {leftSlot}
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
  /** Si está activo, el botón se ajusta al contenido (no full-width) — usado
   *  para el row "¿Olvidaste? · Continuar" del nuevo diseño. */
  compact?: boolean;
}

function PillButton({ onPress, loading, bg, fg, label, compact }: PillButtonProps) {
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
            height: compact ? 48 : 56,
            paddingHorizontal: compact ? 26 : 0,
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
