import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/theme';
import {
  completeDelivery,
  formatFCFA,
  getDeliveryById,
  getDeliveryEvents,
  getDriverLocation,
  reportDeliveryIncident,
  startDelivery,
  subscribeToDeliveryUpdates,
  subscribeToDriverLocation,
} from '@/lib/deliveryService';
import { startDeliveryLocationTracking, stopDeliveryLocationTracking } from '@/lib/deliveryLocationService';
import { getDeliveryStatusInfo } from '@/lib/deliveryStatus';
import { DeliveryStatusBadge, DeliveryTimeline } from '@/components/delivery';
import { DeliveryMap } from '@/components/delivery/DeliveryMap';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DeliveryEvent, DeliveryRequest, DriverLocation } from '@/types/models';

type ParticipantRole = 'buyer' | 'seller' | 'driver' | 'admin' | null;
interface Props { navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void }; route: { params: { deliveryId: string } } }

export function DeliveryTrackingScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const [next, nextLocation, nextEvents] = await Promise.all([
      getDeliveryById(route.params.deliveryId),
      getDriverLocation(route.params.deliveryId),
      getDeliveryEvents(route.params.deliveryId),
    ]);
    setDelivery(next); setLocation(nextLocation); setEvents(nextEvents); setLoading(false);
  }, [route.params.deliveryId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeToDeliveryUpdates(route.params.deliveryId, setDelivery), [route.params.deliveryId]);
  useEffect(() => subscribeToDriverLocation(route.params.deliveryId, setLocation), [route.params.deliveryId]);

  const role: ParticipantRole = !delivery || !profile ? null
    : profile.roles?.some((r) => r === 'admin' || r === 'super_admin') || profile.role === 'admin' || profile.role === 'super_admin' ? 'admin'
    : delivery.driver_id === profile.id ? 'driver'
    : delivery.seller_id === profile.id ? 'seller'
    : delivery.buyer_id === profile.id ? 'buyer' : null;

  useEffect(() => {
    if (role !== 'driver' || delivery?.status !== 'in_progress') {
      stopDeliveryLocationTracking();
      return;
    }
    startDeliveryLocationTracking(delivery.id).then(({ error }) => {
      if (error) Alert.alert('Localisation requise', error);
    });
    return stopDeliveryLocationTracking;
  }, [delivery?.id, delivery?.status, role]);

  const transition = async (action: 'start' | 'complete') => {
    if (!delivery) return;
    setActing(true);
    const { error } = action === 'start' ? await startDelivery(delivery.id) : await completeDelivery(delivery.id);
    if (!error && action === 'start') {
      const tracking = await startDeliveryLocationTracking(delivery.id);
      if (tracking.error) Alert.alert('Localisation requise', tracking.error);
    }
    if (!error && action === 'complete') stopDeliveryLocationTracking();
    setActing(false);
    if (error) return Alert.alert('Erreur', error);
    await load();
  };

  const reportIncident = () => {
    if (!delivery) return;
    const submit = async (description: string) => {
      if (!description.trim()) return;
      setActing(true);
      const { error } = await reportDeliveryIncident(delivery.id, 'incident', description.trim());
      setActing(false);
      Alert.alert(error ? 'Erreur' : 'Incident signalé', error ?? 'L’équipe des opérations a été prévenue.');
    };
    if (Alert.prompt) Alert.prompt('Signaler un incident', 'Décrivez brièvement la situation.', submit);
    else Alert.alert('Signaler un incident', 'Confirmer le signalement de cette livraison ?', [{ text: 'Annuler' }, { text: 'Signaler', onPress: () => submit('Incident signalé depuis le suivi') }]);
  };

  if (loading) return <SafeAreaView style={styles.container}><LoadingSpinner /></SafeAreaView>;
  if (!delivery || !role) return <SafeAreaView style={styles.container}><Header title="Suivi" onBack={navigation.goBack} /><View style={styles.center}><Text style={styles.muted}>{delivery ? 'Accès réservé aux participants.' : 'Livraison introuvable.'}</Text></View></SafeAreaView>;

  const info = getDeliveryStatusInfo(delivery.status);
  const lastAt = location?.recorded_at ?? delivery.last_location_at;
  const ageMinutes = lastAt ? Math.max(0, Math.floor((Date.now() - new Date(lastAt).getTime()) / 60000)) : null;
  const fresh = ageMinutes !== null && ageMinutes < 10;
  const pickup = delivery.pickup_lat != null && delivery.pickup_lng != null ? { latitude: delivery.pickup_lat, longitude: delivery.pickup_lng } : null;
  const destination = delivery.destination_lat != null && delivery.destination_lng != null ? { latitude: delivery.destination_lat, longitude: delivery.destination_lng } : null;
  const driverPoint = location ? { latitude: location.latitude, longitude: location.longitude } : null;
  const wide = width >= 900;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Suivi de livraison" onBack={navigation.goBack} onRefresh={load} />
      <ScrollView contentContainerStyle={[styles.content, wide && styles.contentWide]}>
        <View style={[styles.banner, { backgroundColor: info.bgColor }]}><Feather name={info.icon as any} size={26} color={info.color} /><DeliveryStatusBadge status={delivery.status} size="md" /><Text style={styles.price}>{formatFCFA(delivery.price)}</Text></View>
        <View style={wide ? styles.columns : undefined}>
          <View style={wide ? styles.column : undefined}>
            <DeliveryMap driver={driverPoint} pickup={pickup} destination={destination} />
            <View style={[styles.freshness, { backgroundColor: fresh ? '#E6F7EE' : '#FFF8E1' }]}><Feather name={fresh ? 'radio' : 'alert-circle'} size={15} color={fresh ? colors.success : colors.warning} /><Text style={styles.freshText}>{ageMinutes === null ? 'Position du livreur indisponible' : ageMinutes < 1 ? 'Position mise à jour à l’instant' : `Position mise à jour il y a ${ageMinutes} min`}</Text></View>
            <Card><Text style={styles.cardTitle}>Trajet</Text><Route label="Prise en charge" address={`${delivery.pickup_address}, ${delivery.pickup_city}`} color={colors.primary} /><Route label="Destination" address={`${delivery.destination_address}, ${delivery.destination_city}`} color={colors.success} /><Text style={styles.meta}>{delivery.package_weight} kg · {delivery.distance_km} km</Text></Card>
          </View>
          <View style={wide ? styles.column : undefined}>
            <Text style={styles.sectionTitle}>Progression</Text><DeliveryTimeline delivery={delivery} />
            {events[0] ? <Text style={styles.event}>Dernier événement : {events[0].event_type} · {new Date(events[0].created_at).toLocaleString('fr-FR')}</Text> : null}
            <View style={styles.actions}><Button label="Ouvrir le chat" variant="outline" onPress={() => navigation.navigate('DeliveryChat', { deliveryId: delivery.id })} icon={<Feather name="message-circle" size={18} color={colors.primary} />} /><Button label="Signaler un incident" variant="danger" onPress={reportIncident} disabled={acting} icon={<Feather name="alert-triangle" size={18} color={colors.textInverse} />} /></View>
          </View>
        </View>
      </ScrollView>
      {role === 'driver' && (delivery.status === 'accepted' || delivery.status === 'in_progress') ? <View style={styles.footer}><Button fullWidth loading={acting} label={delivery.status === 'accepted' ? 'Démarrer la livraison' : 'Confirmer la livraison'} onPress={() => transition(delivery.status === 'accepted' ? 'start' : 'complete')} icon={<Feather name={delivery.status === 'accepted' ? 'navigation' : 'check-circle'} size={18} color={colors.textInverse} />} /></View> : null}
    </SafeAreaView>
  );
}

function Header({ title, onBack, onRefresh }: { title: string; onBack: () => void; onRefresh?: () => void }) { return <View style={styles.header}><Pressable onPress={onBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable><Text style={styles.title}>{title}</Text>{onRefresh ? <Pressable onPress={onRefresh} hitSlop={10}><Feather name="refresh-cw" size={20} color={colors.primary} /></Pressable> : <View style={{ width: 24 }} />}</View>; }
function Route({ label, address, color }: { label: string; address: string; color: string }) { return <View style={styles.route}><View style={[styles.dot, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Text style={styles.routeLabel}>{label}</Text><Text style={styles.routeAddress}>{address}</Text></View></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }, title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text }, content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100, gap: spacing.md }, contentWide: { width: '100%', maxWidth: 1180, alignSelf: 'center' }, columns: { flexDirection: 'row', gap: spacing.xl }, column: { flex: 1, gap: spacing.md }, banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg }, price: { marginLeft: 'auto', fontWeight: typography.weights.bold, color: colors.text }, freshness: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, marginVertical: spacing.sm }, freshText: { color: colors.text, fontSize: typography.sizes.caption }, cardTitle: { color: colors.text, fontWeight: typography.weights.bold, marginBottom: spacing.md }, route: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }, dot: { width: 11, height: 11, borderRadius: 6, marginTop: 4 }, routeLabel: { color: colors.textMuted, fontSize: typography.sizes.caption }, routeAddress: { color: colors.text, fontWeight: typography.weights.medium }, meta: { color: colors.textMuted, fontSize: typography.sizes.small }, sectionTitle: { color: colors.text, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, marginTop: spacing.sm }, event: { color: colors.textMuted, fontSize: typography.sizes.caption }, actions: { gap: spacing.sm, marginTop: spacing.md }, footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, muted: { color: colors.textMuted },
});
