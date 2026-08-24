import { useEffect, useRef, useState } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  /** Formatea el número a string (ej. separador de miles). Corre en JS thread. */
  format: (n: number) => string;
  /** Color normal del texto. */
  baseColor: string;
  /** Color "gris/disabled" durante el flash. */
  mutedColor: string;
  style?: StyleProp<TextStyle>;
  /**
   * Contexto del valor (ej. sucursal/moneda). Al cambiar, el número salta al
   * valor nuevo SIN flash ni count — es un cambio del usuario, no realtime.
   */
  instanceKey?: string | number;
  /** Duración del count-up. */
  durationMs?: number;
  /** Cuánto queda gris/disabled antes de animar. */
  flashMs?: number;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

/**
 * Número con animación **solo cuando cambia por realtime** — equivalente RN del
 * NumberFlow de la web. Flujo: al detectar un cambio de valor (no en el primer
 * render y sin cambio de `instanceKey`) el texto se pone gris/disabled un
 * instante y luego hace un count-up (easeOutCubic) hasta el valor nuevo.
 */
export function AnimatedNumber({
  value,
  format,
  baseColor,
  mutedColor,
  style,
  instanceKey,
  durationMs = 650,
  flashMs = 300,
  numberOfLines,
  adjustsFontSizeToFit,
}: AnimatedNumberProps) {
  const [shown, setShown] = useState(value);
  const mounted = useRef(false);
  const prevKey = useRef(instanceKey);
  const rafRef = useRef<number | null>(null);
  const flash = useRef(new Animated.Value(0)).current; // 0 = normal, 1 = gris

  useEffect(() => {
    // Primer render: fijar sin animar.
    if (!mounted.current) {
      mounted.current = true;
      prevKey.current = instanceKey;
      setShown(value);
      return;
    }

    // Cambio de contexto (toggle sucursal/moneda): saltar sin flash ni count.
    if (instanceKey !== prevKey.current) {
      prevKey.current = instanceKey;
      setShown(value);
      flash.setValue(0);
      return;
    }

    if (value === shown) return;

    // 1) gris/disabled con el valor viejo…
    Animated.timing(flash, { toValue: 1, duration: 160, useNativeDriver: false }).start();

    const from = shown;
    const to = value;
    const startedAt = Date.now();

    const flashT = setTimeout(() => {
      // 2) …y recién ahí volvemos a color + count-up hasta el valor nuevo.
      Animated.timing(flash, { toValue: 0, duration: 320, useNativeDriver: false }).start();
      const step = () => {
        const p = Math.min(1, (Date.now() - startedAt - flashMs) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(from + (to - from) * eased));
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setShown(to);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }, flashMs);

    return () => {
      clearTimeout(flashT);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // Solo reaccionamos a value/instanceKey; `shown` es estado interno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, instanceKey]);

  const color = flash.interpolate({ inputRange: [0, 1], outputRange: [baseColor, mutedColor] });
  const opacity = flash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  return (
    <Animated.Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      style={[style, { color, opacity }]}
    >
      {format(shown)}
    </Animated.Text>
  );
}
