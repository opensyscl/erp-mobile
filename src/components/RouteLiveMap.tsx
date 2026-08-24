import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, Text as RNText, View } from 'react-native';

import { Text } from '~/components/ui';
import { useColorScheme } from '~/hooks/useColorScheme';
import { Navigation } from '~/lib/icons';
import { env } from '~/lib/env';
import { Fonts } from '~/theme/fonts';
import { palette } from '~/theme/tokens';

// react-native-maps es un módulo nativo — en web (react-native-web) no existe.
// Lo cargamos solo en nativo para que la web-preview no explote.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Maps: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Maps = require('react-native-maps');
  } catch {
    Maps = null;
  }
}

export interface MapStop {
  lat: number;
  lng: number;
  label?: string;
  done?: boolean;
}

export interface MapFleetDriver {
  id: number;
  lat: number;
  lng: number;
  label?: string;
}

interface RouteLiveMapProps {
  /** Posición del driver (GPS). Si null, centra en la primera parada. */
  driver?: { lat: number; lng: number } | null;
  stops: MapStop[];
  height?: number;
  /** Color de marca para el driver / la línea de ruta. */
  brand?: string;
  /** Varios drivers (vista de flota) — cada uno con su pin + inicial. */
  drivers?: MapFleetDriver[];
}

type LatLng = { latitude: number; longitude: number };

/**
 * Mapa de ruta nativo (react-native-maps → Apple Maps en iOS / Google en
 * Android). Muestra al driver, las paradas y la línea de ruta real (Mapbox
 * Directions, solo data). Funciona en Expo Go sin dev build.
 */
export function RouteLiveMap({ driver, stops, height = 260, brand, drivers }: RouteLiveMapProps) {
  const scheme = useColorScheme();
  const T = palette[scheme];
  const accent = brand ?? T.brand;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  // Los markers custom se rasterizan; dejamos que rendericen y apagamos el
  // re-render continuo → no drena batería (mapa de reparto = uso prolongado).
  // OJO: solo re-activamos al cambiar la CANTIDAD de pines (no en cada ping de
  // posición — mover un marker existente lo hace el mapa nativo, sin re-raster).
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 900);
    return () => clearTimeout(t);
    // Solo re-rasterizamos al cambiar la CANTIDAD/PRESENCIA de pines — no en cada
    // ping de posición (mover un marker existente lo hace el mapa nativo). Así el
    // path single-driver (GPS) tampoco drena batería.
  }, [stops.length, driver != null, drivers?.length]);

  const nextStop = useMemo(() => stops.find((s) => !s.done) ?? stops[0] ?? null, [stops]);

  const allPoints = useMemo<LatLng[]>(() => {
    const pts = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));
    if (driver) pts.push({ latitude: driver.lat, longitude: driver.lng });
    if (drivers) for (const d of drivers) pts.push({ latitude: d.lat, longitude: d.lng });
    return pts;
  }, [driver, stops, drivers]);

  // Línea de ruta real driver → próxima parada (Mapbox Directions API).
  useEffect(() => {
    if (!driver || !nextStop || !env.mapboxToken) {
      setRouteCoords([]);
      return;
    }
    let cancelled = false;
    const straight: LatLng[] = [
      { latitude: driver.lat, longitude: driver.lng },
      { latitude: nextStop.lat, longitude: nextStop.lng },
    ];
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${driver.lng},${driver.lat};` +
      `${nextStop.lng},${nextStop.lat}?geometries=geojson&overview=full&access_token=${env.mapboxToken}`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const coords = j?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          setRouteCoords(
            coords
              .filter((c: number[]) => c.length >= 2)
              .map((c: number[]) => ({ latitude: c[1] as number, longitude: c[0] as number })),
          );
        } else {
          setRouteCoords(straight);
        }
      })
      .catch(() => {
        if (!cancelled) setRouteCoords(straight);
      });
    return () => {
      cancelled = true;
    };
  }, [driver?.lat, driver?.lng, nextStop?.lat, nextStop?.lng]);

  const fit = () => {
    if (mapRef.current && allPoints.length > 0) {
      mapRef.current.fitToCoordinates(allPoints, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
        animated: true,
      });
    }
  };

  // Web / módulo ausente → placeholder (el mapa nativo va en el teléfono).
  if (Platform.OS === 'web' || !Maps) {
    return (
      <View
        style={{
          height,
          borderRadius: 20,
          backgroundColor: T.bgMuted,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text variant="bodyStrong" tone="muted" style={{ textAlign: 'center' }}>
          Mapa disponible en la app
        </Text>
        <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: 4 }}>
          El mapa nativo se ve en iOS / Android (no en la vista web).
        </Text>
      </View>
    );
  }

  const MapView = Maps.default;
  const { Marker, Polyline, PROVIDER_DEFAULT } = Maps;

  const center = driver ?? (stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : null);
  const initialRegion = {
    latitude: center?.lat ?? -33.4569,
    longitude: center?.lng ?? -70.6483,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  const markerShadow = [
    { offsetX: 0, offsetY: 2, blurRadius: 6, spreadDistance: 0, color: 'rgba(0,0,0,0.28)' },
  ];

  return (
    <View
      style={{
        height,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: T.bgMuted,
      }}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        userInterfaceStyle={scheme}
        showsCompass={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        onMapReady={fit}
      >
        {routeCoords.length > 1 ? (
          <>
            <Polyline
              coordinates={routeCoords}
              strokeColor={accent + '40'}
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={accent}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          </>
        ) : null}

        {stops.map((s, i) => (
          <Marker
            key={`${s.lat},${s.lng},${i}`}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.label}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracks}
          >
            <View style={{ alignItems: 'center', opacity: s.done ? 0.85 : 1 }}>
              <View
                style={{
                  minWidth: 26,
                  height: 26,
                  paddingHorizontal: 6,
                  borderRadius: 13,
                  backgroundColor: s.done ? accent : T.bgElevated,
                  borderWidth: 2,
                  borderColor: accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: markerShadow,
                }}
              >
                <RNText
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 12,
                    lineHeight: 15,
                    color: s.done ? T.brandFg : accent,
                    includeFontPadding: false,
                  }}
                >
                  {s.done ? '✓' : i + 1}
                </RNText>
              </View>
              {/* Punta del pin */}
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 5,
                  borderRightWidth: 5,
                  borderTopWidth: 7,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: accent,
                  marginTop: -2,
                }}
              />
            </View>
          </Marker>
        ))}

        {driver ? (
          <Marker
            coordinate={{ latitude: driver.lat, longitude: driver.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracks}
            flat
          >
            {/* Halo suave + anillo blanco + núcleo de marca → sensación "en vivo". */}
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  position: 'absolute',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: accent + '26',
                }}
              />
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: accent,
                  borderWidth: 3,
                  borderColor: '#fff',
                  boxShadow: markerShadow,
                }}
              />
            </View>
          </Marker>
        ) : null}

        {drivers?.map((d) => (
          <Marker
            key={`drv-${d.id}`}
            coordinate={{ latitude: d.lat, longitude: d.lng }}
            title={d.label}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracks}
            flat
          >
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: accent + '22',
                }}
              />
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: accent,
                  borderWidth: 2.5,
                  borderColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: markerShadow,
                }}
              >
                <RNText
                  style={{
                    fontFamily: Fonts.semibold,
                    fontSize: 12,
                    lineHeight: 15,
                    color: T.brandFg,
                    includeFontPadding: false,
                  }}
                >
                  {(d.label?.trim() || '·')[0]?.toUpperCase()}
                </RNText>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Recenter — reencuadra driver + paradas. */}
      {allPoints.length > 0 ? (
        <Pressable
          onPress={fit}
          hitSlop={8}
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: T.bgElevated,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: [
              { offsetX: 0, offsetY: 2, blurRadius: 10, spreadDistance: -1, color: 'rgba(0,0,0,0.22)' },
            ],
          }}
        >
          <Navigation size={18} color={accent} strokeWidth={1.8} />
        </Pressable>
      ) : null}
    </View>
  );
}
