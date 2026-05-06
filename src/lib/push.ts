import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiRequest } from './api';

/**
 * Configuración del handler global mientras la app está en foreground.
 * Decidimos mostrar la notif igual (banner + sonido) — para más UX,
 * podríamos chequear data.type y suprimir las que ya estás viendo.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushRegistrationResult {
  token: string | null;
  reason?: 'not-device' | 'permission-denied' | 'no-project-id' | 'error';
  error?: unknown;
}

/**
 * Pide permiso, obtiene el Expo Push Token y devuelve el resultado.
 * NO toca al backend — eso lo hace el hook que llama esto.
 */
export async function obtainExpoPushToken(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { token: null, reason: 'not-device' };
  }

  // Android requiere channel para que las notifs aparezcan
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#116DFB',
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return { token: null, reason: 'permission-denied' };
    }

    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    if (!projectId) {
      // En Expo Go sin eas init, Notifications.getExpoPushTokenAsync
      // todavía funciona pero conviene avisar.
      console.warn('[push] No projectId — usando fallback (solo Expo Go en dev)');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return { token: tokenData.data };
  } catch (error) {
    console.warn('[push] error obteniendo token', error);
    return { token: null, reason: 'error', error };
  }
}

export async function registerDeviceToken(token: string, deviceName?: string): Promise<void> {
  await apiRequest({
    method: 'POST',
    url: '/api/mobile/notifications/register-device',
    data: {
      expo_push_token: token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      device_name: deviceName ?? Device.deviceName ?? Device.modelName ?? null,
    },
  });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  try {
    await apiRequest({
      method: 'DELETE',
      url: `/api/mobile/notifications/unregister-device?expo_push_token=${encodeURIComponent(token)}`,
    });
  } catch {
    // ignore — al hacer logout también se invalida el sanctum token, no crítico
  }
}
