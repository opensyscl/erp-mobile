import { View } from 'react-native';

import { Card, Divider, Pressable, Screen, Text } from '~/components/ui';
import { ChevronRight, LogOut, Moon, Palette, Sun, User } from '~/lib/icons';
import { palette } from '~/theme/tokens';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { useThemeStore } from '~/stores/theme';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const tenant = useTenantStore((s) => s.tenant);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);

  const cycleTheme = () => {
    const next: 'system' | 'light' | 'dark' =
      themePreference === 'system' ? 'light' : themePreference === 'light' ? 'dark' : 'system';
    void setThemePreference(next);
  };

  const themeIcon =
    themePreference === 'dark' ? Moon : themePreference === 'light' ? Sun : Palette;
  const ThemeIcon = themeIcon;

  return (
    <Screen.Scroll>
      <Text variant="title">Ajustes</Text>

      <Card variant="elevated" padding="lg" className="mt-6">
        <View className="flex-row items-center gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-subtle">
            <User size={22} color={palette[scheme].brand} />
          </View>
          <View className="flex-1">
            <Text variant="bodyStrong">{user?.name ?? '—'}</Text>
            <Text variant="caption" tone="muted">
              {user?.email ?? ''}
            </Text>
          </View>
        </View>
        <Divider className="my-4" />
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            Empresa
          </Text>
          <Text variant="callout">{tenant?.name ?? '—'}</Text>
        </View>
      </Card>

      <Text variant="overline" tone="subtle" className="mt-8 mb-3">
        Apariencia
      </Text>
      <Card variant="outlined" padding="none">
        <Pressable onPress={cycleTheme} haptic="selection" className="flex-row items-center gap-3 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-bg-muted">
            <ThemeIcon size={18} color={palette[scheme].fg} />
          </View>
          <View className="flex-1">
            <Text variant="body">Tema</Text>
            <Text variant="caption" tone="muted">
              {themePreference === 'system'
                ? 'Sigue al sistema'
                : themePreference === 'dark'
                  ? 'Oscuro'
                  : 'Claro'}
            </Text>
          </View>
          <ChevronRight size={18} color={palette[scheme].fgSubtle} />
        </Pressable>
        <Divider />
        <Pressable className="flex-row items-center gap-3 p-4" haptic="selection">
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-bg-muted">
            <Palette size={18} color={palette[scheme].fg} />
          </View>
          <View className="flex-1">
            <Text variant="body">Color de marca</Text>
            <Text variant="caption" tone="muted">
              Sincronizado con tu empresa
            </Text>
          </View>
          <ChevronRight size={18} color={palette[scheme].fgSubtle} />
        </Pressable>
      </Card>

      <View className="mt-10">
        <Pressable
          onPress={() => void logout()}
          haptic="medium"
          className="flex-row items-center justify-center gap-2 rounded-lg bg-danger/10 py-4"
        >
          <LogOut size={18} color={palette[scheme].danger} />
          <Text variant="bodyStrong" tone="danger">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </Screen.Scroll>
  );
}
