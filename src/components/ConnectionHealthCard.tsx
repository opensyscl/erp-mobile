import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, Divider, Pressable, Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { resolveApiUrl, resolveRealtime } from '~/lib/env';
import { Radio, Refresh } from '~/lib/icons';
import { getRealtimeState, onRealtimeStateChange, type RealtimeState } from '~/realtime';
import { getActivePreset } from '~/stores/devEnv';
import { useDevEnvStore } from '~/stores/devEnv';
import { palette } from '~/theme/tokens';

interface HealthResponse {
  status?: string;
  app?: string;
  environment?: string;
  database?: { connected?: boolean; name?: string };
  version?: { commit?: string };
}

type Probe =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; data: HealthResponse; latencyMs: number }
  | { state: 'error'; message: string };

/**
 * Panel de conexión / health para Ajustes: muestra a qué backend está apuntando
 * la app (entorno activo, API URL, realtime) y hace ping a /api/health para
 * confirmar que responde (entorno, DB, commit, latencia).
 */
export function ConnectionHealthCard({ onOpenSwitcher }: { onOpenSwitcher?: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  // Suscripción al estado del WebSocket (realtime).
  const wsState = useSyncExternalStore(onRealtimeStateChange, getRealtimeState, getRealtimeState);

  // Re-render cuando cambia el preset de entorno.
  const currentEnvId = useDevEnvStore((s) => s.current);
  const preset = getActivePreset();
  const envLabel = preset ? preset.label : 'Default · .env del build';

  const apiUrl = resolveApiUrl();
  const rt = resolveRealtime();
  const rtTarget = rt.host ? `${rt.scheme}://${rt.host}:${rt.port}` : '— sin configurar';

  const [probe, setProbe] = useState<Probe>({ state: 'idle' });

  const runProbe = useCallback(async () => {
    setProbe({ state: 'loading' });
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${resolveApiUrl()}/api/health`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        setProbe({ state: 'error', message: `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as HealthResponse;
      setProbe({ state: 'ok', data, latencyMs });
    } catch (err) {
      const message = err instanceof Error && err.name === 'AbortError' ? 'Timeout (6s)' : 'No responde';
      setProbe({ state: 'error', message });
    }
  }, []);

  // Re-probar al montar y cada vez que cambia el entorno.
  useEffect(() => {
    void runProbe();
  }, [runProbe, currentEnvId]);

  const wsDot = wsState === 'connected' ? colors.success : wsState === 'connecting' || wsState === 'initialized' ? colors.warning : colors.danger;
  const wsLabel =
    wsState === 'connected'
      ? 'Conectado'
      : wsState === 'connecting'
        ? 'Conectando…'
        : wsState === 'initialized'
          ? 'Sin iniciar'
          : wsState === 'unavailable'
            ? 'No disponible'
            : wsState === 'failed'
              ? 'Falló'
              : 'Desconectado';

  return (
    <Card variant="outlined" padding="lg">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Radio size={18} color={colors.brand} />
          <Text variant="bodyStrong">Conexión</Text>
        </View>
        <Pressable
          haptic="selection"
          onPress={() => void runProbe()}
          hitSlop={10}
          className="h-9 w-9 items-center justify-center rounded-full bg-bg-muted"
        >
          {probe.state === 'loading' ? (
            <ActivityIndicator size="small" color={colors.fgMuted} />
          ) : (
            <Refresh size={16} color={colors.fgMuted} />
          )}
        </Pressable>
      </View>

      <Divider className="my-4" />

      <Row label="Entorno" value={envLabel} onPress={onOpenSwitcher} action={onOpenSwitcher ? 'Cambiar' : undefined} />
      <Row label="API" value={apiUrl} mono />
      <Row label="Realtime" value={rtTarget} mono>
        <View className="flex-row items-center gap-2">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: wsDot }} />
          <Text variant="caption" tone="muted">
            {wsLabel}
          </Text>
        </View>
      </Row>

      <Divider className="my-4" />

      {probe.state === 'ok' ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
            <Text variant="bodyStrong" tone="success">
              Backend responde · {probe.latencyMs} ms
            </Text>
          </View>
          <Row label="Ambiente" value={probe.data.environment ?? '—'} />
          <Row
            label="Base de datos"
            value={
              probe.data.database?.connected
                ? `OK · ${probe.data.database?.name ?? ''}`.trim()
                : 'sin conexión'
            }
            tone={probe.data.database?.connected ? 'success' : 'danger'}
          />
          <Row label="Commit" value={probe.data.version?.commit ?? '—'} mono />
        </View>
      ) : probe.state === 'error' ? (
        <View className="flex-row items-center gap-2">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
          <Text variant="bodyStrong" tone="danger">
            No conecta · {probe.message}
          </Text>
        </View>
      ) : probe.state === 'loading' ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={colors.fgMuted} />
          <Text variant="caption" tone="muted">
            Probando {apiUrl}…
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
  action,
  onPress,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  tone?: 'default' | 'muted' | 'success' | 'danger';
  action?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const content = (
    <View className="flex-row items-center justify-between gap-4 py-1.5">
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      {children ?? (
        <View className="flex-1 flex-row items-center justify-end gap-2">
          <Text
            variant="caption"
            tone={tone ?? 'default'}
            numberOfLines={1}
            className={mono ? 'text-right font-mono' : 'text-right'}
          >
            {value}
          </Text>
          {action ? (
            <Text variant="caption" tone="brand">
              {action}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable haptic="selection" onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}
