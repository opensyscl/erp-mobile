import 'react-native-gesture-handler';
import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Splash } from '~/components/Splash';
import { ToastViewport } from '~/components/Toast';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useFonts } from '~/hooks/useFonts';
import { usePushRegistration } from '~/hooks/usePushRegistration';
import { primeApiCache, setApiHooks } from '~/lib/api';
import { queryClient } from '~/lib/queryClient';
import { useAuthStore } from '~/stores/auth';
import { useDevEnvStore } from '~/stores/devEnv';
import { useTenantStore } from '~/stores/tenant';
import { useThemeStore } from '~/stores/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ya escondido */
});

export const unstable_settings = {
  initialRouteName: '(app)',
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const { loaded: fontsLoaded } = useFonts();
  const status = useAuthStore((s) => s.status);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateTenant = useTenantStore((s) => s.hydrate);
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateDevEnv = useDevEnvStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // devEnv hidratado ANTES de primeApiCache para que los resolvers
      // de env.ts ya devuelvan el preset correcto en el primer request.
      await hydrateDevEnv();
      await primeApiCache();
      await Promise.all([hydrateTheme(), hydrateTenant(), hydrateAuth()]);
      if (!cancelled) {
        // Esconde el native splash de Expo — el Splash animado se monta encima
        // y hace su propia transición antes de revelar el contenido.
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateAuth, hydrateTenant, hydrateTheme, hydrateDevEnv]);

  useEffect(() => {
    setApiHooks({
      onUnauthorized: async () => {
        await logout();
      },
    });
  }, [logout]);

  if (!fontsLoaded || status === 'idle') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={scheme === 'dark' ? 'dark' : ''}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <View className="flex-1 bg-bg" style={{ flex: 1 }}>
              <StatusBar style={splashDone ? (scheme === 'dark' ? 'light' : 'dark') : 'light'} />
              <AuthGate />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
              <ToastViewport />
              {!splashDone && <Splash onFinish={() => setSplashDone(true)} />}
            </View>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Redirige según estado de auth — coloca esto dentro del Stack para que
 * los hooks de routing (useSegments) funcionen.
 */
function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  // Registra device token tras login + handler de tap.
  usePushRegistration();

  useEffect(() => {
    if (status === 'idle') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/tenant');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [status, segments, router]);

  return null;
}
