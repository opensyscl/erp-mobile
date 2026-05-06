import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderPattern } from '~/components/HeaderPattern';
import { LogoDot } from '~/components/Logo';
import { BarsSpot, StackSpot } from '~/components/SpotIllustration';
import { Card, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { useRealtimeInvalidate } from '~/hooks/useRealtime';
import { apiRequest } from '~/lib/api';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart,
  Receipt,
  Search,
  ShoppingCart,
  Wallet,
} from '~/lib/icons';
import { Channels, RealtimeEvents } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';
import type { DailyKPIs } from '~/types/api';

const KPI_QUERY_KEY = ['kpis', 'today'] as const;

async function fetchDailyKPIs(): Promise<DailyKPIs> {
  return apiRequest<DailyKPIs>({ method: 'GET', url: '/api/mobile/dashboard/today' });
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'CLP') return '$' + Math.round(amount).toLocaleString('es-CL');
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(amount);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function dayLabel(): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date();
  return `${(days[d.getDay()] ?? '').slice(0, 3)} · ${d.getDate()} ${months[d.getMonth()] ?? ''}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);
  const branches = useTenantStore((s) => s.branches);
  const branchId = useTenantStore((s) => s.currentBranchId);
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];

  // Si el user tiene módulo Routes Y es admin/manager, redirigir al dashboard de Routes.
  // Drivers se quedan en este home con la card "Mi ruta" destacada.
  const isAdminLike =
    user?.role === 'tenant_admin' || user?.role === 'tenant_manager';
  const hasRoutesAccess = !!user?.permissions?.includes('routes.view');

  const { data: kpis, isLoading, isError } = useQuery({
    queryKey: KPI_QUERY_KEY,
    queryFn: fetchDailyKPIs,
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['approvals', 'pending', 'count'],
    queryFn: async () =>
      apiRequest<{ counts: { pending: number; mine_pending: number } }>({
        method: 'GET',
        url: '/api/mobile/approvals?status=pending',
      }),
  });
  const approvalsPending = approvalsData?.counts.pending ?? 0;

  const salesChannel = tenant ? Channels.tenantSales(tenant.id) : null;
  const inventoryChannel = tenant ? Channels.tenantInventory(tenant.id) : null;
  useRealtimeInvalidate(salesChannel, RealtimeEvents.SaleCreated, [KPI_QUERY_KEY]);
  useRealtimeInvalidate(salesChannel, RealtimeEvents.SaleUpdated, [KPI_QUERY_KEY]);
  useRealtimeInvalidate(inventoryChannel, RealtimeEvents.ProductStockChanged, [['products']]);

  const isPositive = (kpis?.delta_pct ?? 0) >= 0;
  const firstName = (user?.name ?? 'equipo').split(' ')[0];
  const initial = firstName?.[0]?.toUpperCase() ?? 'O';

  // Redirect ANTES del render — admin/manager con routes.view ven el dashboard de Routes.
  if (isAdminLike && hasRoutesAccess) {
    return <Redirect href={'/(app)/routes/admin' as never} />;
  }

  return (
    <View className="flex-1 bg-bg-subtle">
      <StatusBar style="light" />

      {/* Header con bg de marca + pattern delicado */}
      <View
        style={{
          backgroundColor: brand.brand,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 92,
          overflow: 'hidden',
        }}
      >
        <HeaderPattern color={brand.brandFg} />
        <Animated.View entering={FadeInDown.duration(360)}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <LogoDot size={18} color={brand.brandFg} />
              <Text style={{ color: brand.brandFg, fontFamily: Fonts.medium, fontSize: 14, letterSpacing: -0.3 }}>
                {tenant?.name ?? 'OpenSys'}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                haptic="selection"
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.warning,
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1,
                  }}
                />
                <Text style={{ color: brand.brandFg, fontFamily: Fonts.semibold, fontSize: 12 }}>3</Text>
              </Pressable>
              <View
                className="h-9 w-9 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
              >
                <Text style={{ color: brand.brandFg, fontFamily: Fonts.semibold, fontSize: 13 }}>{initial}</Text>
              </View>
            </View>
          </View>

          <View
            className="self-start flex-row items-center gap-1.5 mt-7 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: brand.brandFg, opacity: 0.6 }} />
            <Text style={{ color: brand.brandFg, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 0.3, textTransform: 'capitalize' }}>
              {dayLabel()}
            </Text>
          </View>

          <Text style={{ color: brand.brandFg, fontFamily: Fonts.medium, fontSize: 28, letterSpacing: -0.4, lineHeight: 38, marginTop: 16 }}>
            {getGreeting()},
          </Text>
          <Text style={{ color: brand.brandFg, fontFamily: Fonts.semibold, fontSize: 28, letterSpacing: -0.4, lineHeight: 38, marginTop: 0 }}>
            {firstName}.
          </Text>

          <Text
            style={{
              color: brand.brandFg,
              opacity: 0.62,
              fontFamily: Fonts.regular,
              fontSize: 14,
              lineHeight: 20,
              letterSpacing: -0.1,
              marginTop: 10,
              maxWidth: 320,
            }}
          >
            {branch ? `Estás en ${branch.name}. ` : ''}Aquí va el resumen de tu día.
          </Text>

          <View
            className="flex-row items-center gap-2 mt-6 px-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.14)',
              height: 44,
            }}
          >
            <Search size={16} color={brand.brandFg} />
            <Text style={{ color: brand.brandFg, opacity: 0.6, fontFamily: Fonts.regular, fontSize: 13, flex: 1 }}>
              Buscar producto, venta o cliente
            </Text>
          </View>
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        style={{ marginTop: -68 }}
      >
        {/* Hero card flotante */}
        <Animated.View entering={FadeInUp.delay(140).duration(360)} className="mx-5">
          <Card variant="elevated" padding="lg" className="overflow-hidden">
            <View className="flex-row">
              <View className="flex-1 pr-2">
                <Text variant="overline" tone="brand">
                  Ventas de hoy
                </Text>
                {isLoading ? (
                  <Skeleton className="h-9 w-40 mt-3" />
                ) : isError ? (
                  <Text variant="display" tone="subtle" className="mt-2">—</Text>
                ) : (
                  <Text
                    style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 28,
                      lineHeight: 38,
                      letterSpacing: -0.5,
                      color: colors.fg,
                      marginTop: 8,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatCurrency(kpis?.sales_total ?? 0, kpis?.currency ?? 'CLP')}
                  </Text>
                )}
                <Text variant="caption" tone="muted" className="mt-1.5">
                  {kpis && kpis.sales_count > 0
                    ? `${kpis.sales_count} ${kpis.sales_count === 1 ? 'boleta' : 'boletas'}`
                    : 'Sin ventas todavía'}
                </Text>
              </View>
              <View className="-mr-3 -mt-2">
                <BarsSpot size={88} />
              </View>
            </View>

            {!isLoading && kpis && kpis.sales_count > 0 ? (
              <Pressable
                onPress={() => router.push('/(app)/sales' as never)}
                haptic="medium"
                className="flex-row items-center justify-between mt-5 px-4 rounded-xl"
                style={{
                  backgroundColor: brand.brand,
                  height: 46,
                }}
              >
                <Text style={{ color: brand.brandFg, fontFamily: Fonts.medium, fontSize: 14, letterSpacing: -0.2 }}>
                  Ver detalle del día
                </Text>
                <View className="flex-row items-center gap-1.5">
                  {isPositive ? (
                    <ArrowUpRight size={14} color={brand.brandFg} />
                  ) : (
                    <ArrowDownRight size={14} color={brand.brandFg} />
                  )}
                  <Text style={{ color: brand.brandFg, fontFamily: Fonts.medium, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {isPositive ? '+' : ''}
                    {kpis.delta_pct}%
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </Card>
        </Animated.View>

        {/* Mini stats grid */}
        <Animated.View entering={FadeInUp.delay(220).duration(360)} className="flex-row gap-3 mx-5 mt-3">
          <MiniStat
            label="Margen"
            value={isLoading || !kpis ? '—' : `${kpis.margin_pct.toFixed(1)}%`}
            sub={kpis && kpis.sales_count > 0 ? 'sobre ventas' : '—'}
          />
          <MiniStat
            label="Ticket prom"
            value={
              isLoading || !kpis || kpis.sales_count === 0
                ? '—'
                : formatCurrency(kpis.ticket_avg, kpis.currency)
            }
            sub={kpis ? `${kpis.sales_count} bol.` : '—'}
          />
        </Animated.View>

        {/* Mi ruta — visible si el user tiene permission routes.view (módulo Routes activo) */}
        {user?.permissions?.includes('routes.view') ? (
          <Animated.View entering={FadeInUp.delay(280).duration(360)} className="mx-5 mt-6">
            <Pressable
              onPress={() => router.push('/(app)/routes' as never)}
              haptic="selection"
              scale="subtle"
            >
              <View
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  backgroundColor: brand.brand,
                  padding: 18,
                }}
              >
                <View style={{ position: 'absolute', inset: 0 }}>
                  <HeaderPattern color={brand.brandFg} intensity={0.7} />
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      style={{
                        color: brand.brandFg,
                        opacity: 0.7,
                        fontFamily: Fonts.medium,
                        fontSize: 10,
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      Reparto
                    </Text>
                    <Text
                      style={{
                        color: brand.brandFg,
                        fontFamily: Fonts.semibold,
                        fontSize: 22,
                        lineHeight: 30,
                        letterSpacing: -0.3,
                        marginTop: 4,
                      }}
                    >
                      Mi ruta de hoy
                    </Text>
                    <Text
                      style={{
                        color: brand.brandFg,
                        opacity: 0.78,
                        fontFamily: Fonts.regular,
                        fontSize: 13,
                        marginTop: 2,
                      }}
                    >
                      Ver paradas y entregas pendientes
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowRight size={18} color={brand.brandFg} />
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Aprobaciones */}
        <Animated.View entering={FadeInUp.delay(300).duration(360)} className="mx-5 mt-6">
          <Pressable
            onPress={() => router.push('/(app)/approvals' as never)}
            haptic="selection"
            scale="subtle"
          >
          <Card variant="outlined" padding="lg" className="overflow-hidden">
            <View className="flex-row">
              <View className="flex-1 pr-2">
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    color: approvalsPending > 0 ? colors.warning : colors.fgSubtle,
                    textTransform: 'uppercase',
                    lineHeight: 14,
                  }}
                >
                  {approvalsPending > 0 ? 'Acción requerida' : 'Al día'}
                </Text>
                <Text variant="title" className="mt-1.5">
                  Aprobaciones
                </Text>
                <View className="flex-row items-baseline gap-1.5 mt-1">
                  <Text
                    style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 26,
                      lineHeight: 36,
                      letterSpacing: -0.4,
                      color: colors.fg,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {approvalsPending}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {approvalsPending === 1 ? 'pendiente' : 'pendientes'}
                  </Text>
                </View>
                <View
                  className="self-start flex-row items-center gap-1 mt-4 px-3.5 rounded-full"
                  style={{ backgroundColor: colors.bgMuted, height: 32 }}
                >
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: colors.fg, letterSpacing: -0.1 }}>
                    Ver aprobaciones
                  </Text>
                  <ArrowRight size={12} color={colors.fg} />
                </View>
              </View>
              <View className="-mr-2 -mt-2">
                <StackSpot size={92} />
              </View>
            </View>
          </Card>
          </Pressable>
        </Animated.View>

        {/* Accesos rápidos */}
        <Animated.View entering={FadeInUp.delay(380).duration(360)} className="mt-7">
          <Text variant="overline" tone="subtle" style={{ marginLeft: 20, marginBottom: 12 }}>
            Accesos rápidos
          </Text>
          <View className="flex-row flex-wrap px-4">
            <QuickAction
              icon={<ShoppingCart size={20} color={brand.brand} />}
              label="Nueva venta"
              onPress={() => router.push('/(app)/pos' as never)}
            />
            <QuickAction icon={<Receipt size={20} color={brand.brand} />} label="Cotización" />
            <QuickAction
              icon={<Wallet size={20} color={brand.brand} />}
              label="Caja"
              onPress={() => router.push('/(app)/cash' as never)}
            />
            <QuickAction
              icon={<BarChart size={20} color={brand.brand} />}
              label="Reportes"
              onPress={() => router.push('/(app)/analytics' as never)}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card variant="outlined" padding="md" className="flex-1">
      <Text variant="overline" tone="subtle">
        {label}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 18,
          lineHeight: 24,
          letterSpacing: -0.4,
          marginTop: 6,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text variant="caption" tone="subtle" className="mt-0.5">
        {sub}
      </Text>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <View className="w-1/2 px-1.5 py-1.5">
      <Pressable
        onPress={onPress}
        haptic="selection"
        className="rounded-2xl bg-bg-elevated border border-border p-4"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle">
          {icon}
        </View>
        <Text variant="bodyStrong" className="mt-3">
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

