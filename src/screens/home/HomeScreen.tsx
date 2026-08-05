import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { MasonryFlashList } from '@shopify/flash-list';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import type { UserRole } from '@/types/models';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { getShops, getProducts, getActivePromotions, getCategories } from '@/lib/dataService';
import type { Shop, ProductWithImages, Promotion, Category } from '@/types/models';
import { ShopCard } from '@/components/shop/ShopCard';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { Skeleton, SkeletonProductGrid, SkeletonShopRow } from '@/components/ui/Skeleton';
import { formatFCFA } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
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
  const [becomingDriver, setBecomingDriver] = useState(false);

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

  /**
   * Gestion CTA "Devenir Livreur" :
   *  - visiteur déconnecté → RegisterScreen (où il trouvera la carte promo livreur)
   *  - connecté SANS rôle driver → switchPrimaryRole('driver') (ajoute auto. driver dans roles[])
   *    puis DriverRegistration pour compléter profil véhicule/tarifs.
   *  - connecté AVEC rôle driver → DriverDashboard (tableau de bord livraisons)
   */
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

  if (loading && !loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.skeletonWrap} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Skeleton width={120} height={14} />
              <View style={{ height: 4 }} />
              <Skeleton width={180} height={22} />
            </View>
            <Skeleton width={44} height={44} borderRadius={22} />
          </View>
          <Skeleton width="100%" height={48} borderRadius={radius.lg} />
          <View style={{ height: spacing.md }} />
          <View style={styles.catScrollSkeleton}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width={70 + i * 10} height={32} borderRadius={radius.pill} />
            ))}
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Skeleton width={180} height={18} />
              <Skeleton width={60} height={12} />
            </View>
            <SkeletonShopRow />
          </View>
          <SkeletonProductGrid count={4} />
        </ScrollView>
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }}>
      <MasonryFlashList<ProductWithImages>
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        estimatedItemSize={250}
        estimatedFirstItemOffset={1}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        drawDistance={256}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Bonjour 👋</Text>
                <Text style={styles.userName}>{profile?.full_name ?? 'Cher acheteur'}</Text>
              </View>
              <Pressable
                style={styles.bell}
                onPress={() => navigation.navigate('NotificationCenter')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                accessibilityHint="Ouvre le centre de notifications"
              >
                <Feather name="bell" size={22} color={colors.text} />
                {totalUnread > 0 ? <View style={styles.badgeDot}><Text style={styles.badgeDotText}>{totalUnread > 9 ? '9+' : totalUnread}</Text></View> : null}
              </Pressable>
            </View>

            {/* Fil de Faso — fil de couture sous l'en-tête */}
            <ThreadDivider color={colors.stitch} style={styles.headerThread} />

            {/* Search bar */}
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

            {/* Pilule livreur discrète — l'entrée principale est dans Profil */}
            <Pressable
              onPress={onPressBecomeDriver}
              style={({ pressed }) => [styles.driverPill, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Devenir livreur et gagner de l'argent"
            >
              <Feather name="truck" size={15} color={colors.success} />
              <Text style={styles.driverPillText} numberOfLines={1}>
                {becomingDriver ? 'Inscription…' : alreadyDriver ? 'Mon espace livreur' : 'Devenir livreur · Revenus flexibles'}
              </Text>
              <Feather name="chevron-right" size={15} color={colors.textMuted} />
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
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>🔥 Promotions</Text>
                  <StampBadge label="En cours" color={colors.primaryDeep} size="sm" />
                </View>
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
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Boutiques en vedette</Text>
                  <StampBadge label="Top" color={colors.secondaryDeep} size="sm" />
                </View>
                <Pressable
                  onPress={() => navigation.navigate('Search')}
                  accessibilityRole="button"
                  accessibilityLabel="Voir toutes les boutiques"
                >
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

            {/* Fil de Faso — séparateur de section */}
            <ThreadDivider color={colors.stitch} style={styles.sectionThread} />

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Produits populaires</Text>
                <StampBadge label="Tendance" color={colors.primaryDeep} size="sm" />
              </View>
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
      />

      {/* Bouton flottant : Mon espace vendeur */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeletonWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  greeting: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
  userName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  bell: { position: 'relative', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.stitch },
  badgeDot: { position: 'absolute', top: 6, right: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  badgeDotText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', color: colors.textInverse },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg + 4, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg + 4, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.lg, borderWidth: 0, ...shadows.fani },
  searchPlaceholder: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
  catScroll: { gap: spacing.sm, marginBottom: spacing.lg, paddingLeft: spacing.lg },
  catScrollSkeleton: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopLeftRadius: radius.pill + 2, borderTopRightRadius: radius.pill, borderBottomLeftRadius: radius.pill, borderBottomRightRadius: radius.pill + 2, backgroundColor: colors.surface, borderWidth: 0, ...shadows.fani },
  catPillActive: { backgroundColor: colors.primaryDeep },
  catPillText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text, letterSpacing: typography.letterSpacings.wide },
  catPillTextActive: { color: colors.textInverse, fontWeight: typography.weights.bold },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  promoCard: { width: 280, height: 130, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row' },
  promoGradient: { flex: 1, backgroundColor: colors.primary, padding: spacing.md, justifyContent: 'center' },
  promoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textInverse, flexShrink: 1 },
  promoShop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  promoImg: { width: 90, height: '100%' },

  /* Fil de Faso — fils de couture signature */
  headerThread: { marginBottom: spacing.md, alignSelf: 'center' },
  sectionThread: { marginVertical: spacing.lg, alignSelf: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },

  /* Pilule livreur discrète — entrée secondaire, l'entrée principale est dans Profil */
  driverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceDeep,
    borderTopLeftRadius: radius.pill + 2,
    borderTopRightRadius: radius.pill,
    borderBottomLeftRadius: radius.pill,
    borderBottomRightRadius: radius.pill + 2,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 0,
  },
  driverPillText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    letterSpacing: typography.letterSpacings.wide,
  },

  gridRow: { gap: spacing.md },
  gridItem: { width: '100%' },
  sellerFab: {
    position: 'absolute',
    right: spacing.lg,
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
