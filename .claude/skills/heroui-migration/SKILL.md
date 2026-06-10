---
name: heroui-migration
description: Migración gradual de los componentes UI propios a heroui-native. Usar al migrar un componente/pantalla a HeroUI, al tocar src/components/ui/, o ante cualquier duda de versiones heroui/nativewind/uniwind.
---

# Migración a heroui-native

## Estado y restricción de versión (CRÍTICO)

- Pinneado **`heroui-native@1.0.0-alpha.16`** (exacta, sin caret) — es la
  última versión construida sobre **nativewind**. Desde beta en adelante
  requiere `uniwind` + Tailwind v4, incompatible con nuestro stack
  (nativewind 4.2.1 + tailwind 3). **NO subir la versión** sin antes migrar
  todo el styling a uniwind+tw4 (proyecto aparte, no un bump).
- Ya intentamos stubs/parches de uniwind y se revirtieron (ver commits
  `c965845..4bee4ba`). No reintroducir `local-packages/` ni postinstalls.
- Setup ya montado: `HeroUINativeProvider` en `app/_layout.tsx`,
  plugin en `tailwind.config.js` + content `node_modules/heroui-native/lib/**`.

## Qué hay disponible (alpha.16)

accordion, avatar, button, card, checkbox, chip, dialog, divider,
drop-shadow-view, error-view, form-field, popover, pressable-feedback,
radio-group, scroll-shadow, select, skeleton, skeleton-group, spinner,
surface, switch, tabs, text-field.

Nota alpha: no trae toast (seguimos con `~/components/Toast`) ni
bottom-sheet (seguimos con `@gorhom/bottom-sheet` — decisión registrada
en el vault, único stack permitido para sheets).

## Estrategia de migración (gradual, por componente)

Mapa objetivo `src/components/ui/*` → heroui-native:

| Nuestro | HeroUI | Notas |
|---|---|---|
| `Button` | `button` | mantener API de variantes nuestra como wrapper |
| `Card` | `card`/`surface` | conservar `rounded-3xl border-border` vía className |
| `Input` | `text-field`/`form-field` | el FloatingLabelInput del login queda custom |
| `Badge` | `chip` | |
| `Skeleton` | `skeleton`+`skeleton-group` | |
| `AvatarGroup` | `avatar` | |
| `Divider` | `divider` | |

Reglas:
1. **Un componente por PR/commit**, manteniendo la API pública del wrapper
   en `src/components/ui/` — las pantallas NO se tocan (siguen importando
   de `~/components/ui`). El wrapper adentro renderiza HeroUI.
2. Theming: HeroUI toma colores del plugin de tailwind; verificar que
   matchee nuestros tokens (`src/theme/tokens.ts`) antes de migrar
   componentes con color (Button/Chip). Si no matchea, mapear vía
   className con nuestras clases semánticas.
3. `Pressable` nuestro (haptics + scale) NO se reemplaza por
   `pressable-feedback` sin validar los haptics.
4. Después de cada migración: `npm run typecheck && npm run lint` + smoke
   visual en el teléfono (skill run-dev-stack).

## Verificación de instalación

```bash
grep '"heroui-native"' package.json        # debe decir 1.0.0-alpha.16 exacta
npx expo start --port 8081                  # Metro resuelve sin stubs
```
Si Metro falla resolviendo `uniwind`/`univind`: alguien subió la versión —
volver a alpha.16.
