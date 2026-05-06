import { create } from 'zustand';
import { secureStorage, StorageKeys } from '~/lib/storage';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  setPreference: async (preference) => {
    set({ preference });
    await secureStorage.set(StorageKeys.ThemePreference, preference);
  },
  hydrate: async () => {
    const stored = await secureStorage.get(StorageKeys.ThemePreference);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      set({ preference: stored });
    }
  },
}));
