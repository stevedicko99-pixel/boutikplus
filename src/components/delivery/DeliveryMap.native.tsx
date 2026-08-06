import { useEffect, useMemo, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StyleSheet, View, Text } from 'react-native';
import { colors, radius } from '@/theme';

type Point = { latitude: number; longitude: number };

export function DeliveryMap({ driver, pickup, destination }: { driver?: Point | null; pickup?: Point | null; destination?: Point | null }) {
  const mapRef = useRef<MapView>(null);
  const points = useMemo(() => [pickup, driver, destination].filter(Boolean) as Point[], [destination, driver, pickup]);

  useEffect(() => {
    if (points.length > 1) {
      mapRef.current?.fitToCoordinates(points, {
        animated: true,
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      });
    }
  }, [points]);

  if (!points.length) return <View style={styles.empty}><Text style={styles.text}>Position indisponible</Text></View>;
  return (
    <MapView ref={mapRef} style={styles.map} initialRegion={{ ...points[0], latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
      {pickup ? <Marker coordinate={pickup} title="Prise en charge" pinColor={colors.primary} /> : null}
      {destination ? <Marker coordinate={destination} title="Destination" pinColor={colors.success} /> : null}
      {driver ? <Marker coordinate={driver} title="Livreur" pinColor={colors.secondary} /> : null}
      {pickup && destination ? <Polyline coordinates={[pickup, destination]} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[8, 6]} /> : null}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { width: '100%', height: 260, borderRadius: radius.lg }, empty: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg }, text: { color: colors.textMuted } });
