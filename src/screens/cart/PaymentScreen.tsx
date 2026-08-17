import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MobileMoneyInfo } from '@/components/payment/MobileMoneyInfo';
import { OPERATOR_LIST, SHOP_OPERATOR_FIELDS, PAYMENT_OPERATORS, type PaymentOperatorId } from '@/constants/payment';
import { getBuyerOrders, getShop, uploadPaymentProof, findOrCreateConversation, sendMessage, isDemoMode } from '@/lib/dataService';
import { DEMO_BUYER } from '@/data/demoData';
import { formatFCFA } from '@/lib/format';
import { ImageUploader, type UploadedImage } from '@/components/upload/ImageUploader';
import { friendlyMessage } from '@/lib/errorMessages';
import { isLocalMediaUri } from '@/lib/storage';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useConnectivity } from '@/context/ConnectivityContext';
import type { Shop, Order } from '@/types/models';

interface PaymentScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { orderId: string; amount?: number; operator?: PaymentOperatorId; shopId?: string } };
}

function chooseDefaultOperator(shop: Shop): PaymentOperatorId | null {
  return OPERATOR_LIST.find((op) => Boolean(getOperatorNumber(shop, op.id)))?.id ?? null;
}

export function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const { orderId, amount: fallbackAmount, operator: fallbackOperator, shopId: fallbackShopId } = route.params;
  const toast = useToast();
  const { profile } = useAuth();
  const { isOnline } = useConnectivity();
  const buyerId = profile?.id ?? (isDemoMode ? DEMO_BUYER.id : null);
  const [order, setOrder] = useState<(Order & { shop?: Shop }) | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [operator, setOperator] = useState<PaymentOperatorId | null>(fallbackOperator ?? null);
  const [proofImages, setProofImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setOrder(null);
      setShop(null);
      if (!buyerId) {
        setLoadError('Connexion requise. Connectez-vous pour accéder au paiement de cette commande.');
        setLoading(false);
        return;
      }
      try {
        const orders = await getBuyerOrders(buyerId);
        const found = orders.find((item) => item.id === orderId) as (Order & { shop?: Shop; items?: Array<{ product?: { shop_id?: string } }> }) | undefined;
        if (!found) {
          if (!active) return;
          setLoadError('Commande introuvable. Revenez à vos commandes et réessayez.');
          return;
        }
        const resolvedShopId = fallbackShopId ?? found.shop?.id ?? found.items?.[0]?.product?.shop_id;
        if (!resolvedShopId) {
          if (!active) return;
          setOrder(found);
          setLoadError('La boutique associée à cette commande est introuvable.');
          return;
        }
        const embeddedShopMatchesSeller = found.shop?.id === resolvedShopId
          && found.shop.owner_id === found.seller_id;
        const resolvedShop = embeddedShopMatchesSeller
          ? found.shop!
          : await getShop(resolvedShopId);
        if (!active) return;
        setOrder(found);
        if (!resolvedShop) {
          setLoadError('La boutique associée à cette commande est introuvable.');
          return;
        }
        if (resolvedShop.owner_id !== found.seller_id) {
          setLoadError('Le propriétaire de la boutique ne correspond pas au vendeur de la commande.');
          return;
        }
        setShop(resolvedShop);
        const defaultOperator = chooseDefaultOperator(resolvedShop);
        if (!defaultOperator) {
          setLoadError('Cette boutique n’a configuré aucun opérateur Mobile Money. Contactez le vendeur.');
          return;
        }
        setOperator((current) => current && getOperatorNumber(resolvedShop, current) ? current : defaultOperator);
      } catch {
        if (active) setLoadError('Impossible de charger les informations de paiement. Réessayez plus tard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [orderId, fallbackShopId, buyerId]);

  const proofImage = proofImages[0];
  const proofUploading = proofImages.some((img) => img.isUploading);
  const proofUploadError = proofImage?.uploadError ?? null;
  const proofUrl = proofImage?.url;
  const hasRemoteProof = Boolean(proofUrl && !isLocalMediaUri(proofUrl));
  const proofInvalidMessage = proofUploadError
    ? `Échec du téléversement : ${proofUploadError}`
    : proofImage && !proofUploading && !hasRemoteProof
      ? 'La preuve doit être téléversée avant l’envoi.'
      : null;
  const availableOperators = shop ? OPERATOR_LIST.filter((op) => Boolean(getOperatorNumber(shop, op.id))) : [];

  const handleSubmit = async () => {
    if (!buyerId) {
      toast.error('Connexion requise', 'Connectez-vous avant d’envoyer une preuve de paiement.');
      return;
    }
    if (!isOnline) {
      toast.warning('Connexion requise', 'Reconnectez-vous avant de téléverser et d’envoyer la preuve de paiement.');
      return;
    }
    if (!order || !shop) {
      toast.error('Paiement indisponible', 'Les informations de la commande ne sont pas encore disponibles.');
      return;
    }
    if (!operator) {
      toast.warning('Opérateur requis', 'Choisissez d’abord l’opérateur utilisé pour le paiement.');
      return;
    }
    if (!getOperatorNumber(shop, operator)) {
      toast.error('Opérateur indisponible', 'Le vendeur n’a pas configuré de numéro pour cet opérateur');
      return;
    }
    if (proofUploading) {
      toast.warning('Téléversement en cours', 'Veuillez attendre la fin de l’envoi de la preuve');
      return;
    }
    if (proofUploadError || !proofUrl || isLocalMediaUri(proofUrl)) {
      toast.error(
        'Preuve non téléversée',
        proofUploadError
          ? `Le téléversement a échoué : ${proofUploadError}`
          : 'Veuillez téléverser la capture d’écran du paiement avant de l’envoyer.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await uploadPaymentProof(order.id, order.total_amount, operator, proofUrl);
      if (error) {
        toast.error('Échec de l’envoi', friendlyMessage(error));
        return;
      }
      toast.success('Preuve envoyée', 'Le vendeur va valider votre paiement sous peu');
      try {
        const convId = await findOrCreateConversation(buyerId, order.seller_id, shop.id);
        if (!convId) throw new Error('Conversation indisponible');
        const orderRef = `#${order.id.slice(-6).toUpperCase()}`;
        const message = `Bonjour 👋 J'ai envoyé ma preuve de paiement pour la commande ${orderRef} (${formatFCFA(order.total_amount)} via ${PAYMENT_OPERATORS[operator].name}). Merci de la vérifier et de confirmer mon paiement. 🙏`;
        const sentMessage = await sendMessage(convId, buyerId, message);
        if (!sentMessage) throw new Error('Message automatique non envoyé');
      } catch {
        toast.warning('Preuve enregistrée', 'La preuve est envoyée, mais le message automatique au vendeur n’a pas pu être envoyé.');
      }
      navigation.navigate('OrderConfirmation', { orderId: order.id });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable><Text style={styles.title}>Paiement Mobile Money</Text><View style={{ width: 24 }} /></View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? <View style={styles.loadingState}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.statusText}>Chargement des informations de paiement…</Text></View> : null}
        {loadError ? <Card style={styles.errorCard}><Feather name="alert-circle" size={22} color={colors.danger} /><Text style={styles.errorText}>{loadError}</Text></Card> : null}
        {!loading && !loadError && order && shop ? <>
          <Card style={styles.amountCard}><Text style={styles.amountLabel}>Montant à payer</Text><Text style={styles.amountValue}>{formatFCFA(order.total_amount)}</Text><Text style={styles.amountHint}>Commande #{orderId.slice(-6).toUpperCase()}</Text></Card>
          <View style={styles.stepHeader}><View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View><Text style={styles.stepTitle}>Choisissez l’opérateur</Text></View>
          <View style={styles.operators}>{availableOperators.map((op) => <Pressable key={op.id} style={[styles.opCard, operator === op.id && styles.opCardActive, { borderColor: operator === op.id ? op.bgColor : colors.border }]} onPress={() => setOperator(op.id)}><View style={[styles.opLogo, { backgroundColor: op.bgColor }]}><Text style={styles.opLogoText}>{op.shortName}</Text></View><Text style={styles.opName}>{op.name}</Text>{operator === op.id ? <View style={styles.opCheck}><Feather name="check" size={14} color={colors.textInverse} /></View> : null}</Pressable>)}</View>
          {operator ? <><View style={styles.stepHeader}><View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View><Text style={styles.stepTitle}>Effectuez le transfert</Text></View><MobileMoneyInfo operator={operator} number={getOperatorNumber(shop, operator) ?? ''} /><View style={styles.steps}><StepItem num="1" text="Ouvrez votre application Mobile Money" /><StepItem num="2" text={`Envoyez ${formatFCFA(order.total_amount)} au numéro ci-dessus`} /><StepItem num="3" text="Prenez une capture d’écran de la confirmation" /></View><View style={styles.stepHeader}><View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View><Text style={styles.stepTitle}>Téléversez la preuve</Text></View><ImageUploader initialImages={proofImages} maxImages={1} bucket="payment-proofs" filePrefix={`proof_${orderId}`} addLabel="Capture du paiement" aspectRatio={16 / 10} onChange={setProofImages} />{proofInvalidMessage ? <Text style={styles.proofError}>{proofInvalidMessage}</Text> : null}<Text style={styles.hint}>Le vendeur vérifiera votre capture et confirmera la réception du paiement.</Text></> : null}
        </> : null}
      </ScrollView>
      {!loading && !loadError ? <View style={styles.bottomBar}><Button label={hasRemoteProof ? "Envoyer la preuve de paiement" : "Téléverser la capture du paiement"} onPress={handleSubmit} loading={submitting} disabled={submitting} accessibilityHint="Sélectionnez une capture dans l’étape 3, puis envoyez-la au vendeur" fullWidth /></View> : null}
    </SafeAreaView>
  );
}

function StepItem({ num, text }: { num: string; text: string }) { return <View style={styles.stepItem}><View style={styles.stepItemNum}><Text style={styles.stepItemNumText}>{num}</Text></View><Text style={styles.stepItemText}>{text}</Text></View>; }
function getOperatorNumber(shop: Shop, operator: PaymentOperatorId): string | null { const field = SHOP_OPERATOR_FIELDS[operator]; return (shop as unknown as Record<string, string | null>)[field] ?? null; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }, title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text }, scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 }, loadingState: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl }, statusText: { fontFamily: typography.fontFamily, color: colors.textMuted, textAlign: 'center' }, errorCard: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.danger }, errorText: { flex: 1, fontFamily: typography.fontFamily, color: colors.danger, lineHeight: 20 }, amountCard: { alignItems: 'center', marginBottom: spacing.xl, backgroundColor: colors.primary }, amountLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: 'rgba(255,255,255,0.85)' }, amountValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.mega, fontWeight: typography.weights.bold, color: colors.textInverse, marginVertical: spacing.xs }, amountHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.7)' }, stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm }, stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, stepNumText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse }, stepTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text }, operators: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }, opCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, backgroundColor: colors.surface, position: 'relative' }, opCardActive: { backgroundColor: '#FFF8F0' }, opLogo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, opLogoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse }, opName: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text }, opCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, steps: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, gap: spacing.md }, stepItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, stepItemNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, stepItemNumText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary }, stepItemText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text }, proofError: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.danger, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }, hint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }, bottomBar: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
});
