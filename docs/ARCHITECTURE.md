# Architecture

> Documenta el **por qué** detrás del stack y los patrones. El **qué** se lee del código.

## Routing

**Expo Router** con file-based routing. La estructura mapea 1:1 al árbol de navegación:

- `app/(auth)/*` — stack pública. Tenant-picker → Login. No hay tabs.
- `app/(app)/*` — tabs privadas. Home / Inventario / Scanner / Ajustes.

El `app/_layout.tsx` raíz monta los providers (Query, SafeArea, GestureHandler), hidrata Zustand stores desde SecureStore, y orquesta el splash animado encima del native splash de Expo.

`AuthGate` redirige según `useAuthStore.status`. No usa redirects en cada pantalla — es un único punto de control en el layout root.

## Estado

Tres stores Zustand con responsabilidades disjuntas:

| Store | Qué guarda | Por qué Zustand |
|---|---|---|
| `auth` | token, user, status | Trivial, sin reducers |
| `tenant` | slug, tenant, branches, currentBranchId | Cambia poco, lectura masiva |
| `theme` | preference (light/dark/system) | Persistencia simple |

Server state vive en **TanStack Query**. Las stores Zustand NO replican datos del server — solo guardan lo que es local (sesión activa, preferencia UI).

Hidratación: en el mount de `_layout.tsx` se llama `hydrate()` de cada store en paralelo antes de hidratar el primer query.

## Client API

`src/lib/api.ts`:

- Una instancia Axios con interceptor que inyecta `Authorization: Bearer {token}` y `X-Tenant: {slug}` en cada request
- Cache local de `tenant` y `token` para evitar lecturas async en cada llamada
- Modo de tenant configurable: `header` (default) o `subdomain`
- En 401, dispara `onUnauthorized()` configurable desde `_layout.tsx` → llama `logout()`

Errores normalizados como `ApiError`: `{ status, code, errors, message }`. TanStack Query lee `instanceof ApiError` para decidir retries (no retry en 4xx).

## Realtime

`pusher-js` apuntando a Reverb. El cliente NO empuja state via WS — solo escucha eventos, decide qué query invalidar, y deja que TanStack Query refetchee con cache válido.

```
Reverb event → useRealtimeInvalidate hook → queryClient.invalidateQueries → refetch automático
```

Auth de canales privados via `POST /broadcasting/auth` con Bearer Sanctum. El token y el tenant se leen de SecureStore en cada `authorize()` para que un logout deje los WS sin permisos al instante.

`disconnectRealtime()` se llama desde `auth.logout` para cerrar el socket completamente.

Ver [`REALTIME.md`](./REALTIME.md) para el catálogo de canales y eventos.

## Diseño

Tokens centralizados en dos lugares espejo:

- `global.css` — para NativeWind (CSS variables → utilidades de Tailwind)
- `src/theme/tokens.ts` — para uso imperativo (Reanimated, gradientes, StatusBar)

**Mantenerlos sincronizados es crítico.** Cuando cambies un token, edita ambos.

Light/dark se controla con `class="dark"` en el root via NativeWind v4 + el hook `useColorScheme()` que respeta la preferencia del usuario sobre el sistema.

Las primitivas UI (`src/components/ui/`) son thin wrappers sobre RN nativo con NativeWind. Reglas:

- Todo Pressable usa `~/components/ui/Pressable` que tiene scale animation + haptic feedback. Nunca `<Pressable>` directo de RN.
- Todo `<Text>` usa nuestro wrapper con variants — nunca el de RN, así heredamos color scheme automáticamente.
- Cards y bordes consistentes, sin sombras en versiones outlined (Linear-style).

## Splash

Dos capas:

1. **Native splash de Expo** — imagen estática `assets/images/splash.png`. Bloquea hasta que el JS bundle está listo.
2. **AnimatedSplash de RN** (`src/components/Splash.tsx`) — overlay con Reanimated que se monta encima del native splash, hace su entrance + micro-pulse + exit con scale-up, llama `onFinish()` y se desmonta.

Mínimo 600ms de duración para evitar que parpadee si la hidratación es instantánea.

## Multi-tenancy

El ERP backend resuelve tenant por dominio o slug en `IdentifyTenant`. Para mobile usamos el modo header:

```
X-Tenant: cafenuevo
```

El middleware en backend acepta tanto subdomain como header. El usuario de la mobile elige tenant en `(auth)/tenant.tsx` antes del login y se guarda en SecureStore.

Lo importante: el `X-Tenant` se envía **antes** de tener token (en el endpoint de login). Eso permite que `IdentifyTenant` resuelva el tenant correcto y luego el controller filtre `User::where('tenant_id', $tenant->id)`.

## Performance

- **FlatList** con `windowSize` default + `getItemLayout` cuando los items son uniformes (a futuro)
- **MMKV** disponible como dependencia para storage no-sensible super rápido (todavía sin uso, SecureStore alcanza para auth)
- **Reanimated 3** corre animaciones en el UI thread → no bloquea JS thread aunque haya re-renders pesados
- **TanStack Query** con `staleTime: 30s` evita refetches innecesarios al cambiar de tab

## Convenciones

- Imports relativos `~/` apuntan a `src/`
- File naming: PascalCase para componentes, camelCase para todo lo demás
- Tipos en `src/types/api.ts` reflejan los Resources de Laravel — mantener en sync
- Comentarios en español (es la lengua del proyecto), código en inglés
