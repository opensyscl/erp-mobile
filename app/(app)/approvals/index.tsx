import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '~/components/Toast';
import { Badge, Button, Pressable, Skeleton, Text } from '~/components/ui';
import { useBrand } from '~/hooks/useBrand';
import { useColorScheme } from '~/hooks/useColorScheme';
import { ApiError, apiRequest } from '~/lib/api';
import { ArrowLeft, Plus } from '~/lib/icons';
import { queryKeys } from '~/lib/queryKeys';
import { useAuthStore } from '~/stores/auth';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

interface ApprovalUser {
  id: number;
  name: string;
}

interface Approval {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  category: 'supplies' | 'repairs' | 'utilities' | 'rent' | 'travel' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  requester: ApprovalUser | null;
  resolver: ApprovalUser | null;
  resolver_notes: string | null;
  branch_id: number | null;
  resolved_at: string | null;
  created_at: string;
}

interface ApprovalsResponse {
  data: Approval[];
  counts: { pending: number; mine_pending: number };
}

const STATUS_FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobadas' },
  { id: 'rejected', label: 'Rechazadas' },
] as const;

const CATEGORY_LABEL: Record<Approval['category'], string> = {
  supplies: 'Insumos',
  repairs: 'Reparaciones',
  utilities: 'Servicios',
  rent: 'Arriendo',
  travel: 'Viáticos',
  other: 'Otro',
};

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function ApprovalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('pending');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeApproval, setActiveApproval] = useState<Approval | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.approvals.list(statusFilter),
    queryFn: () =>
      apiRequest<ApprovalsResponse>({
        method: 'GET',
        url: `/api/mobile/approvals?status=${statusFilter}`,
      }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            haptic="selection"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-bg-subtle border border-border"
          >
            <ArrowLeft size={18} color={colors.fg} />
          </Pressable>
          <Text variant="overline" tone="subtle">
            Aprobaciones
          </Text>
          <Pressable
            haptic="medium"
            onPress={() => setCreateOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-brand"
          >
            <Plus size={16} color={brand.brandFg} />
          </Pressable>
        </View>

        <View className="mt-3 flex-row gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <Pressable
                key={f.id}
                haptic="selection"
                onPress={() => setStatusFilter(f.id)}
                className="rounded-full px-3.5"
                style={{
                  height: 32,
                  justifyContent: 'center',
                  backgroundColor: active ? colors.fg : colors.bgSubtle,
                  borderWidth: active ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    letterSpacing: -0.1,
                    color: active ? colors.bgElevated : colors.fgMuted,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="px-5 pt-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <View className="px-5 pt-16 items-center">
              <Text variant="headline">Nada por aquí</Text>
              <Text variant="body" tone="muted" className="mt-2 text-center">
                {statusFilter === 'pending'
                  ? 'No tienes solicitudes pendientes.'
                  : statusFilter === 'approved'
                    ? 'No hay solicitudes aprobadas todavía.'
                    : 'No hay solicitudes rechazadas.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Animated.View>
              <ApprovalRow approval={item} onPress={() => setActiveApproval(item)} />
            </Animated.View>
          )}
        />
      )}

      <CreateSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
      {activeApproval ? (
        <DetailSheet
          approval={activeApproval}
          onClose={() => setActiveApproval(null)}
          onResolved={() => {
            setActiveApproval(null);
          }}
        />
      ) : null}
    </View>
  );
}

function ApprovalRow({ approval, onPress }: { approval: Approval; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const statusBadge =
    approval.status === 'pending' ? (
      <Badge variant="warning">Pendiente</Badge>
    ) : approval.status === 'approved' ? (
      <Badge variant="success">Aprobada</Badge>
    ) : (
      <Badge variant="danger">Rechazada</Badge>
    );

  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      className="rounded-xl bg-bg-elevated border border-border p-4"
    >
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text variant="bodyStrong" numberOfLines={1}>
            {approval.title}
          </Text>
          <Text variant="caption" tone="muted" className="mt-1" numberOfLines={1}>
            {approval.requester?.name ?? '—'} · {timeAgo(approval.created_at)}
          </Text>
        </View>
        {statusBadge}
      </View>
      <View className="flex-row justify-between items-baseline mt-3">
        <Text variant="caption" tone="muted">
          {CATEGORY_LABEL[approval.category]}
        </Text>
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 18,
                lineHeight: 25,
            letterSpacing: -0.4,
            color: colors.fg,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCLP(approval.amount)}
        </Text>
      </View>
    </Pressable>
  );
}

const CATEGORY_OPTIONS: { id: Approval['category']; label: string }[] = [
  { id: 'supplies', label: 'Insumos' },
  { id: 'repairs', label: 'Reparaciones' },
  { id: 'utilities', label: 'Servicios' },
  { id: 'rent', label: 'Arriendo' },
  { id: 'travel', label: 'Viáticos' },
  { id: 'other', label: 'Otro' },
];

function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const brand = useBrand();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Approval['category']>('supplies');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setCategory('supplies');
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ data: Approval }>({
        method: 'POST',
        url: '/api/mobile/approvals',
        data: {
          title: title.trim(),
          description: description.trim() || null,
          amount: Number(amount),
          category,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      reset();
      onClose();
      toast.success('Solicitud enviada', 'Los aprobadores recibirán una notificación.');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message ?? 'No se pudo enviar.');
      } else {
        setError('No se pudo enviar.');
      }
    },
  });

  const submit = () => {
    if (!title.trim()) {
      setError('Pon un título.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={onClose} animationType="none">
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,13,20,0.55)' }}
      >
        <Pressable haptic="none" scale="none" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          exiting={SlideOutDown.duration(220)}
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>

          <Text variant="overline" tone="brand">
            Nueva solicitud
          </Text>

          <Text variant="overline" tone="subtle" className="mt-4 mb-1.5">
            Título
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Insumos café marzo"
            placeholderTextColor={colors.fgSubtle}
            style={inputStyle(colors)}
          />

          <Text variant="overline" tone="subtle" className="mt-4 mb-1.5">
            Monto
          </Text>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.fgSubtle}
            style={[
              inputStyle(colors),
              {
                fontFamily: Fonts.medium,
                fontSize: 22,
                lineHeight: 30,
                letterSpacing: -0.4,
              },
            ]}
          />

          <Text variant="overline" tone="subtle" className="mt-4 mb-2">
            Categoría
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => {
              const active = category === c.id;
              return (
                <Pressable
                  key={c.id}
                  haptic="selection"
                  onPress={() => setCategory(c.id)}
                  className="rounded-full px-3.5"
                  style={{
                    height: 32,
                    justifyContent: 'center',
                    backgroundColor: active ? brand.brand: colors.bgMuted,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: active ? brand.brandFg : colors.fgMuted }}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="overline" tone="subtle" className="mt-4 mb-1.5">
            Nota (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Detalles para quien aprueba…"
            placeholderTextColor={colors.fgSubtle}
            multiline
            maxLength={500}
            style={[inputStyle(colors), { minHeight: 60 }]}
          />

          {error ? (
            <Text variant="caption" tone="danger" className="mt-3">
              {error}
            </Text>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <View style={{ flex: 1 }}>
              <Button variant="secondary" onPress={onClose} disabled={mutation.isPending}>
                Cancelar
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button onPress={submit} loading={mutation.isPending}>
                Enviar
              </Button>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailSheet({
  approval,
  onClose,
  onResolved,
}: {
  approval: Approval;
  onClose: () => void;
  onResolved: () => void;
}) {
  const scheme = useColorScheme();
  const colors = palette[scheme];
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPending = approval.status === 'pending';
  // Para MVP: cualquiera con la app puede ver la pantalla, pero el backend valida que sea manager/admin

  const resolveMut = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      return apiRequest<{ data: Approval }>({
        method: 'POST',
        url: `/api/mobile/approvals/${approval.id}/${action}`,
        data: { notes: notes.trim() || undefined },
      });
    },
    onSuccess: (res, action) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      onResolved();
      toast.success(
        action === 'approve' ? 'Aprobada' : 'Rechazada',
        approval.title,
      );
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError('No tienes permiso para aprobar.');
        } else {
          setError(err.message);
        }
      } else {
        setError('No se pudo procesar.');
      }
    },
  });

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,13,20,0.55)' }}
      >
        <Pressable haptic="none" scale="none" style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          exiting={SlideOutDown.duration(220)}
          style={{
            backgroundColor: colors.bgElevated,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 22,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            maxHeight: '90%',
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
          </View>

          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text variant="overline" tone={isPending ? 'warning' : approval.status === 'approved' ? 'success' : 'danger'}>
                {isPending ? 'Pendiente' : approval.status === 'approved' ? 'Aprobada' : 'Rechazada'}
              </Text>
              <Text variant="title" className="mt-1.5">
                {approval.title}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 26,
                lineHeight: 36,
                letterSpacing: -0.6,
                color: colors.fg,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCLP(approval.amount)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.bgSubtle,
              borderRadius: 14,
              padding: 14,
              marginTop: 16,
              gap: 8,
            }}
          >
            <DetailRow label="Solicitante" value={approval.requester?.name ?? '—'} />
            <DetailRow label="Categoría" value={CATEGORY_LABEL[approval.category]} />
            <DetailRow label="Fecha" value={timeAgo(approval.created_at)} />
            {approval.description ? (
              <View>
                <Text variant="caption" tone="subtle">
                  Nota
                </Text>
                <Text variant="body" className="mt-0.5">
                  {approval.description}
                </Text>
              </View>
            ) : null}
            {approval.resolver ? (
              <DetailRow
                label={approval.status === 'approved' ? 'Aprobada por' : 'Rechazada por'}
                value={approval.resolver.name}
              />
            ) : null}
            {approval.resolver_notes ? (
              <View>
                <Text variant="caption" tone="subtle">
                  Nota del aprobador
                </Text>
                <Text variant="body" className="mt-0.5">
                  {approval.resolver_notes}
                </Text>
              </View>
            ) : null}
          </View>

          {isPending ? (
            <>
              <Text variant="overline" tone="subtle" className="mt-5 mb-1.5">
                Nota (opcional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Comentario para el solicitante…"
                placeholderTextColor={colors.fgSubtle}
                multiline
                maxLength={500}
                style={[inputStyle(colors), { minHeight: 56 }]}
              />

              {error ? (
                <Text variant="caption" tone="danger" className="mt-2">
                  {error}
                </Text>
              ) : null}

              <View className="flex-row gap-3 mt-5">
                <View style={{ flex: 1 }}>
                  <Button
                    variant="danger"
                    onPress={() => resolveMut.mutate('reject')}
                    loading={resolveMut.isPending && resolveMut.variables === 'reject'}
                  >
                    Rechazar
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    onPress={() => resolveMut.mutate('approve')}
                    loading={resolveMut.isPending && resolveMut.variables === 'approve'}
                  >
                    Aprobar
                  </Button>
                </View>
              </View>
            </>
          ) : (
            <View className="mt-5">
              <Button variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-baseline">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text style={{ fontFamily: Fonts.medium, fontSize: 14, letterSpacing: -0.2 }}>{value}</Text>
    </View>
  );
}

function inputStyle(colors: { bgSubtle: string; fg: string }) {
  return {
    backgroundColor: colors.bgSubtle,
    borderRadius: 12,
    padding: 14,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: colors.fg,
  };
}
