import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getSellerOrders, validatePayment, rejectPayment, updateOrderStatus } from '@/lib/dataService';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatFCFA, formatDateTime } from '@/lib/format';
import { FraudDetectionModal } from '@/components/fraud/FraudDetectionModal';
import { notifyPaymentValidated, notifyProofUploaded } from '@/lib/notifications';
import { PAYMENT_OPERATORS } from '@/constants/payment';
import type { Order, OrderItem, Payment, OrderStatus } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface SellerOrdersScreenProps {
  navigation: { goBack: () => void };
}

const FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'proof_uploaded', label: 'À valider' },
  { key: 'payment_validated', label: 'En préparation' },
  { key: 'in_delivery', label: 'En livraison' },
  { key: 'delivered', label: 'Livrées' },
];

export function SellerOrdersScreen({ navigation }: SellerOrdersScreenProps) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[]; payment?: Payment })[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [fraudModal, setFraudModal] = useState<{ imageUrl: string; amount: number; order: Order } | null>(null);

  const load = useCallback(async () => {
    const data = await getSellerOrders(profile?.id ?? 'demo-seller');
    setOrders(data as any);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleValidate = (order: Order) => {
    showAlert('Valider le paiement', `Confirmer la réception de ${formatFCFA(order.total_amount)} ?`, [
      { text: 'Annuler' },
      { text: 'Confirmer ✓', onPress: async () => {
        await validatePayment(order.id);
        await notifyPaymentValidated(order.buyer_id, order.id);
        await load();
      } },
    ]);
  };

  const handleReject = (order: Order) => {
    showAlert('Refuser le paiement', 'Le paiement sera refusé et la commande annulée.', [
      { text: 'Annuler' },
      { text: 'Refuser', style: 'destructive', onPress: async () => { await rejectPayment(order.id); await load(); } },
    ]);
  };

  const handleFraudCheck = (order: Order & { payment?: Payment }) => {
    if (order.payment?.proof_image_url) {
      setFraudModal({ imageUrl: order.payment.proof_image_url, amount: order.total_amount, order });
    }
  };

  const handleAdvance = async (order: Order) => {
    const next: Record<string, OrderStatus> = {
      payment_validated: 'in_delivery',
      in_delivery: 'delivered',
    };
    const nextStatus = next[order.status];
    if (nextStatus) { await updateOrderStatus(order.id, nextStatus); await load(); }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Commandes</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon="shopping-bag" title="Aucune commande" message="Les commandes de vos clients apparaîtront ici" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: order }) => (
            <Card style={styles.orderCard}>
              <View style={styles.orderHead}>
                <View>
                  <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{formatDateTime(order.created_at)}</Text>
                </View>
                <OrderStatusBadge status={order.status} size="md" />
              </View>

              <View style={styles.itemsList}>
                {order.items?.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Image source={{ uri: it.product?.images?.[0]?.image_url }} style={styles.itemThumb} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{it.product?.name ?? 'Produit'}</Text>
                      <Text style={styles.itemQty}>{it.quantity} × {formatFCFA(it.unit_price)}</Text>
                    </View>
                    <Text style={styles.itemTotal}>{formatFCFA(it.quantity * it.unit_price)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>{formatFCFA(order.total_amount)}</Text>
              </View>

              {order.payment?.operator ? (
                <View style={styles.payInfo}>
                  <View style={[styles.payLogo, { backgroundColor: PAYMENT_OPERATORS[order.payment.operator].bgColor }]}>
                    <Text style={styles.payLogoText}>{PAYMENT_OPERATORS[order.payment.operator].shortName}</Text>
                  </View>
                  <Text style={styles.payText}>{PAYMENT_OPERATORS[order.payment.operator].name}</Text>
                  {order.payment.proof_image_url ? (
                    <View style={styles.proofActions}>
                      <Pressable onPress={() => setProofModal(order.payment!.proof_image_url)} hitSlop={8}>
                        <Text style={styles.seeProof}>Voir</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFraudCheck(order)} hitSlop={8}>
                        <Text style={styles.analyzeBtn}>🔍 IA</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {order.status === 'proof_uploaded' ? (
                <View style={styles.actionRow}>
                  <Button label="Refuser" variant="outline" onPress={() => handleReject(order)} style={{ flex: 1 }} size="sm" />
                  <Button label="Confirmer le paiement" onPress={() => handleValidate(order)} style={{ flex: 1.4, marginLeft: spacing.sm }} size="sm" />
                </View>
              ) : null}

              {order.status === 'payment_validated' ? (
                <Button label="Marquer en livraison 🚚" onPress={() => handleAdvance(order)} variant="outline" size="sm" style={{ marginTop: spacing.sm }} />
              ) : null}

              {order.status === 'in_delivery' ? (
                <Button label="Marquer comme livrée ✓" onPress={() => handleAdvance(order)} size="sm" style={{ marginTop: spacing.sm }} />
              ) : null}
            </Card>
          )}
        />
      )}

      {/* Modal preuve */}
      <Modal visible={!!proofModal} transparent animationType="fade" onRequestClose={() => setProofModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setProofModal(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Capture de paiement</Text>
            {proofModal ? <Image source={{ uri: proofModal }} style={styles.modalImage} contentFit="contain" /> : null}
            <Text style={styles.modalHint}>Vérifiez le montant, l'opérateur et la date avant de valider.</Text>
            <Button label="Analyser avec l'IA 🔍" variant="outline" onPress={() => { setFraudModal({ imageUrl: proofModal!, amount: 0, order: orders[0] }); setProofModal(null); }} style={{ marginVertical: spacing.sm }} />
            <Button label="Fermer" variant="outline" onPress={() => setProofModal(null)} />
          </View>
        </Pressable>
      </Modal>

      {/* Modal détection de fraude */}
      <FraudDetectionModal
        visible={!!fraudModal}
        imageUrl={fraudModal?.imageUrl ?? null}
        expectedAmount={fraudModal?.amount ?? 0}
        onClose={() => setFraudModal(null)}
        onValidate={() => {
          if (fraudModal) {
            handleValidate(fraudModal.order);
            setFraudModal(null);
          }
        }}
        onReject={() => {
          if (fraudModal) {
            handleReject(fraudModal.order);
            setFraudModal(null);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  filterScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  filterChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  filterTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  list: { padding: spacing.lg, paddingTop: 0 },
  orderCard: { marginBottom: spacing.md },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  orderId: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  orderDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
  itemsList: { gap: spacing.sm, marginBottom: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemThumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  itemName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text },
  itemQty: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  itemTotal: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, marginBottom: spacing.sm },
  totalLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  totalAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.primary },
  payInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  payLogo: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  payLogoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse },
  payText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  proofActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  seeProof: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  analyzeBtn: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.secondary, fontWeight: typography.weights.bold },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  modalImage: { width: '100%', height: 400, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md },
  modalHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
