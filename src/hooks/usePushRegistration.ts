import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { toast } from '~/components/Toast';
import { obtainExpoPushToken, registerDeviceToken, unregisterDeviceToken } from '~/lib/push';
import { useAuthStore } from '~/stores/auth';

/**
 * Auto-registra el dispositivo para push notifications cuando el user
 * está autenticado, y limpia al hacer logout.
 *
 * También engancha el handler de tap para deep-linking según `data.type`.
 *
 * Llamar UNA vez en el root layout, después de los providers de Query/Tenant/Auth.
 */
export function usePushRegistration(): void {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  // Registro tras login
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    if (tokenRef.current) return; // ya registrado en esta sesión

    let cancelled = false;
    (async () => {
      const result = await obtainExpoPushToken();
      if (cancelled) return;

      if (result.token) {
        try {
          await registerDeviceToken(result.token);
          tokenRef.current = result.token;
          toast.success(
            'Push activadas',
            `Token: …${result.token.slice(-12, -1)}`,
            2500,
          );
        } catch (e) {
          toast.error(
            'Error registrando dispositivo',
            e instanceof Error ? e.message : 'Backend rechazó el token',
          );
        }
      } else if (result.reason === 'permission-denied') {
        toast.warning(
          'Permiso de notificaciones denegado',
          'Activalo en Ajustes del iPhone → OpenSys/Expo Go → Notificaciones.',
          5000,
        );
      } else if (result.reason === 'not-device') {
        toast.info('Push no disponible', 'Solo funcionan en dispositivo físico, no simulador.');
      } else if (result.reason === 'no-project-id') {
        toast.warning('Push sin projectId', 'Necesitas hacer eas init para push en producción.');
      } else if (result.reason === 'error') {
        toast.error(
          'Error obteniendo token',
          result.error instanceof Error ? result.error.message : 'Revisa logs.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  // Cleanup al logout
  useEffect(() => {
    if (status === 'unauthenticated' && tokenRef.current) {
      const t = tokenRef.current;
      tokenRef.current = null;
      void unregisterDeviceToken(t);
    }
  }, [status]);

  // Handler global: tap en notificación → deep link
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; sale_id?: number; product_id?: number } | undefined;
      if (!data) return;

      switch (data.type) {
        case 'sale.created':
          // Cuando tengamos pantalla de detalle de venta, navegar acá.
          // Por ahora vamos al home.
          router.push('/(app)' as never);
          break;
        case 'product.stock.changed':
          if (data.product_id) {
            router.push(`/(app)/products/${data.product_id}` as never);
          }
          break;
        default:
          break;
      }
    });

    return () => sub.remove();
  }, [router]);

  // Handler en foreground: si llega notif y la app está abierta, mostrarla como toast
  // (además del banner que ya muestra Notifications según el setNotificationHandler)
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const { title, body } = notif.request.content;
      if (title) {
        toast.info(title, body ?? undefined, 4000);
      }
    });
    return () => sub.remove();
  }, []);
}
