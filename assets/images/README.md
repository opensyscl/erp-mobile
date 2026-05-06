# Imagen assets — pendientes de generar

Estos PNGs los referencía `app.json` y son **requeridos** para que `expo prebuild` y `eas build` funcionen. Mientras no existan, Expo levanta un placeholder gris feo en su lugar.

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon.png` | 1024×1024, sin transparencia | Icono universal — App Store + Play Store |
| `adaptive-icon.png` | 1024×1024, **layer foreground** con transparencia | Android adaptive icon foreground (el bg viene de `app.json`) |
| `splash.png` | 1284×2778 (iPhone 14 Pro Max @2x) | Splash estático light mode |
| `splash-dark.png` | 1284×2778 | Splash estático dark mode |
| `favicon.png` | 48×48 o 196×196 | Web build favicon |

## Specs de diseño (Direction A · Linear)

- **Background del splash**: cobalto `#3D63DD` (full bleed)
- **Adaptive icon background** (en `app.json`): `#0B0B0F` o `#3D63DD`
- **Logo mark**: anillo "O" blanco centrado, equivalente a `<LogoMark variant="outline" />` en `src/components/Logo.tsx`. Tamaño visual ~30% del lado del PNG.
- **Wordmark "OpenSys."**: NO incluir en el splash estático. Va en la capa animada (Reanimated) que monta `src/components/Splash.tsx`. El estático solo muestra el glyph para ser consistente con guidelines de iOS/Android.

## Cómo generarlos

Recomendado usar [`expo-image-utils`](https://github.com/expo/expo-cli) o un Figma con frames a las medidas de arriba. Comando rápido si ya tienes una versión SVG del logo:

```bash
# Requiere imagemagick + un logo.svg de 1024x1024
magick -background "#3D63DD" -gravity center logo.svg -resize 320x320 -extent 1024x1024 icon.png
magick -background none -gravity center logo.svg -resize 720x720 -extent 1024x1024 adaptive-icon.png
magick -background "#3D63DD" -gravity center logo.svg -resize 360x360 -extent 1284x2778 splash.png
```

Para `splash-dark.png` invertir el color a `#0B0B0F` (bg) + ring `#3D63DD`.

## Mientras tanto

`Splash.tsx` (componente animado de Reanimated) cubre el flash visualmente — pero el primer flash del native splash de Expo seguirá viéndose hasta que estos PNGs estén. Prioridad alta antes del primer build de TestFlight / Play Internal.
