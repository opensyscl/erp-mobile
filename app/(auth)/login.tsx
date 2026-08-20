import { useRouter } from 'expo-router';
import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { forwardRef, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Alert,
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
import Svg, { Path } from 'react-native-svg';
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
import { brandShadow, palette } from '~/theme/tokens';

/**
 * Login — hero de marca + card blanca flotante (estilo "Sign in to your account").
 *   - Hero azul (T.brand) con el mark de la empresa y título en blanco.
 *   - Card rounded-t-3xl que sube sobre el hero, con: Continuar con Google,
 *     divider, inputs rellenos email/clave, recordarme + olvidaste, CTA azul
 *     y el link de abajo. Tokens del design system, nada de paleta raw.
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
  const scrollRef = useRef<ScrollView>(null);
  const devEnvSheet = useRef<BottomSheetModalType>(null);
  const demoSheet = useRef<BottomSheetModalType>(null);

  // Al enfocar un input, subimos el scroll hasta el botón para que quede sobre
  // el teclado (el CTA no debe quedar tapado). Delay = esperar la animación del
  // teclado antes de medir el alto del contenido.
  const scrollToCta = () => {
    setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      Platform.OS === 'ios' ? 260 : 160,
    );
  };
  const logoTap = useFourTapGesture(() => devEnvSheet.current?.present());

  const setSlug = useTenantStore((s) => s.setSlug);
  // Tocás un user del sheet → rellena inputs + cierra el sheet + auto-login.
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
        toast.error('Credenciales incorrectas', `Revisa email/contraseña (tenant "${slug}")`);
      } else if (e instanceof Error) {
        toast.error('Error', e.message);
      }
    }
  };

  // Campos vacíos siempre. Antes venían prellenados con creds demo válidas en
  // dev, lo que hacía parecer que "el login pasa con cualquier texto" (en
  // realidad ya había creds buenas puestas). Para probar rápido → "Ver cuentas
  // demo", que autocompletea y entra.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Feedback inline (además del toast) — imposible que no se vea.
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const submitting = status === 'authenticating';

  const handleSubmit = async () => {
    setFormError(null);
    if (!email.trim() || !password) {
      setFormError('Email y contraseña son requeridos.');
      toast.error('Faltan datos', 'Email y contraseña son requeridos.');
      return;
    }
    try {
      await login({ email: email.trim(), password, tenantSlug: slug });
      setFormError(null);
      toast.success('Bienvenido', `Sesión iniciada como ${email.trim()}`);
    } catch (e) {
      let msg: string;
      if (e instanceof ApiError) {
        if (e.status === 422 || e.status === 401) {
          msg = slug
            ? `Credenciales incorrectas (tenant "${slug}").`
            : 'Credenciales incorrectas. Revisa email y contraseña.';
        } else if (e.status === 0 || e.status >= 500) {
          msg = `Error de conexión (status ${e.status}). API: ${resolveApiUrl()}`;
        } else {
          msg = e.message || `Error ${e.status} desde el backend`;
        }
      } else if (e instanceof Error) {
        msg = e.message || 'No pudimos iniciar sesión.';
      } else {
        msg = 'Sin conexión. No pudimos iniciar sesión.';
      }
      setFormError(msg);
      toast.error('No se pudo entrar', msg);
    }
  };

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: T.brand }}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, backgroundColor: T.bgElevated }}
        >
          {/* ───────────────── HERO azul ───────────────── */}
          <View style={{ backgroundColor: T.brand, paddingBottom: 44 }}>
            {/* Anillos decorativos sutiles */}
            <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -60, opacity: 0.12 }}>
              <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 40, borderColor: '#FFFFFF' }} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', top: 40, left: -70, opacity: 0.1 }}>
              <View style={{ width: 160, height: 160, borderRadius: 80, borderWidth: 28, borderColor: '#FFFFFF' }} />
            </View>

            {/* Back — chip translúcido */}
            <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
              <Pressable
                haptic="selection"
                accessibilityLabel="Volver"
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/(auth)/tenant');
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.16)',
                }}
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Animated.View
              entering={FadeInDown.duration(420)}
              style={{ alignItems: 'center', paddingTop: 18, paddingHorizontal: 24 }}
            >
              {/* Mark en cuadro redondeado translúcido */}
              <Pressable onPress={logoTap.onPress}>
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tenant?.logo_url ? (
                    <LogoMark size={36} src={tenant.logo_url} />
                  ) : (
                    <OpenSysLogo size={34} color="#FFFFFF" />
                  )}
                </View>
              </Pressable>

              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: Fonts.semibold,
                  fontSize: 27,
                  lineHeight: 33,
                  letterSpacing: -0.6,
                  textAlign: 'center',
                  marginTop: 18,
                }}
              >
                Inicia sesión{'\n'}en tu cuenta
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.82)',
                  fontFamily: Fonts.regular,
                  fontSize: 14,
                  lineHeight: 20,
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                Ingresa tu email y contraseña para continuar
              </Text>

              {slug ? (
                <Pressable
                  haptic="selection"
                  onPress={() => router.replace('/(auth)/tenant')}
                  style={{
                    marginTop: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 12.5 }}>
                    {slug}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.regular, fontSize: 11 }}>
                    · cambiar
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          </View>

          {/* ───────────────── CARD blanca ───────────────── */}
          <Animated.View
            entering={FadeInUp.delay(120).duration(420)}
            style={{
              flex: 1,
              backgroundColor: T.bgElevated,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              marginTop: -24,
              paddingHorizontal: 22,
              paddingTop: 28,
            }}
          >
            {/* Continuar con Google */}
            <Pressable
              haptic="selection"
              onPress={() =>
                toast.info('Google', 'El inicio con Google estará disponible pronto.')
              }
              style={{
                height: 54,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: T.border,
                backgroundColor: T.bgElevated,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <GoogleG size={18} />
              <Text style={{ color: T.fg, fontFamily: Fonts.semibold, fontSize: 15, letterSpacing: -0.2 }}>
                Continuar con Google
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
              <Text style={{ color: T.fgSubtle, fontFamily: Fonts.regular, fontSize: 12.5 }}>
                o con tu email
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
            </View>

            <View style={{ gap: 14 }}>
              <FilledInput
                value={email}
                onChangeText={setEmail}
                placeholder="tu@empresa.cl"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                onFocusExtra={scrollToCta}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <FilledInput
                ref={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onFocusExtra={scrollToCta}
                onSubmitEditing={handleSubmit}
                rightSlot={
                  <Pressable
                    haptic="selection"
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onPress={() => setShowPassword((v) => !v)}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={T.fgSubtle} />
                    ) : (
                      <Eye size={18} color={T.fgSubtle} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* Recordarme + Olvidaste */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
            >
              <Pressable
                haptic="selection"
                onPress={() => setRemember((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: remember ? 0 : 1.5,
                    borderColor: T.border,
                    backgroundColor: remember ? T.brand : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {remember ? <Check size={12} color="#FFFFFF" /> : null}
                </View>
                <Text style={{ color: T.fgMuted, fontFamily: Fonts.regular, fontSize: 13.5 }}>
                  Recordarme
                </Text>
              </Pressable>

              <Pressable
                haptic="selection"
                onPress={() =>
                  Alert.alert(
                    'Recuperar contraseña',
                    'Por seguridad, el restablecimiento lo realiza el administrador de tu cuenta. Contacta a soporte o al encargado de tu empresa.',
                  )
                }
              >
                <Text style={{ color: T.brand, fontFamily: Fonts.semibold, fontSize: 13.5 }}>
                  ¿Olvidaste tu clave?
                </Text>
              </Pressable>
            </View>

            {/* CTA */}
            <View style={{ marginTop: 22, gap: 12 }}>
              <SubmitButton onPress={handleSubmit} loading={submitting} label="Iniciar sesión" />

              {formError ? (
                <View
                  style={{
                    backgroundColor: '#FEE2E2',
                    borderColor: '#FCA5A5',
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color: '#B91C1C',
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    {formError}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bottom link */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 22,
              }}
            >
              <Text style={{ color: T.fgMuted, fontFamily: Fonts.regular, fontSize: 13.5 }}>
                {__DEV__ ? '¿Sin cuenta?' : '¿No conoces tu empresa?'}
              </Text>
              <Pressable
                haptic="selection"
                onPress={() =>
                  __DEV__ ? demoSheet.current?.present() : router.replace('/(auth)/tenant')
                }
              >
                <Text style={{ color: T.brand, fontFamily: Fonts.semibold, fontSize: 13.5 }}>
                  {__DEV__ ? 'Ver cuentas demo' : 'Cambiar empresa'}
                </Text>
              </Pressable>
            </View>

            {/* Footer mini */}
            <View
              style={{
                alignItems: 'center',
                marginTop: 'auto',
                paddingTop: 28,
                paddingBottom: insets.bottom + 16,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.success }} />
                <Text style={{ color: T.fgSubtle, fontFamily: Fonts.regular, fontSize: 11 }}>
                  Conexión segura · TLS
                </Text>
              </View>
              <Text
                style={{ color: T.fgSubtle, fontFamily: Fonts.regular, fontSize: 11, opacity: 0.6 }}
              >
                © OpenSys ERP
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DevEnvSheet ref={devEnvSheet} />
      <DemoAccountsSheet ref={demoSheet} onPick={handleDemoPick} />
    </Screen>
  );
}

/* ─────────────────────── FilledInput ─────────────────────── */
// Input relleno (fondo suave + borde), placeholder adentro, sin floating label.
// Focus → borde brand. rightSlot para el toggle del ojo.

interface FilledInputProps {
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
  onFocusExtra?: () => void;
  rightSlot?: ReactNode;
}

const FilledInput = forwardRef<RNTextInput, FilledInputProps>(function FilledInput(
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
    onFocusExtra,
    rightSlot,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: focused ? T.brand : T.border,
        backgroundColor: focused ? T.bgElevated : T.bg,
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
        onFocus={() => {
          setFocused(true);
          onFocusExtra?.();
        }}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          fontFamily: Fonts.regular,
          fontSize: 15,
          letterSpacing: -0.1,
          color: T.fg,
          paddingVertical: 0,
          ...(Platform.OS === 'web'
            ? ({ outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' } as object)
            : {}),
        }}
      />
      {rightSlot}
    </View>
  );
});

/* ─────────────────────── SubmitButton ─────────────────────── */

interface SubmitButtonProps {
  onPress: () => void;
  loading?: boolean;
  label: string;
}

function SubmitButton({ onPress, loading, label }: SubmitButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
            style={{ color: T.brandFg, fontFamily: Fonts.semibold, fontSize: 15.5, letterSpacing: -0.2 }}
          >
            {loading ? 'Verificando…' : label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────── Iconos inline ─────────────────────── */

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
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
