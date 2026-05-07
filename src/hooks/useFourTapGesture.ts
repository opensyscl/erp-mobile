import { useCallback, useRef } from 'react';

const TAP_WINDOW_MS = 1500;
const REQUIRED_TAPS = 4;

/**
 * Detecta N taps rápidos consecutivos (default 4) sobre cualquier
 * Pressable/Touchable. Si pasa más de TAP_WINDOW_MS entre taps, el contador
 * se resetea — se usa para gestos ocultos tipo "tap el logo 4 veces para
 * abrir el switcher de env".
 */
export function useFourTapGesture(onTrigger: () => void): { onPress: () => void } {
  const countRef = useRef(0);
  const lastTapRef = useRef(0);

  const onPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current > TAP_WINDOW_MS) {
      countRef.current = 0;
    }
    lastTapRef.current = now;
    countRef.current += 1;
    if (countRef.current >= REQUIRED_TAPS) {
      countRef.current = 0;
      onTrigger();
    }
  }, [onTrigger]);

  return { onPress };
}
