import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getShop, getProductsByShop, getShopReviews } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { ProductCard } from '@/components/product/ProductCard';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrustBadges, calculateTrustBadges, type TrustBadge } from '@/components/growth/TrustBadges';
import { formatFCFA, formatRelativeDate } from '@/lib/format';
import type { Shop, ProductWithImages, Review } from '@/types/models';

interface ShopDetailScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { shopId: string } };
}

export function ShopDetailScreen({ navigation, route }: ShopDetailScreenProps) {
  const { shopId } = route.params;
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'products' | 'reviews'>('products');

  useEffect(() => {
    (async () => {
      const [s, p, r] = await Promise.all([
        getShop(shopId),
        getProductsByShop(shopId),
        getShopReviews(shopId),
      ]);
      setShop(s);
      setProducts(p);
      setReviews(r);
      setLoading(false);
    })();
  }, [shopId]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><LoadingSpinner /></SafeAreaView>;
  if (!shop) return <SafeAreaView style={styles.container} edges={['top']}><EmptyState icon="alert-circle" title="Boutique introuvable" /></SafeAreaView>;

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const trustBadges = calculateTrustBadges({
    isVerified: shop.status === 'active',
    averageRating: avgRating || 4,
    totalReviews: reviews.length,
    deliveryDays: 3,
    totalOrders: 10,
    cancellationRate: 0.02,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={tab === 'products' ? products : []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <Pressable onPress={navigation.goBack} hitSlop={10}>
                <Feather name="arrow-left" size={24} color={colors.text} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Pressable onPress={() => navigation.navigate('ShareableShop', { shopId: shop.id, shopName: shop.name, shopLogo: shop.logo_url })} hitSlop={10}>
                  <Feather name="share-2" size={20} color={colors.primary} />
                </Pressable>
              </View>
              <Pressable hitSlop={10} onPress={() => navigation.navigate('Chat', { conversationId: 'conv-1', shopId: shop.id })}>
                <Feather name="message-circle" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.header}>
              <Image
                source={{ uri: shop.banner_url || shop.logo_url || 'https://placehold.co/400x200/FF6B00/FFFFFF?text=B' }}
                style={styles.banner}
                contentFit="cover"
              />
              <View style={styles.headerInfo}>
                <Image
                  source={{ uri: shop.logo_url || 'https://placehold.co/100x100/FF6B00/FFFFFF?text=B' }}
                  style={styles.logo}
                  contentFit="cover"
                />
                <View style={styles.headerText}>
                  <Text style={styles.shopName}>{shop.name}</Text>
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={13} color={colors.textMuted} />
                    <Text style={styles.metaText}>{shop.city}</Text>
                    <Text style={styles.catBadge}>{getCategoryName(shop.category_id)}</Text>
                  </View>
                  {avgRating > 0 ? <Rating value={avgRating} size={13} showValue count={reviews.length} /> : null}
                </View>
              </View>
              <View style={styles.badgesWrap}>
                <TrustBadges badges={trustBadges} size="sm" />
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                label={following ? 'Abonné ✓' : 'Suivre la boutique'}
                variant={following ? 'outline' : 'primary'}
                size="sm"
                onPress={() => setFollowing((f) => !f)}
                style={{ flex: 1 }}
              />
              <Button
                label="Contacter"
                variant="outline"
                size="sm"
                icon={<Feather name="message-circle" size={16} color={colors.secondary} />}
                onPress={() => navigation.navigate('Chat', { conversationId: 'conv-1', shopId: shop.id })}
                style={{ flex: 1 }}
              />
            </View>

            {shop.description ? (
              <View style={styles.descWrap}>
                <Text style={styles.descTitle}>À propos</Text>
                <Text style={styles.desc}>{shop.description}</Text>
              </View>
            ) : null}

            <View style={styles.paymentInfo}>
              <Feather name="credit-card" size={16} color={colors.success} />
              <Text style={styles.paymentText}>
                Paiement Mobile Money · {shop.orange_money_number ? 'Orange Money' : ''}
                {shop.orange_money_number && shop.moov_money_number ? ' · ' : ''}
                {shop.moov_money_number ? 'Moov Money' : ''}
              </Text>
            </View>

            <View style={styles.tabs}>
              <Pressable style={[styles.tab, tab === 'products' && styles.tabActive]} onPress={() => setTab('products')}>
                <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>Produits ({products.length})</Text>
              </Pressable>
              <Pressable style={[styles.tab, tab === 'reviews' && styles.tabActive]} onPress={() => setTab('reviews')}>
                <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextActive]}>Avis ({reviews.length})</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
          </View>
        )}
        ListEmptyComponent={
          tab === 'reviews' ? (
            <View style={{ padding: spacing.xxl }}>
              {reviews.length === 0 ? (
                <EmptyState icon="star" title="Aucun avis" message="Soyez le premier à laisser un avis" />
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewHead}>
                      <View style={styles.avatar}><Feather name="user" size={16} color={colors.textMuted} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName}>Client vérifié</Text>
                        <Text style={styles.reviewDate}>{formatRelativeDate(r.created_at)}</Text>
                      </View>
                      <Rating value={r.rating} size={12} />
                    </View>
                    {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))
              )}
            </View>
          ) : (
            <EmptyState icon="package" title="Aucun produit" message="Cette boutique n'a pas encore de produits" />
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  banner: { width: '100%', height: 140, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  headerInfo: { flexDirection: 'row', marginTop: -30, paddingHorizontal: spacing.md },
  logo: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.surfaceAlt },
  headerText: { flex: 1, marginLeft: spacing.md, marginTop: spacing.xl },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2, marginBottom: 4 },
  metaText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  badgesWrap: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  catBadge: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold, marginLeft: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  descWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg },
  descTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs },
  desc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, lineHeight: 22 },
  paymentInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: '#E6F7EE', borderRadius: radius.md },
  paymentText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.success, fontWeight: typography.weights.medium },
  tabs: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: typography.weights.bold },
  gridRow: { gap: spacing.md, paddingHorizontal: spacing.lg },
  gridItem: { flex: 1, maxWidth: '50%' },
  reviewItem: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  reviewName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  reviewDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  reviewComment: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, lineHeight: 22 },
});
