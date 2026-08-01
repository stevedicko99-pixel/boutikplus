import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MobileMoneyInfo } from '@/components/payment/MobileMoneyInfo';
import { PaymentProofUpload } from '@/components/payment/PaymentProofUpload';
import { OPERATOR_LIST, PAYMENT_OPERATORS, type PaymentOperatorId } from '@/constants/payment';
import { getBuyerOrders, getShop, uploadPaymentProof } from '@/lib/dataService';
import { formatFCFA } from '@/lib/format';
import { pickAndCompressImage, uploadImage, type StorageBucket } from '@/lib/storage';
import { notifyProofUploaded } from '@/lib/notifications';
import type { Shop, Order } from '@/types/models';

interface PaymentScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { orderId: string } };
}

export function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<(Order & { shop?: Shop }) | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [operator, setOperator] = useState<PaymentOperatorId | null>(null);
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const orders = await getBuyerOrders('demo-buyer');
      const found = orders.find((o) => o.id === orderId);
      if (found) {
        const orderWithShop = found as Order & { shop?: Shop };
        setOrder(orderWithShop);
        const shopId = found.items?.[0]?.product?.shop_id;
        if (shopId) {
          const s = await getShop(shopId);
          setShop(s);
          if (s?.orange_money_number) setOperator('orange_money');
          else if (s?.moov_money_number) setOperator('moov_money');
        }
      }
    })();
  }, [orderId]);

  const handlePickImage = async (fromCamera: boolean) => {
    const result = await pickAndCompressImage(fromCamera);
    if (result) setProofUri(result.uri);
  };

  const handleSubmit = async () => {
    if (!operator || !order || !shop) {
      Alert.alert('Erreur', 'Veuillez sélectionner un opérateur');
      return;
    }
    const mmNumber = operator === 'orange_money' ? shop.orange_money_number : shop.moov_money_number;
    if (!mmNumber) {
      Alert.alert('Erreur', 'Le vendeur n\'a pas de numéro pour cet opérateur');
      return;
    }
    if (!proofUri) {
      Alert.alert('Erreur', 'Veuillez téléverser la capture d\'écran du paiement');
      return;
    }
    setSubmitting(true);
    let proofUrl = proofUri;
    // En mode réel, on téléverse vers Supabase Storage
    const uploaded = await uploadImage('payment-proofs' as StorageBucket, proofUri, `proof_${orderId}`);
    if (uploaded) proofUrl = uploaded.url;
    const { error } = await uploadPaymentProof(order.id, order.total_amount, operator, proofUrl);
    setSubmitting(false);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    // Déclencher notification au vendeur
    await notifyProofUploaded(order.seller_id, order.id);
    navigation.navigate('OrderConfirmation', { orderId: order.id });
  };

  const availableOperators = OPERATOR_LIST.filter((op) => {
    if (op.id === 'orange_money') return Boolean(shop?.orange_money_number);
    return Boolean(shop?.moov_money_number);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Paiement Mobile Money</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Récap montant */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Montant à payer</Text>
          <Text style={styles.amountValue}>{formatFCFA(order?.total_amount ?? 0)}</Text>
          <Text style={styles.amountHint}>Commande #{orderId.slice(-6).toUpperCase()}</Text>
        </Card>

        {/* Étape 1 : choix opérateur */}
        <View style={styles.stepHeader}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepTitle}>Choisissez l'opérateur</Text>
        </View>
        <View style={styles.operators}>
          {availableOperators.map((op) => (
            <Pressable
              key={op.id}
              style={[styles.opCard, operator === op.id && styles.opCardActive, { borderColor: operator === op.id ? op.bgColor : colors.border }]}
              onPress={() => setOperator(op.id)}
            >
              <View style={[styles.opLogo, { backgroundColor: op.bgColor }]}>
                <Text style={styles.opLogoText}>{op.shortName}</Text>
              </View>
              <Text style={styles.opName}>{op.name}</Text>
              {operator === op.id ? (
                <View style={styles.opCheck}><Feather name="check" size={14} color={colors.textInverse} /></View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {/* Étape 2 : numéro du vendeur */}
        {operator && shop ? (
          <>
            <View style={styles.stepHeader}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepTitle}>Effectuez le transfert</Text>
            </View>
            <MobileMoneyInfo
              operator={operator}
              number={operator === 'orange_money' ? shop.orange_money_number! : shop.moov_money_number!}
            />
            <View style={styles.steps}>
              <StepItem num="1" text="Ouvrez votre app Orange/Moov Money" />
              <StepItem num="2" text={`Envoyez ${formatFCFA(order?.total_amount ?? 0)} au numéro ci-dessus`} />
              <StepItem num="3" text="Prenez une capture d'écran de la confirmation" />
            </View>
          </>
        ) : null}

        {/* Étape 3 : upload preuve */}
        {operator ? (
          <>
            <View style={styles.stepHeader}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepTitle}>Téléversez la preuve</Text>
            </View>
            <PaymentProofUpload
              imageUri={proofUri}
              onPick={handlePickImage}
              onClear={() => setProofUri(null)}
            />
            <Text style={styles.hint}>
              Le vendeur vérifiera votre capture et confirmera la réception du paiement.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label="Envoyer la preuve de paiement"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!operator || !proofUri}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

function StepItem({ num, text }: { num: string; text: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepItemNum}><Text style={styles.stepItemNumText}>{num}</Text></View>
      <Text style={styles.stepItemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  amountCard: { alignItems: 'center', marginBottom: spacing.xl, backgroundColor: colors.primary },
  amountLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: 'rgba(255,255,255,0.85)' },
  amountValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.mega, fontWeight: typography.weights.bold, color: colors.textInverse, marginVertical: spacing.xs },
  amountHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.7)' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse },
  stepTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  operators: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  opCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, backgroundColor: colors.surface, position: 'relative' },
  opCardActive: { backgroundColor: '#FFF8F0' },
  opLogo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  opLogoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse },
  opName: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  opCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  steps: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, gap: spacing.md },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepItemNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepItemNumText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary },
  stepItemText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  hint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
  bottomBar: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
});
