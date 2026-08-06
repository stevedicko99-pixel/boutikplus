import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useNotifications } from '@/context/NotificationContext';
import {
  getDeliveryById,
  uploadDeliveryPayment,
  formatFCFA,
} from '@/lib/deliveryService';
import { pickAndCompressImage, uploadImage } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FeeEstimate } from '@/components/delivery';
import { openPhone } from '@/lib/safeLinking';
import type { DeliveryRequest, PaymentOperatorId } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface DeliveryPaymentScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    replace: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: { params: { deliveryId: string } };
}

export function DeliveryPaymentScreen({ navigation, route }: DeliveryPaymentScreenProps) {
  const { refresh: refreshNotifs } = useNotifications();
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [operator, setOperator] = useState<PaymentOperatorId>('orange_money');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const d = await getDeliveryById(route.params.deliveryId);
    setDelivery(d);
    setLoading(false);
  }, [route.params.deliveryId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePickImage = async (useCamera: boolean) => {
    const compressed = await pickAndCompressImage(useCamera);
    if (!compressed) return;
    setProofUri(compressed.uri);
  };

  const driverMoneyNumber =
    operator === 'orange_money'
      ? delivery?.driver?.orange_money_number
      : delivery?.driver?.moov_money_number;

  const handleSubmit = async () => {
    if (!delivery) return;
    if (!proofUri) {
      showAlert('Preuve requise', 'Veuillez ajouter une capture de votre paiement.');
      return;
    }
    setSubmitting(true);
    // Upload de la preuve vers le bucket delivery-proofs
    let proofUrl = proofUri;
    if (delivery.id && !delivery.id.startsWith('deliv-demo')) {
      const uploaded = await uploadImage('delivery-proofs', proofUri, 'delivery-proof');
      if (uploaded) proofUrl = uploaded.url;
    }
    const { error } = await uploadDeliveryPayment(
      delivery.id,
      delivery.price,
      operator,
      proofUrl,
    );
    setSubmitting(false);
    if (error) {
      showAlert('Erreur', friendlyMessage(error));
      return;
    }
    await refreshNotifs();
    showAlert(
      'Preuve envoyée ✓',
      'Votre preuve de paiement a été envoyée au livreur. Il la vérifiera avant de commencer la livraison.',
      [{ text: 'Suivre la livraison', onPress: () => navigation.replace('DeliveryTracking', { deliveryId: delivery.id }) }],
    );
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
          <Text style={styles.title}>Paiement</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Livraison introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ussdCode =
    operator === 'orange_money'
      ? `#144*391*${driverMoneyNumber ?? ''}*${delivery.price}#`
      : `*555*${driverMoneyNumber ?? ''}*${delivery.price}#`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Paiement de la livraison</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Récapitulatif */}
        <View style={styles.sectionTitleRow}>
          <Feather name="file-text" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
        </View>
        <View style={styles.recapCard}>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Trajet</Text>
            <Text style={styles.recapValue} numberOfLines={1}>
              {delivery.pickup_city} → {delivery.destination_city}
            </Text>
          </View>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Distance</Text>
            <Text style={styles.recapValue}>{delivery.distance_km} km</Text>
          </View>
          {delivery.driver?.profile?.full_name ? (
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Livreur</Text>
              <Text style={styles.recapValue}>{delivery.driver.profile.full_name}</Text>
            </View>
          ) : null}
        </View>

        <FeeEstimate
          baseRate={delivery.driver?.base_rate ?? 500}
          perKmRate={delivery.driver?.per_km_rate ?? 150}
          distanceKm={delivery.distance_km}
          total={delivery.price}
        />

        {/* Sélection opérateur */}
        <View style={styles.sectionTitleRow}>
          <Feather name="credit-card" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
        </View>
        <View style={styles.operatorRow}>
          <Pressable
            style={[
              styles.operatorCard,
              operator === 'orange_money' && styles.operatorActive,
              { borderColor: operator === 'orange_money' ? colors.orangeMoney : colors.border },
            ]}
            onPress={() => setOperator('orange_money')}
          >
            <View style={[styles.operatorLogo, { backgroundColor: colors.orangeMoney }]}>
              <Text style={styles.operatorLogoText}>OM</Text>
            </View>
            <Text style={styles.operatorName}>Orange Money</Text>
            {delivery.driver?.orange_money_number ? (
              <Text style={styles.operatorNumber}>{delivery.driver.orange_money_number}</Text>
            ) : null}
          </Pressable>

          <Pressable
            style={[
              styles.operatorCard,
              operator === 'moov_money' && styles.operatorActive,
              { borderColor: operator === 'moov_money' ? colors.moovMoney : colors.border },
            ]}
            onPress={() => setOperator('moov_money')}
          >
            <View style={[styles.operatorLogo, { backgroundColor: colors.moovMoney }]}>
              <Text style={styles.operatorLogoText}>MM</Text>
            </View>
            <Text style={styles.operatorName}>Moov Money</Text>
            {delivery.driver?.moov_money_number ? (
              <Text style={styles.operatorNumber}>{delivery.driver.moov_money_number}</Text>
            ) : null}
          </Pressable>
        </View>

        {/* Instructions USSD */}
        {driverMoneyNumber ? (
          <View style={styles.ussdCard}>
            <View style={styles.ussdHeader}>
              <Feather name="info" size={16} color={colors.info} />
              <Text style={styles.ussdTitle}>Comment payer</Text>
            </View>
            <Text style={styles.ussdText}>
              Composez le code ci-dessous depuis votre téléphone, puis entrez votre code secret pour valider le transfert de{' '}
              <Text style={styles.ussdBold}>{formatFCFA(delivery.price)}</Text> vers le numéro{' '}
              <Text style={styles.ussdBold}>{driverMoneyNumber}</Text>.
            </Text>
            <View style={styles.ussdCodeRow}>
              <Text style={styles.ussdCode}>{ussdCode}</Text>
              <Pressable
                style={styles.copyBtn}
                onPress={() => openPhone(ussdCode)}
              >
                <Feather name="phone" size={14} color={colors.textInverse} />
                <Text style={styles.copyBtnText}>Composer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.ussdCard}>
            <Feather name="alert-triangle" size={16} color={colors.warning} />
            <Text style={styles.ussdText}>
              Le livreur n'a pas fourni de numéro {operator === 'orange_money' ? 'Orange Money' : 'Moov Money'}. Contactez-le ou choisissez l'autre opérateur.
            </Text>
          </View>
        )}

        {/* Preuve de paiement */}
        <View style={styles.sectionTitleRow}>
          <Feather name="image" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Preuve de paiement</Text>
        </View>
        {proofUri ? (
          <View style={styles.proofWrap}>
            <Image source={{ uri: proofUri }} style={styles.proofImage} />
            <Pressable style={styles.proofRemove} onPress={() => setProofUri(null)}>
              <Feather name="x" size={16} color={colors.textInverse} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.proofActions}>
            <Pressable style={styles.proofBtn} onPress={() => handlePickImage(false)}>
              <Feather name="image" size={20} color={colors.primary} />
              <Text style={styles.proofBtnText}>Galerie</Text>
            </Pressable>
            <Pressable style={styles.proofBtn} onPress={() => handlePickImage(true)}>
              <Feather name="camera" size={20} color={colors.primary} />
              <Text style={styles.proofBtnText}>Caméra</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.hint}>
          Faites une capture d'écran de la confirmation de paiement et ajoutez-la ici.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={submitting ? 'Envoi...' : 'Envoyer la preuve'}
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
          disabled={!proofUri || !driverMoneyNumber}
          icon={<Feather name="check" size={18} color={colors.textInverse} />}
        />
      </View>
    </SafeAreaView>
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
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
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
  recapCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  recapLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  recapValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  operatorRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  operatorCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  operatorActive: { backgroundColor: colors.surfaceAlt },
  operatorLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  operatorLogoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  operatorName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  operatorNumber: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  ussdCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#E8F8FF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  ussdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  ussdTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.info,
  },
  ussdText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    flex: 1,
  },
  ussdBold: { fontWeight: typography.weights.bold },
  ussdCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  ussdCode: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  copyBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  proofActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  proofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  proofBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  proofWrap: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
  },
  proofRemove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
