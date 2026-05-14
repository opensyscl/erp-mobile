import { Redirect } from 'expo-router';

import AdminGeneralDashboard from './admin-general';
import { useAuthStore } from '~/stores/auth';
import { useTenantStore } from '~/stores/tenant';

/**
 * Entrada del tab "Inicio". Decide qué dashboard renderizar según el rol del
 * usuario y los módulos del tenant. Tres destinos posibles:
 *
 *   - admin/manager con permiso `routes.view` y módulo `routes` activo
 *     → `/routes/admin` (RoutesAdmin dashboard)
 *   - driver con módulo `routes` activo
 *     → `/routes` (Routes dashboard del día)
 *   - resto
 *     → render directo de AdminGeneralDashboard (no redirect — esta tab
 *       sigue siendo "Inicio" y queremos mantener el back stack limpio)
 */
export default function HomeRouter() {
  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);

  const isAdminLike =
    user?.role === 'tenant_admin' || user?.role === 'tenant_manager';
  const isDriver = user?.role === 'tenant_driver';
  const hasRoutesAccess = !!user?.permissions?.includes('routes.view');
  const tenantHasRoutes = !!tenant?.modules?.includes('routes');

  if (isAdminLike && hasRoutesAccess && tenantHasRoutes) {
    return <Redirect href={'/(app)/routes/admin' as never} />;
  }
  if (isDriver && tenantHasRoutes) {
    return <Redirect href={'/(app)/routes' as never} />;
  }
  return <AdminGeneralDashboard />;
}
