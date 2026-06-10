---
name: design-tokens
description: Sistema de diseño de erp-mobile (tokens, paleta, sombras, reglas de color). Usar al escribir o revisar cualquier UI/estilo de la app — pantallas, componentes, colores, cards.
---

# Design system — reglas

Fuente de verdad: `src/theme/tokens.ts` (palette, shadows, brandShadow,
withAlpha) + `tailwind.config.js` (clases semánticas). La app está
**bloqueada en light mode** — para APIs imperativas usar `palette.light`.

## Reglas duras de color

- **Tokens semánticos, nunca Tailwind raw**: `bg-brand`, `bg-success`,
  `bg-danger`, `bg-warning`, `bg-purple`, `bg-accent`, `bg-muted`,
  `text-fg-muted`, `border-border`… Variantes con `/N` (`bg-danger/70`).
  PROHIBIDO `bg-emerald-500`, `text-rose-600`, `border-gray-100`, hex sueltos.
- **Cards**: `rounded-3xl border border-border` sobre `bgElevated`
  (en style imperativo: `borderRadius: 24`). No `rounded-2xl border-gray-*
  shadow-sm`.
- **NUNCA concatenar alpha hex a un token**: `brand.brand + '20'` produce
  un color inválido que RN no parsea (los tokens son `rgb(R G B)`).
  Usar `withAlpha(color, 0.13)`.
- Blancos sobre color: `palette.light.fgInverse` (blanco fijo). OJO:
  `useBrand().brandFg` puede ser casi-negro si el brand del tenant es claro
  — usarlo solo cuando se quiere contraste adaptativo.
- Sombras: presets `shadows.xs|sm|md|lg|xl`. CTAs primarios pueden usar
  `brandShadow(brand, 'sm'|'md')` — no abusar.

## Color de marca por tenant

`useBrand()` devuelve `brand` / `brandFg` / `brandSubtle` dinámicos del
tenant (ej: ferreterías = naranja `#f97316`). Heros y CTAs de pantallas
de negocio usan brand; el sistema (login, splash) usa `palette.light.brand`.

## Patrones vigentes

- Hero de dashboard: bg brand + `HeaderPattern` + gradiente sutil de
  profundidad (`LinearGradient` rgba blanco→negro encima).
- Job-card flotante sobre hero: `marginTop` negativo + `shadows.lg`.
- Pills/CTAs: `borderRadius: 999`, altura 48-56.
- Iconos: SOLO vía el wrapper `~/lib/icons` (Hugeicons). Si falta un ícono,
  agregarlo ahí (import del core-free + `makeIcon`), no importar directo.
- Tipografía: `Fonts.regular|medium|semibold` de `~/theme/fonts`. Números
  tabulares para cifras: `fontVariant: ['tabular-nums']`.

## Verificación

`npm run typecheck` y `npm run lint` deben quedar verdes (lint corre con
eslint-config-expo 10; la regla TS está scopeada a *.ts/tsx).
