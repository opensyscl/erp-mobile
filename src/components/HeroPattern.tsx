import { StyleSheet } from 'react-native';
import Svg, { Defs, G, Pattern, Rect } from 'react-native-svg';

/**
 * Patrón geométrico tileable para fondos suaves (hero del login, splash, etc).
 * Adaptado del SVG que pasó Sthamly:
 *   - bg base #fafafa (lo aplica el parent)
 *   - tile 48×48 con líneas horizontales 3×1 cada 6 px en columnas y cada 12 px
 *     en filas (4 filas × 8 columnas)
 *   - cruz central simplificada en (23,23) — el original tenía detalle pixel
 *     a pixel que en mobile no se percibe
 *   - cruz en la esquina (47,47) que se completa al repetirse formando "+"
 *     entre tiles
 *
 * Color hardcodeado #1C1F21 con opacity 0.15 — del SVG de referencia.
 */
export function HeroPattern() {
    return (
        <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            <Defs>
                <Pattern id="hero-dotgrid" patternUnits="userSpaceOnUse" width={48} height={48}>
                    <G opacity={0.15} fill="#1C1F21">
                        {/* Filas de líneas horizontales (4×8) */}
                        {[11, 23, 35, 47].map((y) =>
                            [1, 7, 13, 19, 25, 31, 37, 43].map((x) => (
                                <Rect key={`row-${x}-${y}`} x={x} y={y} width={3} height={1} />
                            )),
                        )}
                        {/* Cruz central en (23.5, 23.5) — simplificada a 2 rects */}
                        <Rect x={23} y={20} width={1} height={4} />
                        <Rect x={20} y={23} width={4} height={1} />
                        {/* Cruz en esquina (47,47): al repetir el tile se completa */}
                        <Rect x={47} y={44} width={1} height={4} />
                        <Rect x={44} y={47} width={4} height={1} />
                    </G>
                </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hero-dotgrid)" />
        </Svg>
    );
}
