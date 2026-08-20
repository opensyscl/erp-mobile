import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '~/components/ui';
import { env } from '~/lib/env';
import { palette } from '~/theme/tokens';

const T = palette.light;

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

interface RouteLiveMapProps {
  /** Posición del driver (GPS). Si null, centra en la primera parada. */
  driver?: { lat: number; lng: number } | null;
  stops: MapStop[];
  height?: number;
  /** Color de marca para el driver / la línea de ruta. */
  brand?: string;
}

type LatLng = { latitude: number; longitude: number };

/**
 * Mapa de ruta nativo (react-native-maps → Apple Maps en iOS / Google en
 * Android). Muestra al driver, las paradas y la línea de ruta real (Mapbox
 * Directions, solo data). Funciona en Expo Go sin dev build.
 */
export function RouteLiveMap({ driver, stops, height = 260, brand }: RouteLiveMapProps) {
  const accent = brand ?? T.brand;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);

  const nextStop = useMemo(() => stops.find((s) => !s.done) ?? stops[0] ?? null, [stops]);

  const allPoints = useMemo<LatLng[]>(() => {
    const pts = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));
    if (driver) pts.push({ latitude: driver.lat, longitude: driver.lng });
    return pts;
  }, [driver, stops]);

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

  return (
    <View style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: '#0b0d12' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
        showsCompass={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        onMapReady={fit}
      >
        {routeCoords.length > 1 ? (
          <>
            <Polyline coordinates={routeCoords} strokeColor={accent + '55'} strokeWidth={9} />
            <Polyline coordinates={routeCoords} strokeColor={accent} strokeWidth={4} />
          </>
        ) : null}

        {stops.map((s, i) => (
          <Marker
            key={`${s.lat},${s.lng},${i}`}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.label}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: s.done ? accent : '#fff',
                borderWidth: 3,
                borderColor: accent,
                opacity: s.done ? 0.65 : 1,
              }}
            />
          </Marker>
        ))}

        {driver ? (
          <Marker coordinate={{ latitude: driver.lat, longitude: driver.lng }} anchor={{ x: 0.5, y: 0.5 }} flat>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: accent,
                borderWidth: 3,
                borderColor: '#fff',
              }}
            />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}
