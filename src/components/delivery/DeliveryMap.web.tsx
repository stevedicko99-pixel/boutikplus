import { StyleSheet, View, Text } from 'react-native';
import { colors, radius } from '@/theme';

type Point = { latitude: number; longitude: number };

export function DeliveryMap({ driver, pickup, destination }: { driver?: Point | null; pickup?: Point | null; destination?: Point | null }) {
  const points = [pickup, driver, destination].filter(Boolean) as Point[];
  if (!points.length) return <View style={styles.empty}><Text style={styles.text}>Position indisponible</Text></View>;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const padding = Math.max(
    (Math.max(...latitudes) - Math.min(...latitudes)) * 0.2,
    (Math.max(...longitudes) - Math.min(...longitudes)) * 0.2,
    0.01,
  );
  const bbox = [
    Math.min(...longitudes) - padding,
    Math.min(...latitudes) - padding,
    Math.max(...longitudes) + padding,
    Math.max(...latitudes) + padding,
  ].join('%2C');
  const marker = driver ?? pickup ?? destination ?? points[0];
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.latitude}%2C${marker.longitude}`;

  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>{/* @ts-ignore élément web Expo */}<iframe title="Carte de livraison au Burkina Faso" src={src} style={{ border: 0, width: '100%', height: '100%' }} loading="lazy" /></View>
      <View style={styles.legend}>
        {pickup ? <Text style={styles.text}>● Collecte</Text> : null}
        {driver ? <Text style={styles.text}>● Livreur</Text> : null}
        {destination ? <Text style={styles.text}>● Destination</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ wrapper: { width: '100%' }, frame: { width: '100%', height: 260, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }, empty: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg }, text: { color: colors.textMuted } });
