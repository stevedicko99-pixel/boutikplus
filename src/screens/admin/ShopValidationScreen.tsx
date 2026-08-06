import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getPendingShops, setShopStatus, deleteShop } from '@/lib/dataService';
import { friendlyMessage } from '@/lib/errorMessages';
import { getCategoryName } from '@/constants/categories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';
import type { Shop, ShopStatus } from '@/types/models';

import { showAlert, confirmAction } from '@/lib/dialog';

const STATUS_LABEL: Record<ShopStatus, string> = {
  active: 'Approuvée',
  pending: 'En attente',
  paused: 'Refusée',
};

const STATUS_COLOR: Record<ShopStatus, { color: string; bg: string }> = {
  active: { color: colors.success, bg: '#E6F7EE' },
  pending: { color: colors.warning, bg: '#FFF8E1' },
  paused: { color: colors.danger, bg: '#FDECEC' },
};

interface ShopValidationScreenProps {
  navigation: { goBack: () => void };
}

export function ShopValidationScreen({ navigation }: ShopValidationScreenProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getPendingShops();
    setShops(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (shop: Shop, action: 'approve' | 'reject') => {
    const status: ShopStatus = action === 'approve' ? 'active' : 'paused';
    const ok = await confirmAction(
      action === 'approve' ? 'Approuver la boutique' : 'Refuser la boutique',
      `${action === 'approve' ? 'Approuver' : 'Refuser'} "${shop.name}" ?`,
      action === 'approve' ? 'Approuver' : 'Refuser',
    );
    if (!ok) return;
    setBusyId(shop.id);
    const { error } = await setShopStatus(shop.id, status);
    setBusyId(null);
    if (error) {
      showAlert('Action impossible', friendlyMessage(error));
      return;
    }
    setShops((prev) => prev.map((s) => (s.id === shop.id ? { ...s, status } : s)));
  };

  const handleDelete = async (shop: Shop) => {
    const ok = await confirmAction(
      'Supprimer la boutique',
      `Supprimer définitivement "${shop.name}" et tous ses produits ?`,
      'Supprimer',
    );
    if (!ok) return;
    setBusyId(shop.id);
    const { error } = await deleteShop(shop.id);
    setBusyId(null);
    if (error) {
      showAlert('Suppression impossible', friendlyMessage(error));
      return;
    }
    setShops((prev) => prev.filter((s) => s.id !== shop.id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Boutiques</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : shops.length === 0 ? (
        <EmptyState icon="check-circle" title="Aucune boutique" message="Aucune boutique à modérer pour le moment" />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: shop }) => (
            <Card style={styles.shopCard}>
              <View style={styles.shopHead}>
                <Image source={{ uri: shop.logo_url || 'https://placehold.co/80x80/FF6B00/FFFFFF?text=B' }} style={styles.logo} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                  <Text style={styles.shopMeta}>{shop.city} · {getCategoryName(shop.category_id)}</Text>
                  <Text style={styles.shopDate}>Créée {formatRelativeDate(shop.created_at)}</Text>
                </View>
                <Badge label={STATUS_LABEL[shop.status]} color={STATUS_COLOR[shop.status].color} bgColor={STATUS_COLOR[shop.status].bg} />
              </View>
              {shop.description ? <Text style={styles.shopDesc} numberOfLines={2}>{shop.description}</Text> : null}
              <View style={styles.payRow}>
                <Feather name="credit-card" size={14} color={colors.success} />
                <Text style={styles.payText}>
                  {shop.orange_money_number ? 'Orange Money ✓' : 'Orange Money ✗'} · {shop.moov_money_number ? 'Moov Money ✓' : 'Moov Money ✗'}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <Button
                  label="Refuser"
                  variant="outline"
                  onPress={() => handleAction(shop, 'reject')}
                  disabled={busyId === shop.id || shop.status === 'paused'}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Button
                  label="Approuver"
                  onPress={() => handleAction(shop, 'approve')}
                  disabled={busyId === shop.id || shop.status === 'active'}
                  style={{ flex: 1, marginLeft: spacing.sm }}
                  size="sm"
                />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(shop)}
                  disabled={busyId === shop.id}
                  accessibilityLabel={`Supprimer la boutique ${shop.name}`}
                >
                  <Feather name="trash-2" size={16} color={colors.danger} />
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  list: { padding: spacing.lg, paddingTop: 0 },
  shopCard: { marginBottom: spacing.md },
  shopHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  shopMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  shopDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  shopDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.sm },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#E6F7EE', borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  payText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.success, fontWeight: typography.weights.medium },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  deleteBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
});
