import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { getShops, getProducts, getActivePromotions, getCategories } from '@/lib/dataService';
import type { Shop, ProductWithImages, Promotion, Category } from '@/types/models';
import { ShopCard } from '@/components/shop/ShopCard';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatFCFA } from '@/lib/format';

interface HomeScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { profile } = useAuth();
  const { totalUnread } = useNotifications();
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    const [s, p, promos, cats] = await Promise.all([
      getShops({ limit: 8 }),
      getProducts({ limit: 8 }),
      getActivePromotions(),
      getCategories(),
    ]);
    setShops(s);
    setProducts(p);
    setPromotions(promos);
    if (cats.length) setCategories(cats);
    setLoading(false);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filterByCategory = async (catId: string | null) => {
    setActiveCategory(catId);
    const p = await getProducts({ categoryId: catId ?? undefined, limit: 12 });
    setProducts(p);
  };

  if (loading && !loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Bonjour 👋</Text>
                <Text style={styles.userName}>{profile?.full_name ?? 'Bienvenue sur Boutikplus'}</Text>
              </View>
              <Pressable style={styles.bell} onPress={() => navigation.navigate('NotificationCenter')}>
                <Feather name="bell" size={22} color={colors.text} />
                {totalUnread > 0 ? <View style={styles.badgeDot}><Text style={styles.badgeDotText}>{totalUnread > 9 ? '9+' : totalUnread}</Text></View> : null}
              </Pressable>
            </View>

            {/* Invitation à rejoindre la plateforme (visiteurs non connectés) */}
            {!profile ? (
              <View style={styles.guestCard}>
                <Text style={styles.guestTitle}>Achetez et vendez au Faso</Text>
                <Text style={styles.guestText}>
                  Parcourez librement la marketplace. Créez un compte pour commander,
                  discuter avec les vendeurs ou ouvrir votre boutique.
                </Text>
                <View style={styles.guestActions}>
                  <Pressable style={styles.guestPrimary} onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.guestPrimaryText}>Créer mon compte</Text>
                  </Pressable>
                  <Pressable style={styles.guestSecondary} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.guestSecondaryText}>Se connecter</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Search bar */}
            <Pressable
              style={styles.searchBar}
              onPress={() => navigation.navigate('Search')}
            >
              <Feather name="search" size={18} color={colors.textMuted} />
              <Text style={styles.searchPlaceholder}>Rechercher un produit, une boutique...</Text>
            </Pressable>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <Pressable
                style={[styles.catPill, !activeCategory && styles.catPillActive]}
                onPress={() => filterByCategory(null)}
              >
                <Text style={[styles.catPillText, !activeCategory && styles.catPillTextActive]}>Tout</Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.catPill, activeCategory === cat.id && styles.catPillActive]}
                  onPress={() => filterByCategory(cat.id)}
                >
                  <Feather name={cat.icon as any} size={14} color={activeCategory === cat.id ? colors.textInverse : colors.primary} />
                  <Text style={[styles.catPillText, activeCategory === cat.id && styles.catPillTextActive]}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Promotions */}
            {promotions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 Promotions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                  {promotions.map((promo) => (
                    <Pressable
                      key={promo.id}
                      style={styles.promoCard}
                      onPress={() => promo.product && navigation.navigate('ProductDetail', { productId: promo.product.id })}
                    >
                      <View style={styles.promoGradient}>
                        <Text style={styles.promoText}>{promo.promo_text}</Text>
                        <Text style={styles.promoShop}>{promo.shop?.name}</Text>
                      </View>
                      {promo.product?.images?.[0]?.image_url ? (
                        <Image
                          source={{ uri: promo.product.images[0].image_url }}
                          style={styles.promoImg}
                          contentFit="cover"
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Featured shops */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Boutiques en vedette</Text>
                <Pressable onPress={() => navigation.navigate('Search')}>
                  <Text style={styles.seeAll}>Voir tout</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                {shops.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    horizontal
                    onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Produits populaires</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
  userName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.text },
  bell: { position: 'relative', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight },
  badgeDot: { position: 'absolute', top: 6, right: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  badgeDotText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', color: colors.textInverse },
  guestCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
  },
  guestTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
  },
  guestText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  guestActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  guestPrimary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  guestPrimaryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  guestSecondary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  guestSecondaryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
  searchPlaceholder: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
  catScroll: { gap: spacing.sm, marginBottom: spacing.lg, paddingRight: spacing.lg },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text },
  catPillTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md },
  seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  promoCard: { width: 280, height: 130, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row' },
  promoGradient: { flex: 1, backgroundColor: colors.primary, padding: spacing.md, justifyContent: 'center' },
  promoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse, flexShrink: 1 },
  promoShop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  promoImg: { width: 90, height: '100%' },
  gridRow: { gap: spacing.md },
  gridItem: { flex: 1, maxWidth: '50%' },
});
