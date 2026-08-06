import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getActiveDeliveriesForAdmin, getDeliveryOperationsSummary, getOpenDeliveryIncidents, resolveDeliveryIncident } from '@/lib/deliveryService';
import { colors, radius, spacing, typography } from '@/theme';
import { PageLoader } from '@/components/ui/PageLoader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DeliveryIncident, DeliveryOperationsSummary, DeliveryRequest } from '@/types/models';

interface Props {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export function DeliveryOperationsScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const [summary, setSummary] = useState<DeliveryOperationsSummary | null>(null);
  const [incidents, setIncidents] = useState<DeliveryIncident[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const admin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.roles?.some((role) => role === 'admin' || role === 'super_admin');
  const wide = width >= 900;

  const load = useCallback(async () => {
    if (!admin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [result, openIncidents, activeDeliveries] = await Promise.all([
      getDeliveryOperationsSummary(),
      getOpenDeliveryIncidents(),
      getActiveDeliveriesForAdmin(),
    ]);
    setSummary(result.summary);
    setIncidents(openIncidents);
    setDeliveries(activeDeliveries);
    setLoading(false);
    setRefreshing(false);
  }, [admin]);

  useEffect(() => { load(); }, [load]);

  const resolve = (incident: DeliveryIncident) => Alert.alert(
    'Résoudre l’incident',
    incident.description,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Classer résolu',
        onPress: async () => {
          const { error } = await resolveDeliveryIncident(incident.id, 'resolved', 'Résolu par les opérations');
          if (error) Alert.alert('Erreur', error);
          else load();
        },
      },
    ],
  );

  if (loading) return <SafeAreaView style={styles.container}><PageLoader /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Opérations livraison</Text>
          <Text style={styles.subtitle}>Supervision en temps réel</Text>
        </View>
        <Pressable onPress={() => load()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Actualiser les opérations">
          <Feather name="refresh-cw" size={21} color={colors.primary} />
        </Pressable>
      </View>

      {!admin ? (
        <EmptyState icon="lock" title="Accès restreint" message="Un accès administrateur est requis pour superviser les livraisons." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, wide && styles.wideContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          <View style={styles.metrics}>
            <Metric icon="navigation" value={summary?.active_deliveries ?? 0} label="En cours" color={colors.info} wide={wide} />
            <Metric icon="alert-triangle" value={summary?.open_incidents ?? 0} label="Incidents" color={colors.danger} wide={wide} />
            <Metric icon="clock" value={summary?.stale_locations ?? 0} label="Positions à vérifier" color={colors.warning} wide={wide} />
            <Metric icon="check-circle" value={summary?.deliveries_by_status?.delivered ?? 0} label="Livrées" color={colors.success} wide={wide} />
          </View>

          <View style={[styles.sections, wide && styles.sectionsWide]}>
            <View style={styles.sectionColumn}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Livraisons actives</Text>
                  <Text style={styles.sectionHint}>{deliveries.length} course{deliveries.length > 1 ? 's' : ''} suivie{deliveries.length > 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
              </View>
              {deliveries.length ? deliveries.map((delivery) => (
                <Card key={delivery.id} style={styles.operationCard}>
                  <Pressable
                    style={styles.operationRow}
                    onPress={() => navigation.navigate('DeliveryTracking', { deliveryId: delivery.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`Suivre la livraison de ${delivery.pickup_city} à ${delivery.destination_city}`}
                  >
                    <View style={[styles.iconBox, styles.routeIcon]}><Feather name="truck" size={18} color={colors.info} /></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{delivery.pickup_city} → {delivery.destination_city}</Text>
                      <Text style={styles.meta}>{delivery.status === 'in_progress' ? 'En cours' : 'Acceptée'} · {delivery.driver?.profile?.full_name ?? 'Livreur assigné'}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                </Card>
              )) : <EmptyState style={styles.inlineEmpty} icon="navigation" title="Aucune livraison active" message="Les courses en activité apparaîtront ici." />}
            </View>

            <View style={styles.sectionColumn}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Incidents ouverts</Text>
                  <Text style={styles.sectionHint}>Traitement prioritaire</Text>
                </View>
              </View>
              {incidents.length ? incidents.map((incident) => (
                <Card key={incident.id} style={styles.operationCard}>
                  <Pressable
                    style={styles.operationRow}
                    onPress={() => resolve(incident)}
                    accessibilityRole="button"
                    accessibilityLabel={`Traiter l’incident ${incident.category}`}
                  >
                    <View style={[styles.iconBox, styles.incidentIcon]}><Feather name="alert-triangle" size={18} color={colors.danger} /></View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowTitle}>{incident.category}</Text>
                      <Text numberOfLines={2} style={styles.meta}>{incident.description}</Text>
                    </View>
                    <Text style={styles.resolve}>Traiter</Text>
                  </Pressable>
                </Card>
              )) : <EmptyState style={styles.inlineEmpty} icon="check-circle" title="Tout est sous contrôle" message="Aucun incident ouvert actuellement." />}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Metric({ icon, value, label, color, wide }: { icon: string; value: number; label: string; color: string; wide: boolean }) {
  return (
    <Card style={[styles.metric, wide && styles.metricWide]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '18' }]}><Feather name={icon as any} size={19} color={color} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold },
  subtitle: { color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, marginTop: 2 },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  wideContent: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  metric: { width: '47%', flexGrow: 1, minHeight: 132 },
  metricWide: { width: '22%' },
  metricIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  metricValue: { color: colors.text, fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold },
  metricLabel: { color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, marginTop: 2 },
  sections: { gap: spacing.xl },
  sectionsWide: { flexDirection: 'row' },
  sectionColumn: { flex: 1, minWidth: 0 },
  sectionHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold },
  sectionHint: { color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.success + '18' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { color: colors.success, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold },
  operationCard: { marginBottom: spacing.sm, padding: 0 },
  operationRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  routeIcon: { backgroundColor: colors.info + '18' },
  incidentIcon: { backgroundColor: colors.danger + '18' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold },
  meta: { color: colors.textMuted, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, lineHeight: 18, marginTop: 2 },
  resolve: { color: colors.primary, fontFamily: typography.fontFamily, fontWeight: typography.weights.bold, fontSize: typography.sizes.caption },
  inlineEmpty: { flex: 0, minHeight: 250, padding: spacing.xl },
});
