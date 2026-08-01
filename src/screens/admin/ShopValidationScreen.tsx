import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getPendingShops } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';
import type { Shop } from '@/types/models';

interface ShopValidationScreenProps {
  navigation: { goBack: () => void };
}

export function ShopValidationScreen({ navigation }: ShopValidationScreenProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getPendingShops();
    setShops(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = (shop: Shop, action: 'approve' | 'reject') => {
    Alert.alert(action === 'approve' ? 'Valider' : 'Refuser', `${action === 'approve' ? 'Valider' : 'Refuser'} la boutique "${shop.name}" ?`, [
      { text: 'Annuler' },
      { text: action === 'approve' ? 'Valider ✓' : 'Refuser', style: action === 'approve' ? 'default' : 'destructive', onPress: () => {
        setShops((prev) => prev.filter((s) => s.id !== shop.id));
        Alert.alert('Terminé', action === 'approve' ? 'Boutique validée' : 'Boutique refusée');
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Validation boutiques</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : shops.length === 0 ? (
        <EmptyState icon="check-circle" title="Tout est à jour" message="Aucune boutique en attente de validation" />
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
                <Badge label="En attente" color={colors.warning} bgColor="#FFF8E1" />
              </View>
              {shop.description ? <Text style={styles.shopDesc} numberOfLines={2}>{shop.description}</Text> : null}
              <View style={styles.payRow}>
                <Feather name="credit-card" size={14} color={colors.success} />
                <Text style={styles.payText}>
                  {shop.orange_money_number ? 'Orange Money ✓' : 'Orange Money ✗'} · {shop.moov_money_number ? 'Moov Money ✓' : 'Moov Money ✗'}
                </Text>
              </View>
              <View style={styles.actionRow}>
                <Button label="Refuser" variant="outline" onPress={() => handleAction(shop, 'reject')} style={{ flex: 1 }} size="sm" />
                <Button label="Valider" onPress={() => handleAction(shop, 'approve')} style={{ flex: 1, marginLeft: spacing.sm }} size="sm" />
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
  actionRow: { flexDirection: 'row', marginTop: spacing.sm },
});
