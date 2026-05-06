# OpenSys Mobile

App móvil iOS + Android para [OpenSys ERP](https://github.com/josbert-dev/bookforce-erp). Multi-tenant, realtime sync con la web via Reverb.

**Stack:** Expo SDK 52 · React Native 0.76 (new architecture) · Expo Router · NativeWind v4 · Reanimated 3 · TanStack Query 5 · Zustand 5 · Sanctum tokens · Pusher protocol (Reverb).

**Diseño:** Dirección A — Linear/Things Quiet Density · brand cobalto `#3D63DD` · Inter + JetBrains Mono. Comparativa visual de las 3 direcciones evaluadas en [`design/index.html`](./design/index.html).

---

## Quick start

```bash
# 1. Instalar deps
npm install

# 2. Configurar entorno
cp .env.example .env.local
# Editar .env.local con la URL real del ERP y la REVERB_KEY

# 3. Levantar
npx expo start
```

Para correr en dispositivo:

```bash
npx expo run:ios       # iOS Simulator
npx expo run:android   # Android emulator / device
```

Antes del **primer build nativo** (TestFlight / Play Internal):

1. Reemplazar los PNG placeholder en `assets/images/` (ver `assets/images/README.md` para specs)
2. Configurar EAS: `npx eas-cli login && npx eas-cli build:configure`
3. `npx eas-cli build --platform all --profile preview`

---

## Estructura

```
.
├── app/                     # Expo Router (file-based routing)
│   ├── _layout.tsx          # Root: providers, splash overlay, auth gate
│   ├── (auth)/              # Stack pública: tenant-picker → login
│   └── (app)/               # Tabs autenticadas: home / inventory / scan / settings
├── src/
│   ├── components/
│   │   ├── ui/              # Primitivas: Button, Input, Card, Text, Skeleton, ...
│   │   ├── Logo.tsx         # Wordmark + LogoMark (glyph "O")
│   │   └── Splash.tsx       # Splash animado con Reanimated
│   ├── lib/
│   │   ├── api.ts           # Axios + Sanctum interceptor + multi-tenant
│   │   ├── realtime.ts      # pusher-js client → Reverb (canales, eventos)
│   │   ├── storage.ts       # SecureStore wrapper (Keychain / EncryptedShared)
│   │   ├── queryClient.ts   # TanStack Query client config
│   │   └── env.ts           # Variables de entorno tipadas
│   ├── hooks/
│   │   ├── useRealtime.ts   # WS subscribe + invalidate queries
│   │   ├── useColorScheme.ts
│   │   └── useFonts.ts
│   ├── stores/              # Zustand (auth, tenant, theme)
│   ├── theme/tokens.ts      # Design tokens (palette, motion, layout)
│   └── types/api.ts         # Tipos del contrato API
├── assets/
│   ├── images/              # icon · splash · adaptive · favicon (placeholders generados)
│   └── fonts/               # (vacío — Inter via expo-font cuando se agregue)
├── design/                  # HTMLs hi-fi de las 3 direcciones evaluadas
└── docs/
    ├── ARCHITECTURE.md      # Decisiones técnicas
    ├── API_CONTRACT.md      # Endpoints requeridos del ERP
    └── REALTIME.md          # Patrón realtime
```

---

## Decisiones clave

- **No replicar Filament en mobile.** El admin denso de Filament vive en web. Mobile cubre los flujos de terreno: punto de venta, inventario, scanner, aprobaciones rápidas, dashboards.
- **Inertia + REST conviven.** El ERP web sigue siendo Inertia. Para mobile creamos una capa REST mínima en `routes/api.php` (`/api/mobile/*`) que reusa los mismos Actions/Services del backend.
- **Realtime first.** Cualquier cambio relevante en web se refleja en mobile sin pull-to-refresh. Patrón: WS notifica → cliente invalida query TanStack → refetch.
- **Multi-tenancy por header.** El cliente envía `X-Tenant: {slug}` en cada request. El middleware `IdentifyTenant` lo resuelve igual que con subdominios.
- **Token Sanctum + SecureStore.** Tokens guardados en Keychain (iOS) / Encrypted SharedPreferences (Android). En web cae a localStorage como fallback.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Build nativo + run en device |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint sobre `app/` + `src/` |
| `npm run format` | Prettier sobre todo |
| `npm run prebuild` | Regenera `ios/` y `android/` desde `app.json` |

---

## Documentación

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — decisiones técnicas y por qué
- [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) — endpoints del ERP que la app consume
- [`docs/REALTIME.md`](./docs/REALTIME.md) — patrón websocket
- [`assets/images/README.md`](./assets/images/README.md) — specs para reemplazar PNGs placeholder
- En el repo del ERP: [`docs/mobile-api-integration.md`](../../bookforce/erp/docs/mobile-api-integration.md) — pasos manuales para activar API + broadcasting Sanctum
