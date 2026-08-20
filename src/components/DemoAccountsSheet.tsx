import { type BottomSheetModal as BottomSheetModalType } from '@gorhom/bottom-sheet';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { View } from 'react-native';

import { AppBottomSheet } from '~/components/AppBottomSheet';
import { Pressable, Skeleton, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { resolveApiUrl } from '~/lib/env';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface DemoUser {
  name: string;
  email: string;
  photo: string | null;
  role: string | null;
}

interface DemoTenant {
  slug: string;
  name: string;
  brand_color: string;
  logo: string | null;
  cover_photo: string | null;
  has_routes: boolean;
  modules: string[];
  users: DemoUser[];
}

interface DemoAccountsResponse {
  data: DemoTenant[];
  default_password: string;
}

/**
 * Qué dashboard abre cada usuario — espeja la lógica de
 * `app/(app)/(tabs)/index.tsx` (rol + módulo routes del tenant).
 */
function dashboardFor(role: string | null, hasRoutes: boolean): string {
  if ((role === 'tenant_admin' || role === 'tenant_manager') && hasRoutes) {
    return 'Dashboard de Rutas';
  }
  if (role === 'tenant_driver' && hasRoutes) {
    return 'Dashboard de Reparto';
  }
  return 'Dashboard General';
}

/**
 * Deja solo las cuentas relevantes para la demo: todos los admins/managers +
 * un único driver (el primero). Saca los drivers de relleno del seed.
 */
function relevantUsers(users: DemoUser[]): DemoUser[] {
  const admins = users.filter((u) => u.role !== 'tenant_driver');
  const firstDriver = users.find((u) => u.role === 'tenant_driver');
  return firstDriver ? [...admins, firstDriver] : admins;
}

/**
 * Sheet que muestra todos los tenants demo y sus usuarios. Al tap en un user
 * llama a `onPick(slug, email, password)` y el caller setea tenant+credenciales
 * en el form de login para entrar al toque.
 *
 * Hace fetch al ERP local/staging via /api/__dev/demos. En producción ese
 * endpoint devuelve 404, así que el sheet quedará con error vacío — solo se
 * monta detrás del gesto __DEV__ del logo.
 */
export const DemoAccountsSheet = forwardRef<
  BottomSheetModalType,
  {
    onPick: (tenant: string, email: string, password: string) => void;
  }
>(function DemoAccountsSheet({ onPick }, ref) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dev', 'demo-accounts'],
    queryFn: async () => {
      const res = await fetch(`${resolveApiUrl()}/api/__dev/demos`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('No disponible');
      return (await res.json()) as DemoAccountsResponse;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return (
    <AppBottomSheet ref={ref} snapPoints={['90%']} scroll>
      <View style={{ paddingHorizontal: 20 }}>
        <Text variant="overline" tone="brand">
          Cuentas demo
        </Text>
        <Text
          style={{
            fontFamily: Fonts.semibold,
            fontSize: 22,
            lineHeight: 30,
            letterSpacing: -0.4,
            color: colors.fg,
            marginTop: 4,
            includeFontPadding: false,
          } as never}
        >
          Login rápido
        </Text>
        <Text variant="caption" tone="muted" className="mt-1">
          Tap en cualquier usuario y entrás al toque · password global{' '}
          <Text variant="caption" tone="default" style={{ fontFamily: Fonts.medium }}>
            {data?.default_password ?? '12345678'}
          </Text>
        </Text>

        <View style={{ marginTop: 18, gap: 18 }}>
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : isError ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text variant="body" tone="danger">
                No pude cargar las cuentas demo.
              </Text>
              <Text variant="caption" tone="muted" className="mt-1 text-center">
                Verifica que el ERP local esté corriendo y que el switcher de
                env esté apuntando a un entorno válido.
              </Text>
            </View>
          ) : (
            (data?.data ?? []).map((t) => (
              <TenantBlock
                key={t.slug}
                tenant={t}
                onPickUser={(email) => onPick(t.slug, email, data?.default_password ?? '12345678')}
              />
            ))
          )}
        </View>
      </View>
    </AppBottomSheet>
  );
});

function TenantBlock({
  tenant,
  onPickUser,
}: {
  tenant: DemoTenant;
  onPickUser: (email: string) => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {tenant.logo ? (
          <Image
            source={{ uri: tenant.logo }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: tenant.brand_color,
            }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: tenant.brand_color,
            }}
          />
        )}
        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
          {tenant.name}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 11,
            color: colors.fgSubtle,
            includeFontPadding: false,
          } as never}
          numberOfLines={1}
        >
          {tenant.slug}
        </Text>
        {tenant.has_routes ? (
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 999,
              backgroundColor: tenant.brand_color + '22',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 9,
                color: tenant.brand_color,
                letterSpacing: 0.4,
                includeFontPadding: false,
              } as never}
            >
              ROUTES
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: colors.bgElevated,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {relevantUsers(tenant.users).map((u, i) => (
          <Pressable
            key={u.email}
            haptic="selection"
            onPress={() => onPickUser(u.email)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.border,
            }}
          >
            {u.photo ? (
              <Image
                source={{ uri: u.photo }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgMuted }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bgMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 12,
                    color: colors.fgMuted,
                    includeFontPadding: false,
                  } as never}
                >
                  {u.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {u.name}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 11,
                  color: colors.fgMuted,
                  includeFontPadding: false,
                } as never}
                numberOfLines={1}
              >
                {u.email}
              </Text>
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 11,
                  color: tenant.brand_color,
                  includeFontPadding: false,
                  marginTop: 2,
                } as never}
                numberOfLines={1}
              >
                {'Abre · '}
                {dashboardFor(u.role, tenant.has_routes)}
              </Text>
            </View>
            {u.role
              ? (() => {
                  const meta =
                    u.role === 'tenant_admin'
                      ? { label: 'Admin', bg: '#EEF2FF', fg: '#4338CA' }
                      : u.role === 'tenant_driver'
                        ? { label: 'Driver', bg: '#ECFDF5', fg: '#047857' }
                        : u.role === 'tenant_manager'
                          ? { label: 'Manager', bg: '#FEF3C7', fg: '#B45309' }
                          : { label: u.role.replace('tenant_', ''), bg: colors.bgMuted, fg: colors.fgMuted };
                  return (
                    <View
                      style={{
                        backgroundColor: meta.bg,
                        borderRadius: 999,
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Fonts.semibold,
                          fontSize: 10,
                          color: meta.fg,
                          letterSpacing: 0.2,
                          includeFontPadding: false,
                        } as never}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  );
                })()
              : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
