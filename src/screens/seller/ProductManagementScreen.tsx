import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProductsByShop, deleteProduct, updateProduct } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { formatFCFA } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Shop, ProductWithImages, ProductStatus } from '@/types/models';

interface ProductManagementScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function ProductManagementScreen({ navigation }: ProductManagementScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithImages | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const s = await getShopByOwner(profile.id);
    if (s) {
      setShop(s);
      const prods = await getProductsByShop(s.id);
      setProducts(prods);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (product: ProductWithImages) => {
    setDeleteTarget(product);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await deleteProduct(deleteTarget.id);
    setDeleting(false);
    if (error) {
      Alert.alert('Erreur', `Impossible de supprimer: ${error}`);
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const toggleStock = async (product: ProductWithImages) => {
    const newStatus: ProductStatus = product.status === 'available' ? 'out_of_stock' : 'available';
    setBusyId(product.id);
    await updateProduct(product.id, { status: newStatus, stock: newStatus === 'available' ? 1 : 0 });
    setBusyId(null);
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: newStatus, stock: newStatus === 'available' ? 1 : 0 } : p));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Mes produits</Text>
        <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddEditProduct')} accessibilityRole="button" accessibilityLabel="Ajouter un produit">
          <Feather name="plus" size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      {loading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <EmptyState icon="package" title="Aucun produit" message="Ajoutez votre premier produit" action={
          <Pressable style={styles.addBtnLarge} onPress={() => navigation.navigate('AddEditProduct')}>
            <Feather name="plus" size={18} color={colors.textInverse} />
            <Text style={styles.addBtnText}>Ajouter un produit</Text>
          </Pressable>
        } />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <Image source={{ uri: item.images?.[0]?.image_url }} style={styles.thumb} contentFit="cover" />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cat}>{getCategoryName(item.category_id)} · Stock: {item.stock}</Text>
                <Text style={styles.price}>{formatFCFA(item.price)}</Text>
                <View style={styles.badges}>
                  {item.status === 'available' ? (
                    <Badge label="Disponible" color={colors.success} bgColor="#E6F7EE" />
                  ) : (
                    <Badge label="Rupture" color={colors.danger} bgColor={colors.danger + '18'} />
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ paddingHorizontal: 8 }} />
                ) : (
                  <>
                    <Pressable style={styles.actionBtn} onPress={() => toggleStock(item)}>
                      <Feather name={item.status === 'available' ? 'eye-off' : 'eye'} size={16} color={colors.warning} />
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('AddEditProduct', { productId: item.id })}>
                      <Feather name="edit-2" size={16} color={colors.secondary} />
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </Pressable>
                  </>
                )}
              </View>
</View>
          )}
        />
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Supprimer le produit"
        message={deleteTarget ? `Voulez-vous vraiment supprimer "${deleteTarget.name}" ? Cette action est irréversible.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        icon="trash-2"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingTop: 0 },
  productItem: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  thumb: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  info: { flex: 1 },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: 2 },
  cat: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: 4 },
  price: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.xs },
  badges: { flexDirection: 'row', gap: spacing.xs },
  actions: { justifyContent: 'space-around', gap: spacing.sm },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addBtnLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.lg, marginTop: spacing.lg },
  addBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
});
