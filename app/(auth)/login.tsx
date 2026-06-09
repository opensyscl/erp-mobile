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
import { OpenSysLogo } from '~/components/OpenSysLogo';
import { Pressable, Screen, Text } from '~/components/ui';
import { useFourTapGesture } from '~/hooks/useFourTapGesture';
import { ApiError } from '~/lib/api';
import { resolveApiUrl } from '~/lib/env';
import { toast } from '~/components/Toast';
import { ArrowLeft, Eye, EyeOff } from '~/lib/icons';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette, shadows } from '~/theme/tokens';

/**
 * Login — card flotante sobre el bg cálido del sistema.
 *   - Tokens del design system (palette.light), nada de paleta local:
 *     brand para CTA/focus/links, success para el dot TLS, card
 *     bgElevated + border igual que el resto de la app.
 *   - Form dentro de una card rounded-3xl con shadows.md.
 *   - Inputs con floating label (el bg de la label corta el borde — matchea
 *     el bg de la CARD, no el de la página).
 *   - CTA pill con brandShadow, igual lenguaje que la tab bar pill.
 */

// La app corre bloqueada en light mode — tokens resueltos una vez acá.
const T = palette.light;

export default function LoginScreen() {
  const router = useRouter();
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
  // Tocás un user del sheet → rellena inputs + cierra el sheet + auto-login.
  // Espejo del comportamiento del web (fillDemo con autoSubmit).
  const handleDemoPick = async (slug: string, em: string, pw: string) => {
    await setSlug(slug);
    setEmail(em);
    setPassword(pw);
    demoSheet.current?.dismiss();
    try {
      await login({ email: em.trim(), password: pw, tenantSlug: slug });
      toast.success('Bienvenido', `Sesión iniciada como ${em}`);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 422 || e.status === 401)) {
        toast.error('Credenciales incorrectas', `Revisá email/contraseña (tenant "${slug}")`);
      } else if (e instanceof Error) {
        toast.error('Error', e.message);
      }
    }
  };

  // Prellenado mínimo en dev: driver con data sembrada del día — al entrar
  // se ve el dashboard con la card "Mi ruta de hoy" en estado "En ruta"
  // (3/7 entregadas) + próxima parada. Pass seedeada local = 12345678.
  const DEV_DEFAULT = { email: 'driver.routes@demo.cl', password: '12345678' };
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

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: T.bg }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Top bar — back en chip bordeado, como las sub-pantallas */}
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingHorizontal: 20,
              height: 44 + insets.top + 8,
              justifyContent: 'flex-end',
            }}
          >
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
                backgroundColor: T.bgElevated,
                borderWidth: 1,
                borderColor: T.border,
                ...shadows.xs,
              }}
            >
              <ArrowLeft size={20} color={T.fg} />
            </Pressable>
          </View>

          {/* Logo + título + chip de tenant */}
          <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 28 }}>
            <Animated.View entering={FadeIn.duration(380)}>
              <Pressable onPress={logoTap.onPress}>
                {tenant?.logo_url ? (
                  <LogoMark size={64} src={tenant.logo_url} />
                ) : (
                  <OpenSysLogo size={64} color={T.fg} />
                )}
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(80).duration(360)}
              style={{ alignItems: 'center', marginTop: 20 }}
            >
              <Text
                style={{
                  color: T.fg,
                  fontFamily: Fonts.semibold,
                  fontSize: 28,
                  letterSpacing: -0.6,
                }}
              >
                Iniciar sesión
              </Text>
              {slug ? (
                <Pressable
                  haptic="selection"
                  onPress={() => router.replace('/(auth)/tenant')}
                  style={{
                    marginTop: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: T.brandSubtle,
                  }}
                >
                  <Text
                    style={{
                      color: T.brand,
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      letterSpacing: -0.1,
                    }}
                  >
                    {slug}
                  </Text>
                  <Text style={{ color: T.brand, fontFamily: Fonts.regular, fontSize: 11, opacity: 0.7 }}>
                    cambiar
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>

          {/* Card flotante con el form — rounded-3xl border border, como toda card de la app */}
          <View style={{ paddingHorizontal: 20 }}>
            <Animated.View
              entering={FadeInUp.delay(140).duration(380)}
              style={{
                backgroundColor: T.bgElevated,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: T.border,
                paddingHorizontal: 20,
                paddingTop: 26,
                paddingBottom: 22,
                gap: 18,
                ...shadows.md,
              }}
            >
              <FloatingLabelInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <FloatingLabelInput
                ref={passwordRef}
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                labelSideAction={
                  <Pressable haptic="selection">
                    <Text
                      style={{
                        color: T.brand,
                        fontFamily: Fonts.medium,
                        fontSize: 12,
                      }}
                    >
                      ¿Olvidaste?
                    </Text>
                  </Pressable>
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
                      <EyeOff size={18} color={T.fgSubtle} />
                    ) : (
                      <Eye size={18} color={T.fgSubtle} />
                    )}
                  </Pressable>
                }
              />

              <View style={{ marginTop: 4, gap: 12 }}>
                <PillButton onPress={handleSubmit} loading={submitting} label="Iniciar sesión" />

                {__DEV__ ? (
                  <Pressable
                    haptic="selection"
                    onPress={() => demoSheet.current?.present()}
                    style={{
                      height: 50,
                      borderRadius: 999,
                      backgroundColor: T.bg,
                      borderWidth: 1,
                      borderColor: T.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: T.fg,
                        fontFamily: Fonts.semibold,
                        fontSize: 14,
                        letterSpacing: -0.2,
                      }}
                    >
                      Ver cuentas demo
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Animated.View>

            <View
              style={{
                alignItems: 'center',
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ color: T.fgMuted, fontFamily: Fonts.regular, fontSize: 13 }}>
                ¿Sin cuenta?
              </Text>
              <Pressable haptic="selection" onPress={() => demoSheet.current?.present()}>
                <Text style={{ color: T.brand, fontFamily: Fonts.semibold, fontSize: 13 }}>
                  Probá una demo
                </Text>
              </Pressable>
            </View>

            {/* Footer mini — TLS + copyright */}
            <View
              style={{
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: 32,
                paddingBottom: insets.bottom + 16,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.success }}
                />
                <Text style={{ color: T.fgSubtle, fontFamily: Fonts.regular, fontSize: 11 }}>
                  Conexión segura · TLS
                </Text>
              </View>
              <Text
                style={{
                  color: T.fgSubtle,
                  fontFamily: Fonts.regular,
                  fontSize: 11,
                  opacity: 0.6,
                }}
              >
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

/* ─────────────────────── FloatingLabelInput ─────────────────────── */
// Outlined input con label que flota arriba del borde superior, "cortándolo"
// con un mini bg del color de la CARD que lo contiene. La label puede tener
// un labelSideAction (ej. "¿Olvidaste?") alineado a la derecha.

interface FloatingLabelInputProps {
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
  rightSlot?: ReactNode;
  labelSideAction?: ReactNode;
}

const FloatingLabelInput = forwardRef<RNTextInput, FloatingLabelInputProps>(
  function FloatingLabelInput(
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
      rightSlot,
      labelSideAction,
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const borderColor = focused ? T.brand : T.border;

    return (
      <View style={{ position: 'relative' }}>
        {/* Action a la derecha de la label (ej. "¿Olvidaste?") — vive en su
            propio absolute para alinearse con la label sin estirar el border. */}
        {labelSideAction ? (
          <View style={{ position: 'absolute', top: -10, right: 16, zIndex: 5 }}>
            {labelSideAction}
          </View>
        ) : null}

        {/* Label flotante — el bg matchea el bg de la card para "cortar" el borde */}
        <View
          style={{
            position: 'absolute',
            top: -8,
            left: 12,
            paddingHorizontal: 4,
            backgroundColor: T.bgElevated,
            zIndex: 4,
          }}
        >
          <Text
            style={{
              color: focused ? T.brand : T.fgMuted,
              fontFamily: Fonts.medium,
              fontSize: 12,
              lineHeight: 14,
              letterSpacing: -0.1,
            }}
          >
            {label}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 56,
            borderRadius: 14,
            borderWidth: 1,
            borderColor,
            backgroundColor: T.bgElevated,
            paddingHorizontal: 16,
            paddingRight: rightSlot ? 4 : 16,
          }}
        >
          <TextInput
            ref={ref as Ref<RNTextInput>}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={T.fgSubtle}
            selectionColor={T.brand}
            cursorColor={T.brand}
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
              color: T.fg,
              paddingVertical: 0,
              // RN Web: apagar el outline/border del <input> nativo del browser,
              // si no se ve un rectángulo anidado dentro del wrapper outlined.
              ...(Platform.OS === 'web'
                ? ({ outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' } as object)
                : {}),
            }}
          />
          {rightSlot}
        </View>
      </View>
    );
  },
);

/* ─────────────────────── PillButton ─────────────────────── */

interface PillButtonProps {
  onPress: () => void;
  loading?: boolean;
  label: string;
}

function PillButton({ onPress, loading, label }: PillButtonProps) {
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
            backgroundColor: T.brand,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.85 : 1,
            ...brandShadow(T.brand, 'md'),
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
                borderColor: T.brandFg,
                borderTopColor: 'transparent',
              }}
            />
          ) : null}
          <Text
            style={{
              color: T.brandFg,
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
