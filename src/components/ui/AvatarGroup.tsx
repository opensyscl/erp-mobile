import { Image } from 'expo-image';
import { View } from 'react-native';

import { useColorScheme } from '~/hooks/useColorScheme';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

import { Text } from './Text';

export interface AvatarGroupItem {
  /** Identifier estable para keys + fallback de initial color. */
  id: string | number;
  /** URL de la imagen. Si no hay, se renderiza la inicial sobre un bg. */
  photo?: string | null;
  /** Texto para iniciales — usamos la primera letra. */
  name?: string | null;
  /** Override del bg cuando no hay photo. */
  color?: string;
}

interface AvatarGroupProps {
  items: AvatarGroupItem[];
  /** Cuántos avatares mostrar antes del contador "+N". Default 3. */
  max?: number;
  /** Tamaño de cada avatar en px. Default 28. */
  size?: number;
  /** Cuánto se solapan (px de offset positivo restado a cada uno). Default 10. */
  overlap?: number;
  /** Color del anillo que separa los avatares. Default colors.bg. */
  ringColor?: string;
}

/**
 * Grupo de avatares apilados estilo Slack/Figma. Si hay más items que `max`,
 * el último slot es un círculo con "+N" en lugar del avatar restante.
 *
 * @example
 * <AvatarGroup items={[
 *   { id: 1, photo: 'https://...', name: 'Camila' },
 *   { id: 2, photo: null, name: 'Pedro' },
 *   { id: 3, name: 'María', color: '#f59e0b' },
 *   { id: 4, name: 'Roberto' },
 * ]} max={3} />
 */
export function AvatarGroup({ items, max = 3, size = 28, overlap = 10, ringColor }: AvatarGroupProps) {
  const scheme = useColorScheme();
  const colors = palette[scheme];

  const ring = ringColor ?? colors.bg;
  const visible = items.slice(0, max);
  const extra = Math.max(items.length - max, 0);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((item, i) => (
        <AvatarCircle
          key={item.id}
          item={item}
          size={size}
          ring={ring}
          offsetLeft={i === 0 ? 0 : -overlap}
          fallbackColor={colors.bgMuted}
          fallbackFg={colors.fgMuted}
        />
      ))}
      {extra > 0 ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.bgElevated,
            borderWidth: 2,
            borderColor: ring,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -overlap,
          }}
        >
          <Text
            style={
              {
                fontFamily: Fonts.semibold,
                fontSize: Math.max(10, Math.floor(size * 0.35)),
                lineHeight: Math.max(12, Math.floor(size * 0.42)),
                color: colors.fgMuted,
                includeFontPadding: false,
              } as never
            }
          >
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AvatarCircle({
  item,
  size,
  ring,
  offsetLeft,
  fallbackColor,
  fallbackFg,
}: {
  item: AvatarGroupItem;
  size: number;
  ring: string;
  offsetLeft: number;
  fallbackColor: string;
  fallbackFg: string;
}) {
  const initial = (item.name ?? '').trim()[0]?.toUpperCase() ?? '?';
  const bg = item.color ?? fallbackColor;

  if (item.photo) {
    return (
      <Image
        source={{ uri: item.photo }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: ring,
          marginLeft: offsetLeft,
        }}
        contentFit="cover"
        transition={120}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: offsetLeft,
      }}
    >
      <Text
        style={
          {
            fontFamily: Fonts.semibold,
            fontSize: Math.max(10, Math.floor(size * 0.4)),
            lineHeight: Math.max(12, Math.floor(size * 0.5)),
            color: fallbackFg,
            includeFontPadding: false,
          } as never
        }
      >
        {initial}
      </Text>
    </View>
  );
}
