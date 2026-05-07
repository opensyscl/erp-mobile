import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage seguro para tokens de Sanctum y datos sensibles.
 * En web usamos localStorage como fallback (SecureStore no existe).
 * En iOS/Android usamos Keychain / Encrypted SharedPreferences.
 */

const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },

  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const StorageKeys = {
  AuthToken: 'opensys.auth.token',
  AuthUser: 'opensys.auth.user',
  TenantSlug: 'opensys.tenant.slug',
  TenantData: 'opensys.tenant.data',
  BranchId: 'opensys.branch.id',
  ThemePreference: 'opensys.theme.preference',
  DevEnv: 'opensys.dev.env',
} as const;
