import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
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

import { OpenSysLogo } from '~/components/OpenSysLogo';
import { Pressable, Screen, Text } from '~/components/ui';
import { toast } from '~/components/Toast';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft } from '~/lib/icons';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { brandShadow, palette } from '~/theme/tokens';

/**
 * ForgotPassword — solicitud de restablecimiento de contraseña.
 *   Mismo lenguaje visual que el login (hero azul + card blanca flotante).
 *   El usuario ingresa su email → POST /api/mobile/auth/forgot-password.
 *   El backend siempre responde 200 (no revela si el email existe) y, si
 *   corresponde, manda un correo con el link a la página web de reset.
 *   Tras enviar mostramos un estado de confirmación (check + instrucciones).
 */

// La app corre bloqueada en light mode — tokens resueltos una vez acá.
const T = palette.light;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slug = useTenantStore((s) => s.slug);

  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  };

  const handleSubmit = async () => {
    setFormError(null);
    const value = email.trim();
    if (!value) {
      setFormError('Ingresa tu email.');
      toast.error('Falta el email', 'Ingresa tu email para continuar.');
      return;
    }
    // Validación mínima de formato (el backend valida de verdad).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFormError('El email no tiene un formato válido.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest({
        method: 'POST',
        url: '/api/mobile/auth/forgot-password',
        data: { email: value },
      });
      setSent(true);
    } catch (e) {
      let msg: string;
      if (e instanceof ApiError) {
        if (e.status === 422) {
          msg = 'Revisa el email ingresado.';
        } else if (e.status === 0 || e.status >= 500) {
          msg = 'Error de conexión. Intenta nuevamente en unos segundos.';
        } else {
          msg = e.message || `Error ${e.status} desde el servidor.`;
        }
      } else if (e instanceof Error) {
        msg = e.message || 'No pudimos enviar el correo.';
      } else {
        msg = 'Sin conexión. No pudimos enviar el correo.';
      }
      setFormError(msg);
      toast.error('No se pudo enviar', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen padded={false} edges={{ top: false, bottom: false }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: T.brand }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, backgroundColor: T.bgElevated }}
        >
          {/* ───────────────── HERO azul ───────────────── */}
          <View style={{ backgroundColor: T.brand, paddingBottom: 44 }}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: -80, right: -60, opacity: 0.12 }}
            >
              <View
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  borderWidth: 40,
                  borderColor: '#FFFFFF',
                }}
              />
            </View>

            {/* Back */}
            <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
              <Pressable
                haptic="selection"
                accessibilityLabel="Volver"
                onPress={goBack}
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
                {sent ? <MailIcon size={30} /> : <OpenSysLogo size={34} color="#FFFFFF" />}
              </View>

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
                {sent ? 'Revisa tu correo' : 'Recuperar\nacceso'}
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
                {sent
                  ? 'Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.'
                  : 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.'}
              </Text>
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
            {sent ? (
              <View style={{ gap: 18, paddingTop: 6 }}>
                <View
                  style={{
                    alignSelf: 'center',
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#DCFCE7',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={28} color={T.success} />
                </View>
                <Text
                  style={{
                    color: T.fgMuted,
                    fontFamily: Fonts.regular,
                    fontSize: 14,
                    lineHeight: 21,
                    textAlign: 'center',
                  }}
                >
                  Enviamos las instrucciones a{'\n'}
                  <Text style={{ color: T.fg, fontFamily: Fonts.semibold }}>{email.trim()}</Text>
                  {'\n\n'}Abre el enlace del correo para crear tu nueva contraseña. Si no lo ves,
                  revisa la carpeta de spam.
                </Text>
                <SubmitButton onPress={goBack} label="Volver al inicio" />
              </View>
            ) : (
              <>
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: T.fgMuted,
                      fontFamily: Fonts.medium,
                      fontSize: 13,
                      marginLeft: 2,
                    }}
                  >
                    Correo electrónico
                  </Text>
                  <FilledInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@empresa.cl"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                {slug ? (
                  <Text
                    style={{
                      color: T.fgSubtle,
                      fontFamily: Fonts.regular,
                      fontSize: 12.5,
                      marginTop: 10,
                      marginLeft: 2,
                    }}
                  >
                    Empresa: <Text style={{ fontFamily: Fonts.medium }}>{slug}</Text>
                  </Text>
                ) : null}

                <View style={{ marginTop: 22, gap: 12 }}>
                  <SubmitButton onPress={handleSubmit} loading={submitting} label="Enviar enlace" />

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
                    ¿Ya la recordaste?
                  </Text>
                  <Pressable haptic="selection" onPress={goBack}>
                    <Text style={{ color: T.brand, fontFamily: Fonts.semibold, fontSize: 13.5 }}>
                      Iniciar sesión
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

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
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.success }}
                />
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
    </Screen>
  );
}

/* ─────────────────────── FilledInput ─────────────────────── */

interface FilledInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: 'email' | 'password' | 'off';
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
  rightSlot?: ReactNode;
}

function FilledInput({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize,
  autoCorrect,
  autoComplete,
  returnKeyType = 'next',
  onSubmitEditing,
  rightSlot,
}: FilledInputProps) {
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
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.fgSubtle}
        selectionColor={T.brand}
        cursorColor={T.brand}
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
          ...(Platform.OS === 'web'
            ? ({ outlineStyle: 'none', borderWidth: 0, backgroundColor: 'transparent' } as object)
            : {}),
        }}
      />
      {rightSlot}
    </View>
  );
}

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
            style={{
              color: T.brandFg,
              fontFamily: Fonts.semibold,
              fontSize: 15.5,
              letterSpacing: -0.2,
            }}
          >
            {loading ? 'Enviando…' : label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────── Iconos inline ─────────────────────── */

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

function MailIcon({ size = 30, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M4 8l8 5 8-5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
