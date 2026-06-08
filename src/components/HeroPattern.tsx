import { Platform, StyleSheet, View } from 'react-native';

/**
 * Hero del login — mesh gradient cálido con 3 blobs de color.
 *
 * Versión SVG/RadialGradient iteró antes pero en RN Web el cyan + violeta
 * se mezclaban y dominaba el azul (Sthamly: 'el gradient solo azul wtf').
 * Cambiamos a Views circulares grandes con opacity + filter:blur en web
 * (RN puro ignora filter pero los blobs son tan grandes que igual se ven
 * difusos por ser semitransparentes y desbordar el contenedor).
 *
 * Paleta deliberadamente cálida (coral, magenta, dorado) — sin cyan ni
 * azul para evitar que el conjunto se vea frío/monocromático.
 */
export function HeroPattern() {
    return (
        <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
            {/* Coral arriba-izq */}
            <View
                style={[
                    styles.blob,
                    {
                        backgroundColor: '#FF7A59',
                        width: 320,
                        height: 320,
                        top: -90,
                        left: -90,
                        opacity: 0.55,
                    },
                ]}
            />
            {/* Magenta abajo-der */}
            <View
                style={[
                    styles.blob,
                    {
                        backgroundColor: '#EC4899',
                        width: 300,
                        height: 300,
                        bottom: -90,
                        right: -80,
                        opacity: 0.45,
                    },
                ]}
            />
            {/* Dorado arriba-der */}
            <View
                style={[
                    styles.blob,
                    {
                        backgroundColor: '#FCD34D',
                        width: 260,
                        height: 260,
                        top: -60,
                        right: -100,
                        opacity: 0.5,
                    },
                ]}
            />
        </View>
    );
}

// El blur real solo aplica en web (RN Web lo traduce a CSS filter).
// En iOS/Android lo ignoramos: los blobs grandes con opacity ya se ven
// difusos por el solapamiento. Si en el futuro hace falta blur real en
// native, usar expo-blur BlurView aquí.
const styles = StyleSheet.create({
    blob: {
        position: 'absolute',
        borderRadius: 9999,
        ...(Platform.OS === 'web' ? ({ filter: 'blur(50px)' } as object) : {}),
    },
});
