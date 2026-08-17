import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/theme';
import { getAllShops, updateShopStatus, toggleShopVerified, deleteShop } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';
import type { Shop, ShopStatus } from '@/types/models';

type FilterTab = 'all' | ShopStatus;

interface ShopValidationScreenProps {
  navigation: { goBack: () => void };
}

export function ShopValidationScreen({ navigation }: ShopValidationScreenProps) {
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
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

  const filteredShops = filter === 'all'
    ? allShops
    : allShops.filter((shop) => shop.status === filter);

  const counts = {
    all: allShops.length,
    active: allShops.filter((shop) => shop.status === 'active').length,
    paused: allShops.filter((shop) => shop.status === 'paused').length,
  };

  const handleStatusChange = async (shop: Shop) => {
    const nextStatus: ShopStatus = shop.status === 'active' ? 'paused' : 'active';
    setBusy(shop.id);
    const { error } = await updateShopStatus(shop.id, nextStatus);
    setBusy(null);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    setAllShops((prev) => prev.map((item) => item.id === shop.id ? { ...item, status: nextStatus } : item));
  };

  const handleToggleVerified = async (shop: Shop) => {
    const nextVerified = !shop.is_verified;
    setBusy(shop.id);
    const { error } = await toggleShopVerified(shop.id, nextVerified);
    setBusy(null);
    if (error) Alert.alert('Erreur', error);
    else {
      setAllShops((prev) => prev.map((item) => item.id === shop.id ? { ...item, is_verified: nextVerified } : item));
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
            else setAllShops((prev) => prev.filter((item) => item.id !== shop.id));
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {([
          { key: 'all' as FilterTab, label: 'Toutes', count: counts.all },
          { key: 'active' as FilterTab, label: 'Actives', count: counts.active },
          { key: 'paused' as FilterTab, label: 'En pause', count: counts.paused },
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
        <EmptyState icon="briefcase" title="Aucune boutique" message="Aucune boutique dans cette catégorie" />
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: shop }) => (
            <Card style={styles.shopCard}>
              <View style={styles.shopHead}>
                <Image source={{ uri: shop.logo_url || undefined }} style={styles.logo} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                  <Text style={styles.shopMeta}>{shop.city} · {getCategoryName(shop.category_id)}</Text>
                  <Text style={styles.shopDate}>Créée {formatRelativeDate(shop.created_at)}</Text>
                </View>
                <Badge
                  label={shop.status === 'active' ? 'Active' : 'En pause'}
                  color={shop.status === 'active' ? colors.success : colors.textMuted}
                  bgColor={shop.status === 'active' ? '#E6F7EE' : colors.surfaceAlt}
                />
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
                <Button
                  label={shop.status === 'active' ? 'Mettre en pause' : 'Réactiver'}
                  variant="outline"
                  onPress={() => handleStatusChange(shop)}
                  style={{ flex: 1 }}
                  size="sm"
                  loading={busy === shop.id}
                />
                <Button
                  label={shop.is_verified ? 'Retirer badge' : 'Marquer vérifiée'}
                  variant="outline"
                  onPress={() => handleToggleVerified(shop)}
                  style={{ flex: 1, marginLeft: spacing.sm }}
                  size="sm"
                  loading={busy === shop.id}
                />
              </View>
              <Pressable style={styles.deleteRow} onPress={() => handleDelete(shop)} hitSlop={8}>
                <Feather name="trash-2" size={13} color={colors.danger} />
                <Text style={styles.deleteText}>Supprimer définitivement</Text>
              </Pressable>
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
});
