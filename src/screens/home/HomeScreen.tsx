import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { MasonryFlashList } from '@shopify/flash-list';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import type { UserRole } from '@/types/models';
import { CATEGORIES } from '@/constants/categories';
import { getShops, getProducts, getActivePromotions, getCategories } from '@/lib/dataService';
import type { Shop, ProductWithImages, Promotion, Category } from '@/types/models';
import { ShopCard } from '@/components/shop/ShopCard';
import { ProductCard } from '@/components/product/ProductCard';
import { Skeleton, SkeletonProductGrid, SkeletonShopRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { HeroBanner } from '@/components/home/HeroBanner';
import { TrustBand } from '@/components/home/TrustBand';
import { ValueProps } from '@/components/home/ValueProps';
import { HowItWorks } from '@/components/home/HowItWorks';
import { SellerCtaBanner } from '@/components/home/SellerCtaBanner';
import { formatFCFA } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { getProductGridLayout } from '@/lib/responsiveGrid';
// __BTIK_HOME_SIG__ : Marqueur de propriété DICKO Christ Steve
// Voir src/lib/ownership.ts -> STEG_MARKERS
export const __BTIK_HOME_SIG__ = '308fd9f1f29b844ece48094128e1ad1d';

interface HomeScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack?: () => void };
}

/** Helper : est-ce que l'utilisateur a déjà le rôle driver ? */
function hasRole(profile: { roles?: UserRole[]; primary_role?: UserRole; role?: UserRole } | null, role: UserRole): boolean {
  if (!profile) return false;
  if (Array.isArray(profile.roles) && profile.roles.includes(role)) return true;
  if (profile.primary_role === role) return true;
  if (profile.role === role) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Memoised sub-components to cut re-renders                         */
/* ------------------------------------------------------------------ */

const CategoryPill = memo(function CategoryPill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.catPill, active && styles.catPillActive]} onPress={onPress}>
      {icon ? (
        <Feather name={icon as any} size={14} color={active ? colors.textInverse : colors.primary} />
      ) : null}
      <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{label}</Text>
    </Pressable>
  );
});

const PromoCard = memo(function PromoCard({
  promo,
  onPress,
}: {
  promo: Promotion;
  onPress: () => void;
}) {
  const imgUri = promo.image_url ?? promo.product?.images?.[0]?.image_url;
  return (
    <Pressable style={styles.promoCard} onPress={onPress}>
      <View style={styles.promoGradient}>
        <Text style={styles.promoText}>{promo.promo_text}</Text>
        {promo.shop?.name ? <Text style={styles.promoShop}>{promo.shop.name}</Text> : null}
      </View>
      {imgUri ? (
        <Image source={{ uri: imgUri }} style={styles.promoImg} contentFit="cover" />
      ) : null}
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/*  Main screen                                                       */
/* ------------------------------------------------------------------ */

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { profile, switchPrimaryRole } = useAuth();
  const { totalUnread } = useNotifications();
  useDocumentTitle('Boutikplus — Achetez local au Burkina Faso');

  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [becomingDriver, setBecomingDriver] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const productRequestId = useRef(0);
  const activeCategoryRef = useRef<string | null>(null);

  const gridLayout = getProductGridLayout(containerWidth);
  const { columns: numColumns, gap: gridGap, sidePadding: pagePadding } = gridLayout;
  const ProductList: any = Platform.OS === 'web' ? FlatList : MasonryFlashList;

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  /* ---------- data loading ---------- */

  const loadData = useCallback(async () => {
    const requestId = ++productRequestId.current;
    setError(null);
    try {
      const [s, p, promos, cats] = await Promise.all([
        getShops({ limit: 8 }),
        getProducts({ categoryId: activeCategoryRef.current ?? undefined, limit: 12 }),
        getActivePromotions(),
        getCategories(),
      ]);
      setShops(s);
      if (requestId === productRequestId.current) setProducts(p);
      setPromotions(promos);
      if (cats.length) setCategories(cats);
    } catch {
      setError('Impossible de charger les nouveautés pour le moment. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  /* ---------- category filter ---------- */

  const filterByCategory = useCallback(async (catId: string | null) => {
    activeCategoryRef.current = catId;
    setActiveCategory(catId);
    setFiltering(true);
    setError(null);
    const requestId = ++productRequestId.current;
    try {
      const nextProducts = await getProducts({ categoryId: catId ?? undefined, limit: 12 });
      if (requestId === productRequestId.current) setProducts(nextProducts);
    } catch {
      if (requestId === productRequestId.current) {
        setError("Impossible d'appliquer ce filtre. Réessayez dans un instant.");
      }
    } finally {
      if (requestId === productRequestId.current) setFiltering(false);
    }
  }, []);

  /* ---------- driver CTA ---------- */

  const onPressBecomeDriver = async () => {
    if (!profile) {
      navigation.navigate('Register');
      return;
    }
    if (hasRole(profile, 'driver')) {
      navigation.navigate('DriverDashboard');
      return;
    }
    setBecomingDriver(true);
    try {
      const { error } = await switchPrimaryRole('driver');
      if (error) {
        Alert.alert(
          "Presque ! 🚚",
          `On n'a pas pu t'ajouter le rôle livreur tout de suite.\nRaison : ${error}\n\nTu peux quand même commencer l'inscription livreur.`,
        );
      }
      navigation.navigate('DriverRegistration');
    } finally {
      setBecomingDriver(false);
    }
  };

  /* ---------- skeleton ---------- */

  if (loading && !loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.skeletonWrap, { paddingHorizontal: pagePadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Skeleton hero (gradient placeholder) */}
          <Skeleton width="100%" height={190} borderRadius={radius.xxl} />
          <View style={{ height: spacing.md }} />
          {/* Skeleton trust band */}
          <Skeleton width="100%" height={58} borderRadius={radius.lg} />
          <View style={{ height: spacing.sm }} />
          {/* Skeleton search */}
          <Skeleton width="100%" height={44} borderRadius={radius.xl} />
          <View style={{ height: spacing.sm }} />
          {/* Skeleton categories */}
          <View style={styles.catScrollSkeleton}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width={64 + i * 8} height={30} borderRadius={radius.pill} />
            ))}
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Skeleton width={160} height={16} />
              <Skeleton width={50} height={12} />
            </View>
            <SkeletonShopRow />
          </View>
          <SkeletonProductGrid count={numColumns * 2} numColumns={numColumns} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------- seller CTA ---------- */

  const alreadyDriver = hasRole(profile, 'driver');
  const alreadySeller = hasRole(profile, 'seller');

  const onPressSeller = async () => {
    if (!profile) {
      navigation.navigate('Register');
      return;
    }
    if (alreadySeller) {
      navigation.navigate('SellerDashboard');
      return;
    }
    try {
      const { error } = await switchPrimaryRole('seller');
      if (error) {
        Alert.alert('Presque ! 💼', `Le rôle vendeur n'a pas pu être ajouté tout de suite.\nRaison : ${error}`);
      }
      navigation.navigate('CreateShop');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Problème réseau');
    }
  };

  /* ---------- render ---------- */

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }} onLayout={handleContainerLayout}>
        {containerWidth > 0 ? <ProductList
          key={`home-${numColumns}`}
          data={products}
          keyExtractor={(item: ProductWithImages) => item.id}
          numColumns={numColumns}
          estimatedItemSize={250}
          estimatedFirstItemOffset={1}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingBottom: 100,
            paddingHorizontal: pagePadding,
          }}
          onEndReachedThreshold={0.4}
          drawDistance={256}
          ListHeaderComponent={
            <View>
              {/* ---- Hero banner (rétention visiteur) ---- */}
              <HeroBanner
                isAuthenticated={Boolean(profile)}
                userName={profile?.full_name ? profile.full_name.split(' ')[0] : undefined}
                onPrimaryCta={() => {
                  if (profile) {
                    // Utilisateur connecté : explorer les produits (reste sur Home, scroll).
                  } else {
                    navigation.navigate('Register');
                  }
                }}
                onSecondaryCta={() => navigation.navigate('Search')}
                headerRight={
                  <Pressable
                    style={styles.heroBell}
                    onPress={() => navigation.navigate('NotificationCenter')}
                    accessibilityRole="button"
                    accessibilityLabel="Notifications"
                    accessibilityHint="Ouvre le centre de notifications"
                  >
                    <Feather name="bell" size={18} color={colors.textInverse} />
                    {totalUnread > 0 ? (
                      <View style={styles.badgeDot}>
                        <Text style={styles.badgeDotText}>
                          {totalUnread > 9 ? '9+' : totalUnread}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                }
              />

              {/* ---- Trust band (preuve sociale) ---- */}
              <TrustBand />

              {/* ---- Search bar ---- */}
              <Pressable
                style={styles.searchBar}
                onPress={() => navigation.navigate('Search')}
                accessibilityRole="search"
                accessibilityLabel="Rechercher"
                accessibilityHint="Rechercher un produit ou une boutique"
              >
                <Feather name="search" size={18} color={colors.textMuted} />
                <Text style={styles.searchPlaceholder}>Rechercher un produit, une boutique...</Text>
              </Pressable>

              {/* ---- Category pills ---- */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catScroll}
              >
                <CategoryPill label="Tout" active={!activeCategory} onPress={() => filterByCategory(null)} />
                {categories.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    label={cat.name}
                    icon={cat.icon}
                    active={activeCategory === cat.id}
                    onPress={() => filterByCategory(cat.id)}
                  />
                ))}
              </ScrollView>

              {/* ---- Promotions carousel ---- */}
              {promotions.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Feather name="zap" size={16} color={colors.danger} />
                    <Text style={styles.sectionTitle}>Promotions</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm }}
                  >
                    {promotions.map((promo) => (
                      <PromoCard
                        key={promo.id}
                        promo={promo}
                        onPress={() =>
                          promo.product && navigation.navigate('ProductDetail', { productId: promo.product.id })
                        }
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* ---- Featured shops ---- */}
              <View style={styles.section}>
                <View style={styles.featuredShopsHeader}>
                  <View style={styles.sectionTitleRowInline}>
                    <Feather name="award" size={16} color={colors.gold} />
                    <Text style={styles.sectionTitle}>Boutiques en vedette</Text>
                  </View>
                  <Pressable
                    onPress={() => navigation.navigate('Search')}
                    accessibilityRole="button"
                    accessibilityLabel="Voir toutes les boutiques"
                  >
                    <Text style={styles.seeAll}>Voir tout</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shopRowContent}
                >
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

              {/* ---- Section dédiée : Boutique WILLARIS PRIME BF ---- */}
              {shops.find((s) => s.name === 'WILLARIS PRIME BF') && (
                <View style={styles.section}>
                  <View style={styles.featuredShopsHeader}>
                    <View style={styles.sectionTitleRowInline}>
                      <Feather name="shopping-bag" size={16} color={colors.primary} />
                      <Text style={styles.sectionTitle}>Boutique WILLARIS PRIME</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        const shop = shops.find((s) => s.name === 'WILLARIS PRIME BF');
                        if (shop) navigation.navigate('ShopDetail', { shopId: shop.id });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Voir la boutique WILLARIS PRIME BF"
                    >
                      <Text style={styles.seeAll}>Voir la boutique</Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.shopRowContent}
                  >
                    {products
                      .filter((p) => {
                        const willaris = shops.find((s) => s.name === 'WILLARIS PRIME BF');
                        return willaris && p.shop_id === willaris.id;
                      })
                      .slice(0, 6)
                      .map((product) => (
                        <View key={product.id} style={styles.willarisProductCard}>
                          <ProductCard
                            product={product}
                            compact
                            onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                          />
                        </View>
                      ))}
                  </ScrollView>
                </View>
              )}

              {/* ---- Products section header ---- */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Feather name="trending-up" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Produits populaires</Text>
                </View>
                {error ? (
                  <EmptyState
                    icon="wifi-off"
                    title="Chargement impossible"
                    message={error}
                    variant="section"
                    action={<Button label="Réessayer" onPress={loadData} size="sm" />}
                  />
                ) : products.length === 0 && !filtering ? (
                  <EmptyState
                    icon="package"
                    title={activeCategory ? 'Aucun produit dans cette catégorie' : 'Aucun produit disponible'}
                    message={
                      activeCategory
                        ? 'Essayez une autre catégorie ou affichez tous les produits.'
                        : 'Revenez bientôt pour découvrir les nouveautés.'
                    }
                    variant="section"
                    action={
                      activeCategory ? (
                        <Button label="Voir tous les produits" onPress={() => filterByCategory(null)} size="sm" />
                      ) : undefined
                    }
                  />
                ) : null}
              </View>

              {/* ---- Driver pill (subtle) ---- */}
              <Pressable
                onPress={onPressBecomeDriver}
                style={({ pressed }) => [styles.driverPill, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Devenir livreur et gagner de l'argent"
              >
                <Feather name="truck" size={14} color={colors.success} />
                <Text style={styles.driverPillText} numberOfLines={1}>
                  {becomingDriver
                    ? 'Inscription…'
                    : alreadyDriver
                      ? 'Mon espace livreur'
                      : 'Devenir livreur · Revenus flexibles'}
                </Text>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          }
          ListFooterComponent={
            !profile ? (
              <View style={styles.footer}>
                <ValueProps />
                <HowItWorks onStart={() => navigation.navigate('Register')} />
                <SellerCtaBanner onPress={() => navigation.navigate('Register')} />
              </View>
            ) : null
          }
          renderItem={({ item, index }: { item: ProductWithImages; index: number }) => (
            <View
              style={[
                styles.gridItem,
                {
                  paddingLeft: numColumns === 1 || index % numColumns === 0 ? 0 : gridGap / 2,
                  paddingRight: numColumns === 1 || index % numColumns === numColumns - 1 ? 0 : gridGap / 2,
                  paddingBottom: gridGap,
                },
              ]}
            >
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              />
            </View>
          )}
        /> : null}

        {/* ---- Floating seller FAB ---- */}
        {profile && (
          <Pressable
            style={({ pressed }) => [styles.sellerFab, pressed && { opacity: 0.85 }]}
            onPress={onPressSeller}
            accessibilityRole="button"
            accessibilityLabel={alreadySeller ? "Mon espace vendeur" : "Devenir vendeur"}
          >
            <Feather name={alreadySeller ? "briefcase" : "plus"} size={18} color={colors.textInverse} />
            <Text style={styles.sellerFabText} numberOfLines={1}>
              {alreadySeller ? "Mon espace vendeur" : "Devenir vendeur"}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* skeleton */
  skeletonWrap: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
  catScrollSkeleton: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },

  /* hero bell (à l'intérieur du HeroBanner) */
  heroBell: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeDotText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', color: colors.textInverse },

  /* footer rétention (visiteurs) */
  footer: { paddingTop: spacing.xl, paddingBottom: spacing.sm },

  /* search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    ...shadows.fani,
  },
  searchPlaceholder: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },

  /* categories */
  catScroll: { gap: spacing.xs, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  catPillActive: { backgroundColor: colors.accentDeep, ...shadows.subtle },
  catPillText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  catPillTextActive: { color: colors.textInverse, fontWeight: typography.weights.bold },

  /* sections */
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitleRowInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  featuredShopsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  shopRowContent: { gap: spacing.sm, paddingVertical: spacing.xs },
   seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.accentDeep, fontWeight: typography.weights.bold },

   /* Section dédiée WILLARIS PRIME — cartes produits en scroll horizontal */
   willarisProductCard: { width: 160, flex: 0 },

  /* promotions */
  promoCard: { width: 260, height: 120, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row' },
  promoGradient: { flex: 1, backgroundColor: colors.primary, padding: spacing.sm + 2, justifyContent: 'center' },
  promoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse, flexShrink: 1 },
  promoShop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  promoImg: { width: 80, height: '100%' },

  /* driver pill */
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSurface,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  driverPillText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.accentText,
  },

  /* grid */
  gridItem: { flex: 1 },

  /* seller FAB */
  sellerFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl + 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    ...shadows.fani,
    minHeight: 44,
  },
  sellerFabText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
});
