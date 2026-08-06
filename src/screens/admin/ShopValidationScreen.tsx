import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/theme';
import { getAllShops, approveShop, rejectShop, toggleShopVerified, deleteShop } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { formatRelativeDate } from '@/lib/format';
import type { Shop } from '@/types/models';

type FilterTab = 'all' | 'pending' | 'active' | 'rejected';

interface ShopValidationScreenProps {
  navigation: { goBack: () => void };
}

export function ShopValidationScreen({ navigation }: ShopValidationScreenProps) {
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<Shop | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAllShops();
    setAllShops(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  const filteredShops = allShops.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const counts = {
    all: allShops.length,
    pending: allShops.filter((s) => s.status === 'pending').length,
    active: allShops.filter((s) => s.status === 'active').length,
    rejected: allShops.filter((s) => s.status === 'rejected').length,
  };

  const handleApprove = async (shop: Shop) => {
    Alert.alert('Approuver', `Valider "${shop.name}" ?`, [
      { text: 'Annuler' },
      { text: 'Approuver', onPress: async () => {
        setBusy(shop.id);
        const { error } = await approveShop(shop.id);
        setBusy(null);
        if (error) Alert.alert('Erreur', error);
        else {
          setAllShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, status: 'active' as const } : s));
        }
      } },
    ]);
  };

  const handleOpenReject = (shop: Shop) => {
    setRejectModal(shop);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer le motif du refus.');
      return;
    }
    setBusy(rejectModal.id);
    const { error } = await rejectShop(rejectModal.id, rejectReason.trim());
    setBusy(null);
    if (error) Alert.alert('Erreur', error);
    else {
      setAllShops((prev) => prev.map((s) => s.id === rejectModal.id ? { ...s, status: 'rejected' as const } : s));
    }
    setRejectModal(null);
  };

  const handleToggleVerified = async (shop: Shop) => {
    const nextVerified = !shop.is_verified;
    setBusy(shop.id);
    const { error } = await toggleShopVerified(shop.id, nextVerified);
    setBusy(null);
    if (error) Alert.alert('Erreur', error);
    else {
      setAllShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, is_verified: nextVerified } : s));
    }
  };

  const handleDelete = (shop: Shop) => {
    Alert.alert(
      'Supprimer la boutique',
      `⚠️ "${shop.name}" et tous ses produits seront supprimés définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy(shop.id);
            const { error } = await deleteShop(shop.id);
            setBusy(null);
            if (error) Alert.alert('Erreur', error);
            else {
              setAllShops((prev) => prev.filter((s) => s.id !== shop.id));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Gestion des boutiques</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Onglets de filtre */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {([
          { key: 'all' as FilterTab, label: 'Toutes', count: counts.all },
          { key: 'pending' as FilterTab, label: 'En attente', count: counts.pending },
          { key: 'active' as FilterTab, label: 'Actives', count: counts.active },
          { key: 'rejected' as FilterTab, label: 'Refusées', count: counts.rejected },
        ]).map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingSpinner />
      ) : filteredShops.length === 0 ? (
        <EmptyState icon="briefcase" title="Aucune boutique" message={`Aucune boutique ${filter === 'all' ? '' : 'dans cette catégorie'}`} />
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: shop }) => (
            <Card style={styles.shopCard}>
              <View style={styles.shopHead}>
                <Image
                  source={{ uri: shop.logo_url || undefined }}
                  style={styles.logo}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                  <Text style={styles.shopMeta}>{shop.city} · {getCategoryName(shop.category_id)}</Text>
                  <Text style={styles.shopDate}>Créée {formatRelativeDate(shop.created_at)}</Text>
                </View>
                {shop.status === 'pending' ? (
                  <Badge label="En attente" color={colors.warning} bgColor="#FFF8E1" />
                ) : shop.status === 'active' ? (
                  <Badge label="Active" color={colors.success} bgColor="#E6F7EE" />
                ) : shop.status === 'rejected' ? (
                  <Badge label="Refusée" color={colors.danger} bgColor="#FDECEC" />
                ) : (
                  <Badge label="En pause" color={colors.textMuted} bgColor={colors.surfaceAlt} />
                )}
              </View>

              {shop.description ? <Text style={styles.shopDesc} numberOfLines={2}>{shop.description}</Text> : null}

              {shop.is_verified ? (
                <View style={styles.verifiedRow}>
                  <Feather name="check-circle" size={13} color={colors.primary} />
                  <Text style={styles.verifiedText}>Boutique vérifiée</Text>
                </View>
              ) : null}

              <View style={styles.payRow}>
                <Feather name="credit-card" size={14} color={colors.success} />
                <Text style={styles.payText}>
                  {shop.orange_money_number ? 'OM ✓ ' : 'OM ✗ '}
                  {shop.moov_money_number ? 'Moov ✓ ' : 'Moov ✗ '}
                  {shop.coris_money_number ? 'Coris ✓ ' : 'Coris ✗ '}
                  {shop.wave_number ? 'Wave ✓' : 'Wave ✗'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {shop.status === 'pending' ? (
                  <>
                    <Button
                      label="Refuser"
                      variant="outline"
                      onPress={() => handleOpenReject(shop)}
                      style={{ flex: 1 }}
                      size="sm"
                      loading={busy === shop.id}
                    />
                    <Button
                      label="Approuver"
                      onPress={() => handleApprove(shop)}
                      style={{ flex: 1, marginLeft: spacing.sm }}
                      size="sm"
                      loading={busy === shop.id}
                    />
                  </>
                ) : shop.status !== 'rejected' ? (
                  <Button
                    label="Refuser"
                    variant="outline"
                    onPress={() => handleOpenReject(shop)}
                    style={{ flex: 1 }}
                    size="sm"
                    loading={busy === shop.id}
                  />
                ) : null}
                {shop.status === 'rejected' ? (
                  <Button
                    label="Approuver"
                    onPress={() => handleApprove(shop)}
                    style={{ flex: 1 }}
                    size="sm"
                    loading={busy === shop.id}
                  />
                ) : null}
                <Button
                  label={shop.is_verified ? 'Retirer badge' : 'Badge vérifiée'}
                  variant="outline"
                  onPress={() => handleToggleVerified(shop)}
                  style={{ flex: 1, marginLeft: spacing.sm }}
                  size="sm"
                  loading={busy === shop.id}
                />
              </View>
              <Pressable
                style={styles.deleteRow}
                onPress={() => handleDelete(shop)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={13} color={colors.danger} />
                <Text style={styles.deleteText}>Supprimer définitivement</Text>
              </Pressable>
            </Card>
          )}
        />
      )}

      {/* Modal de refus avec motif */}
      <Modal visible={!!rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRejectModal(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Refuser "{rejectModal?.name}"</Text>
            <Text style={styles.modalSubtitle}>Indiquez le motif du refus (sera communiqué au vendeur) :</Text>
            <Input
              label=""
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: Logo de mauvaise qualité, informations incomplètes..."
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Button label="Annuler" variant="outline" onPress={() => setRejectModal(null)} style={{ flex: 1 }} />
              <Button label="Confirmer le refus" onPress={handleConfirmReject} style={{ flex: 1, marginLeft: spacing.sm }} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  filterTab: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.textMuted },
  filterTabTextActive: { color: colors.textInverse },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  verifiedText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold },
  list: { padding: spacing.lg, paddingTop: 0 },
  shopCard: { marginBottom: spacing.md },
  shopHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  shopMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  shopDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  shopDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success + '18', borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  payText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.success, fontWeight: typography.weights.medium },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.xs },
  deleteText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.danger, fontWeight: typography.weights.medium },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg },
  modalTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  modalSubtitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center' },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg },
});
