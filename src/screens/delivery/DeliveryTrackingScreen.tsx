import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useNotifications } from '@/context/NotificationContext';
import {
  getDeliveryById,
  updateDeliveryStatus,
  cancelDelivery,
  requestRefund,
  validateDeliveryPayment,
  rejectDeliveryPayment,
  formatFCFA,
  subscribeToDeliveryUpdates,
} from '@/lib/deliveryService';
import { getDeliveryStatusInfo, canCancelDelivery, canRefundDelivery, isValidTransition } from '@/lib/deliveryStatus';
import { DeliveryTimeline, DeliveryStatusBadge } from '@/components/delivery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { openPhone } from '@/lib/safeLinking';
import type { DeliveryRequest, DeliveryStatus } from '@/types/models';

interface DeliveryTrackingScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
  route: { params: { deliveryId: string } };
}

export function DeliveryTrackingScreen({ navigation, route }: DeliveryTrackingScreenProps) {
  const { refresh: refreshNotifs } = useNotifications();
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // En mode démo, le user connecté (vendeur) agit côté vendeur.
  // En production, on déterminerait le rôle via auth + présence dans la livraison.
  // L'assertion `as` évite que TypeScript ne rétrécisse le type au littéral 'seller',
  // ce qui rendrait les comparaisons `role === 'driver'` invalides.
  const role = 'seller' as 'seller' | 'driver';

  const load = useCallback(async () => {
    const d = await getDeliveryById(route.params.deliveryId);
    setDelivery(d);
    setLoading(false);
  }, [route.params.deliveryId]);

  useEffect(() => {
    load();
  }, [load]);

  // Souscription temps réel (Supabase uniquement)
  useEffect(() => {
    const unsubscribe = subscribeToDeliveryUpdates(route.params.deliveryId, (updated) => {
      setDelivery(updated);
    });
    return unsubscribe;
  }, [route.params.deliveryId]);

  const refreshAfterAction = async () => {
    await load();
    await refreshNotifs();
  };

  const handleCancel = () => {
    if (!delivery) return;
    Alert.prompt?.(
      'Annuler la livraison',
      'Indiquez la raison (optionnel)',
      async (reason?: string) => {
        if (reason === undefined) return; // annulé
        setActing(true);
        const { error } = await cancelDelivery(delivery.id, role, reason || undefined);
        setActing(false);
        if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
        await refreshAfterAction();
      },
    ) ?? Alert.alert(
      'Annuler la livraison',
      'Voulez-vous vraiment annuler cette livraison ?',
      [
        { text: 'Non' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            const { error } = await cancelDelivery(delivery.id, role);
            setActing(false);
            if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
            await refreshAfterAction();
          },
        },
      ],
    );
  };

  const handleRefund = () => {
    if (!delivery) return;
    Alert.alert(
      'Demander un remboursement',
      'Un remboursement sera demandé pour cette livraison. Le litige sera traité par l\'administration.',
      [
        { text: 'Annuler' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setActing(true);
            const { error } = await requestRefund(delivery.id, 'Litige signalé par le vendeur');
            setActing(false);
            if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
            await refreshAfterAction();
            Alert.alert('Demande envoyée', 'Votre demande de remboursement a été enregistrée.');
          },
        },
      ],
    );
  };

  const handleValidatePayment = async () => {
    if (!delivery) return;
    setActing(true);
    const { error } = await validateDeliveryPayment(delivery.id);
    setActing(false);
    if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
    await refreshAfterAction();
    Alert.alert('Paiement validé ✓', 'Le paiement a été confirmé.');
  };

  const handlePay = () => {
    if (!delivery) return;
    navigation.navigate('DeliveryPayment', { deliveryId: delivery.id });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Suivi</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}><Text style={styles.emptyText}>Livraison introuvable</Text></View>
      </SafeAreaView>
    );
  }

  const statusInfo = getDeliveryStatusInfo(delivery.status);
  const canCancel = canCancelDelivery(delivery.status, role) && isValidTransition(delivery.status, 'cancelled', role);
  const canRefund = canRefundDelivery(delivery.status) && isValidTransition(delivery.status, 'refunded', role);
  const needsPayment = delivery.status === 'pending' && !delivery.payment;
  const paymentPending = delivery.payment?.status === 'pending' && role === 'driver';
  const driver = delivery.driver;
  const seller = delivery.seller;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Suivi de livraison</Text>
        <Pressable onPress={load} hitSlop={10}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Bannière de statut */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.bgColor }]}>
          <Feather name={statusInfo.icon as any} size={28} color={statusInfo.color} />
          <View style={styles.statusBannerInfo}>
            <DeliveryStatusBadge status={delivery.status} size="md" />
            <Text style={styles.statusPrice}>{formatFCFA(delivery.price)}</Text>
          </View>
        </View>

        {/* Détails du trajet */}
        <Card>
          <Text style={styles.cardTitle}>Trajet</Text>
          <View style={styles.routeBlock}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
              <View>
                <Text style={styles.routeLabel}>Prise en charge</Text>
                <Text style={styles.routeAddress}>{delivery.pickup_address}</Text>
                <Text style={styles.routeCity}>{delivery.pickup_city}</Text>
              </View>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
              <View>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddress}>{delivery.destination_address}</Text>
                <Text style={styles.routeCity}>{delivery.destination_city}</Text>
              </View>
            </View>
          </View>
          <View style={styles.routeMeta}>
            <View style={styles.metaPill}>
              <Feather name="package" size={13} color={colors.primary} />
              <Text style={styles.metaPillText}>{delivery.package_weight} kg</Text>
            </View>
            <View style={styles.metaPill}>
              <Feather name="map" size={13} color={colors.primary} />
              <Text style={styles.metaPillText}>{delivery.distance_km} km</Text>
            </View>
            <View style={styles.metaPill}>
              <Feather name="calendar" size={13} color={colors.primary} />
              <Text style={styles.metaPillText}>
                {new Date(delivery.preferred_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {delivery.preferred_time}
              </Text>
            </View>
          </View>
        </Card>

        {/* Timeline */}
        <View style={styles.sectionTitleRow}>
          <Feather name="navigation" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Progression</Text>
        </View>
        <DeliveryTimeline delivery={delivery} />

        {/* Livreur / contact */}
        {driver?.profile ? (
          <>
            <View style={styles.sectionTitleRow}>
              <Feather name="user" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Livreur</Text>
            </View>
            <Card>
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Feather name="user" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{driver.profile.full_name}</Text>
                  <Text style={styles.contactMeta}>
                    ★ {driver.rating.toFixed(1)} · {driver.total_deliveries} livraisons
                  </Text>
                </View>
                <Pressable
                  style={styles.callBtn}
                  onPress={() => driver.profile?.phone && openPhone(driver.profile.phone)}
                >
                  <Feather name="phone" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </Card>
          </>
        ) : null}

        {/* Vendeur / contact (vue livreur) */}
        {role === 'driver' && seller ? (
          <Card>
            <View style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Feather name="user" size={22} color={colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{seller.full_name}</Text>
                <Text style={styles.contactMeta}>Vendeur</Text>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={() => seller.phone && openPhone(seller.phone)}
              >
                <Feather name="phone" size={18} color={colors.secondary} />
              </Pressable>
            </View>
          </Card>
        ) : null}

        {/* Paiement */}
        {delivery.payment ? (
          <>
            <View style={styles.sectionTitleRow}>
              <Feather name="credit-card" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Paiement</Text>
            </View>
            <Card>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Montant</Text>
                <Text style={styles.payValue}>{formatFCFA(delivery.payment.amount)}</Text>
              </View>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Opérateur</Text>
                <Text style={styles.payValue}>
                  {delivery.payment.operator === 'orange_money' ? 'Orange Money' : 'Moov Money'}
                </Text>
              </View>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Statut</Text>
                <PaymentStatusBadge status={delivery.payment.status} />
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      {/* Actions contextuelles */}
      <View style={styles.footer}>
        {needsPayment && (
          <Button
            label="Payer la livraison"
            onPress={handlePay}
            fullWidth
            icon={<Feather name="credit-card" size={18} color={colors.textInverse} />}
          />
        )}
        {paymentPending && (
          <View style={styles.footerRow}>
            <Button
              label="Valider le paiement"
              onPress={handleValidatePayment}
              loading={acting}
              style={{ flex: 1, marginRight: spacing.sm }}
              icon={<Feather name="check" size={18} color={colors.textInverse} />}
            />
            <Button
              label="Refuser"
              variant="danger"
              onPress={async () => {
                if (!delivery) return;
                setActing(true);
                await rejectDeliveryPayment(delivery.id);
                setActing(false);
                await refreshAfterAction();
              }}
              style={{ flex: 1 }}
            />
          </View>
        )}
        {canCancel && !needsPayment && (
          <Button
            label="Annuler la livraison"
            variant="danger"
            onPress={handleCancel}
            loading={acting}
            fullWidth
            icon={<Feather name="x-circle" size={18} color={colors.textInverse} />}
          />
        )}
        {canRefund && (
          <Button
            label="Demander un remboursement"
            variant="outline"
            onPress={handleRefund}
            loading={acting}
            fullWidth
            icon={<Feather name="rotate-ccw" size={18} color={colors.primary} />}
          />
        )}
        {!needsPayment && !paymentPending && !canCancel && !canRefund && (
          <View style={styles.doneHint}>
            <Feather name="check-circle" size={16} color={colors.textMuted} />
            <Text style={styles.doneHintText}>
              {delivery.status === 'delivered' ? 'Livraison terminée' : 'Aucune action requise'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'En attente', color: colors.warning, bg: '#FFF8E1' },
    validated: { label: 'Validé', color: colors.success, bg: '#E6F7EE' },
    rejected: { label: 'Refusé', color: colors.danger, bg: '#FDECEC' },
  };
  const info = map[status] ?? map.pending;
  return (
    <View style={[styles.payStatus, { backgroundColor: info.bg }]}>
      <Text style={[styles.payStatusText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  statusBannerInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPrice: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  routeBlock: { marginBottom: spacing.md },
  routePoint: { flexDirection: 'row', gap: spacing.md },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeConnector: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: 2,
  },
  routeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  routeAddress: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  routeCity: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  routeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  metaPillText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  contactMeta: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  payLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  payValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  payStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  payStatusText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerRow: { flexDirection: 'row' },
  doneHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  doneHintText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
});
