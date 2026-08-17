import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/PageLoader';
import { useAuth } from '@/context/AuthContext';
import { getBuyerOrders } from '@/lib/dataService';
import { ORDER_TIMELINE, getOrderStatusInfo } from '@/lib/orderStatus';
import { formatFCFA, formatDateTime } from '@/lib/format';
import type { AppStackParamList } from '@/navigation/AppNavigator';
import type { Order } from '@/types/models';

interface OrderConfirmationScreenProps {
  navigation: Pick<NativeStackNavigationProp<AppStackParamList>, 'navigate' | 'reset'>;
  route: { params: { orderId: string } };
}

export function OrderConfirmationScreen({ navigation, route }: OrderConfirmationScreenProps) {
  const { orderId } = route.params;
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setOrder(null);
      if (!profile) {
        if (active) setLoadError('Votre profil est introuvable.');
        if (active) setLoading(false);
        return;
      }
      try {
        const orders = await getBuyerOrders(profile.id);
        const found = orders.find((item) => item.id === orderId);
        if (!active) return;
        if (!found) {
          setLoadError('Commande introuvable.');
          return;
        }
        setOrder(found);
      } catch {
        if (active) setLoadError('Impossible de charger cette commande. Réessayez plus tard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [orderId, profile]);

  if (loading) {
    return <SafeAreaView style={styles.container} edges={['top']}><PageLoader /></SafeAreaView>;
  }

  if (loadError || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Impossible d’afficher la commande</Text>
          <Text style={styles.errorMessage}>{loadError ?? 'Commande introuvable.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = order.status;
  const currentStep = getOrderStatusInfo(currentStatus).step;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Succès */}
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Feather name="check" size={40} color={colors.textInverse} />
          </View>
          <Text style={styles.successTitle}>Preuve envoyée !</Text>
          <Text style={styles.successMsg}>
            Votre commande est en attente de validation par le vendeur. Vous serez notifié dès qu'elle sera confirmée.
          </Text>
        </View>

        {/* Timeline */}
        <Card style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Suivi de la commande</Text>
          {ORDER_TIMELINE.map((status, i) => {
            const info = getOrderStatusInfo(status);
            const isDone = currentStep >= info.step && currentStep !== -1;
            const isCurrent = currentStep === info.step;
            const isLast = i === ORDER_TIMELINE.length - 1;
            return (
              <View key={status} style={[styles.timelineItem, isLast && { minHeight: 40 }]}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, isDone && { backgroundColor: info.color }, isCurrent && styles.timelineDotCurrent]}>
                    {isDone ? <Feather name="check" size={12} color={colors.textInverse} /> : null}
                  </View>
                  {!isLast ? <View style={[styles.timelineLine, isDone && { backgroundColor: info.color }]} /> : null}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, isDone && { color: colors.text, fontWeight: typography.weights.semibold }]}>{info.label}</Text>
                  {isCurrent ? <Text style={styles.timelineNow}>En cours</Text> : null}
                </View>
              </View>
            );
          })}
        </Card>

        {/* Détails commande */}
        {order ? (
          <Card style={styles.detailCard}>
            <Text style={styles.cardTitle}>Détails</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>N° commande</Text><Text style={styles.detailValue}>#{order.id.slice(-8).toUpperCase()}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDateTime(order.created_at)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Montant</Text><Text style={[styles.detailValue, { color: colors.primary, fontWeight: typography.weights.bold }]}>{formatFCFA(order.total_amount)}</Text></View>
          </Card>
        ) : null}

        <Text style={styles.infoNote}>
          ℹ️ Le vendeur vérifiera votre capture d'écran de paiement sous peu. Le paiement se fait directement vers son numéro Mobile Money personnel.
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button label="Suivre mes commandes" variant="outline" onPress={() => navigation.navigate('Orders')} style={{ flex: 1 }} />
        <Button label="Accueil" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })} style={{ flex: 1, marginLeft: spacing.md }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  errorMessage: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, textAlign: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  successWrap: { alignItems: 'center', paddingVertical: spacing.xl },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  successTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.xs },
  successMsg: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.lg },
  timelineCard: { marginBottom: spacing.md },
  cardTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.lg },
  timelineItem: { flexDirection: 'row', minHeight: 56 },
  timelineLeft: { alignItems: 'center', marginRight: spacing.md, width: 24 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotCurrent: { borderWidth: 3, borderColor: colors.primary },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  timelineContent: { flex: 1, paddingBottom: spacing.md },
  timelineLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  timelineNow: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold, marginTop: 2 },
  detailCard: { marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  detailLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  detailValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  infoNote: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: spacing.md },
  bottomBar: { flexDirection: 'row', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
});
