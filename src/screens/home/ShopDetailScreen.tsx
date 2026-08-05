// Page Boutique — Boutikplus (Site Web Premium Public & Indépendant)
// Redesign inspiré des sites de luxe (LVMH, Shopify Plus, Farfetch) :
// hero parallaxe, CTA flottants, infos pratiques (horaires/contact/réseaux),
// catalogue filtrable responsive, avis clients, footer — accessible SANS
// connexion (chaque boutique = un site web indépendant partageable par URL).

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Animated,
  Dimensions,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { getShop, getProductsByShop, getShopReviews } from '@/lib/dataService';
import { getCategoryName } from '@/constants/categories';
import { shopPublicUrl } from '@/constants/config';
import { ProductCard } from '@/components/product/ProductCard';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonProductGrid } from '@/components/ui/Skeleton';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import {
  TrustBadges,
  calculateTrustBadges,
} from '@/components/growth/TrustBadges';
import { formatFCFA, formatRelativeDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { openWhatsApp, openPhone, openExternalLink } from '@/lib/safeLinking';
import { useAuth } from '@/context/AuthContext';
import type {
  Shop,
  ShopOpeningHours,
  ShopSocialLinks,
  ProductWithImages,
  Review,
} from '@/types/models';

interface ShopDetailScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { shopId: string } };
}

// ---- Helpers horaires d'ouverture ----
type DayKey = keyof ShopOpeningHours;
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lundi',
  tue: 'Mardi',
  wed: 'Mercredi',
  thu: 'Jeudi',
  fri: 'Vendredi',
  sat: 'Samedi',
  sun: 'Dimanche',
};
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function getDayKey(d = new Date()): DayKey {
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[d.getDay()];
}

function parseTimeToMin(t: string): number {
  const parts = t.split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function computeOpenStatus(hours: ShopOpeningHours | null): {
  open: boolean;
  label: string;
} {
  if (!hours) return { open: false, label: 'Horaires non renseignés' };
  const today = hours[getDayKey()];
  if (!today || today.closed) {
    return { open: false, label: "Fermé aujourd'hui" };
  }
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = parseTimeToMin(today.open);
  const closeMin = parseTimeToMin(today.close);
  if (nowMin >= openMin && nowMin <= closeMin) {
    return { open: true, label: `Ouvert · ferme à ${today.close}` };
  }
  if (nowMin < openMin) {
    return { open: false, label: `Fermé · ouvre à ${today.open}` };
  }
  return { open: false, label: 'Fermé' };
}

// ---- Helpers réseaux sociaux ----
function socialUrl(network: keyof ShopSocialLinks, handle: string): string {
  const h = handle.trim();
  if (!h) return '';
  if (h.startsWith('http')) return h;
  const clean = h.replace(/^@/, '');
  switch (network) {
    case 'instagram':
      return `https://instagram.com/${clean}`;
    case 'tiktok':
      return `https://tiktok.com/@${clean}`;
    case 'facebook':
      return `https://facebook.com/${clean}`;
    case 'snapchat':
      return `https://snapchat.com/add/${clean}`;
    default:
      return h;
  }
}

export function ShopDetailScreen({ navigation, route }: ShopDetailScreenProps) {
  const { shopId } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [shop, setShop] = useState<Shop | null>(null);
  useDocumentTitle(shop ? `${shop.name} — Boutikplus` : 'Boutique — Boutikplus');
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');

  // Animation de scroll (parallaxe bannière)
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Layout responsive
  const screenWidth = Dimensions.get('window').width;
  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 640;
  const numCols = isDesktop ? 4 : isTablet ? 3 : 2;
  const containerWidth = Math.min(screenWidth, 1200);
  const cardGap = spacing.md;
  const cardWidth =
    (containerWidth - spacing.lg * 2 - (numCols - 1) * cardGap) / numCols;

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return result;
  }, [products, search, sort]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
          {/* Hero placeholder */}
          <Skeleton width="100%" height={320} borderRadius={0} />
          <View style={[styles.contentContainer, { marginTop: -80 }]}>
            {/* Logo placeholder */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Skeleton width={110} height={110} borderRadius={55} />
              <View style={{ height: spacing.sm }} />
              <Skeleton width={180} height={20} />
              <View style={{ height: spacing.xs }} />
              <Skeleton width={240} height={12} />
            </View>
            {/* CTA row skeleton */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <Skeleton style={{ flex: 1 }} height={42} borderRadius={radius.lg} />
              <Skeleton style={{ flex: 1 }} height={42} borderRadius={radius.lg} />
              <Skeleton style={{ flex: 1 }} height={42} borderRadius={radius.lg} />
            </View>
            {/* Trust badges skeleton */}
            <Skeleton width="100%" height={60} borderRadius={radius.md} />
            <View style={{ height: spacing.lg }} />
            {/* A propos skeleton */}
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <Skeleton width={120} height={16} />
              <Skeleton width="100%" height={12} />
              <Skeleton width="90%" height={12} />
              <Skeleton width="70%" height={12} />
            </View>
            {/* Produits skeleton */}
            <Skeleton width={180} height={18} style={{ marginBottom: spacing.md }} />
            <SkeletonProductGrid count={4} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState icon="alert-circle" title="Boutique introuvable" />
      </SafeAreaView>
    );
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const trustBadges = calculateTrustBadges({
    isVerified: shop.status === 'active',
    averageRating: avgRating || 4,
    totalReviews: reviews.length,
    deliveryDays: 3,
    totalOrders: 10,
    cancellationRate: 0.02,
  });

  const openStatus = computeOpenStatus(shop.opening_hours);
  const waNumber = shop.whatsapp_number ?? shop.phone_number;
  const socials = shop.social_links ?? {};
  const socialEntries = (Object.keys(socials) as (keyof ShopSocialLinks)[]).filter(
    (k) => socials[k],
  );

  // ---- Handlers ----
  const handleContactWhatsApp = async () => {
    if (!waNumber) {
      Alert.alert('Contact indisponible', "Cette boutique n'a pas de numéro WhatsApp.");
      return;
    }
    await openWhatsApp(waNumber, `Bonjour ${shop.name}, je vous contacte depuis Boutikplus.`);
  };

  const handleCall = async () => {
    if (!shop.phone_number) {
      Alert.alert('Appel indisponible', "Cette boutique n'a pas de numéro de téléphone.");
      return;
    }
    await openPhone(shop.phone_number);
  };

  const handleFollow = () => {
    if (!profile) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous pour suivre cette boutique et recevoir ses nouveautés.',
        [
          { text: 'Annuler' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
        ],
      );
      return;
    }
    setFollowing((f) => !f);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🛍️ ${shop.name} sur Boutikplus\n${shop.slogan ?? ''}\n${shopPublicUrl(shop.id)}`,
        title: shop.name,
      });
    } catch {}
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const bannerTranslateY = scrollY.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: [80, 0, -120],
    extrapolate: 'clamp',
  });
  const bannerScale = scrollY.interpolate({
    inputRange: [-300, 0],
    outputRange: [1.25, 1],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [180, 280],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {/* ─── HERO : bannière parallaxe + overlay ─── */}
        <View style={styles.heroWrap}>
          <Animated.View
            style={[
              styles.bannerAnim,
              { transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] },
            ]}
          >
            <Image
              source={{
                uri:
                  shop.banner_url ||
                  shop.logo_url ||
                  'https://dummyimage.com/1200x400/FF6B00/FFFFFF&text=Boutikplus',
              }}
              style={styles.banner}
              contentFit="cover"
              transition={200}
            />
            {/* Overlay sombre haut → bas (lisibilité top bar) */}
            <View style={styles.bannerOverlayTop} pointerEvents="none" />
            <View style={styles.bannerOverlay} pointerEvents="none" />
            {/* Fondu vers le fond karité (transition douce vers le contenu) */}
            <View style={styles.bannerFadeBottom} pointerEvents="none" />
          </Animated.View>

          {/* Top bar flottante (glassmorphism) */}
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <Pressable
              onPress={navigation.goBack}
              style={styles.iconBtn}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={22} color={colors.textInverse} />
            </Pressable>
            <View style={styles.topActions}>
              <Pressable style={styles.iconBtn} hitSlop={12} onPress={handleShare}>
                <Feather name="share-2" size={19} color={colors.textInverse} />
              </Pressable>
              {waNumber ? (
                <Pressable style={styles.iconBtn} hitSlop={12} onPress={handleContactWhatsApp}>
                  <MaterialCommunityIcons name="whatsapp" size={22} color={colors.textInverse} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Header compact au scroll (glassmorphism) */}
          <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]} pointerEvents="none">
            <Text style={styles.stickyTitle} numberOfLines={1}>{shop.name}</Text>
          </Animated.View>

          {/* Logo flottant + identité */}
          <View style={styles.heroIdentity}>
            <View style={styles.logoWrap}>
              <Image
                source={{
                  uri:
                    shop.logo_url ||
                    'https://dummyimage.com/200x200/FF6B00/FFFFFF&text=B',
                }}
                style={styles.logo}
                contentFit="cover"
                transition={200}
              />
              {shop.status === 'active' ? (
                <View style={styles.logoVerified}>
                  <Feather name="check" size={14} color={colors.textInverse} />
                </View>
              ) : null}
            </View>
            <Text style={styles.shopName}>{shop.name}</Text>
            {shop.slogan ? <Text style={styles.slogan}>{shop.slogan}</Text> : null}
            <View style={styles.heroBadges}>
              <View style={styles.badgeChip}>
                <Feather name="map-pin" size={11} color={colors.primary} />
                <Text style={styles.badgeText}>{shop.city}</Text>
              </View>
              <View style={styles.badgeChip}>
                <Feather name="tag" size={11} color={colors.primary} />
                <Text style={styles.badgeText}>{getCategoryName(shop.category_id)}</Text>
              </View>
              {shop.status === 'active' ? (
                <View style={[styles.badgeChip, styles.badgeVerified]}>
                  <Feather name="award" size={11} color={colors.textInverse} />
                  <Text style={styles.badgeTextWhite}>Vérifiée</Text>
                </View>
              ) : null}
              {openStatus.open ? (
                <View style={[styles.badgeChip, styles.badgeOpen]}>
                  <View style={styles.openDot} />
                  <Text style={styles.badgeTextSuccess}>Ouvert</Text>
                </View>
              ) : null}
            </View>
            {avgRating > 0 ? (
              <View style={styles.heroRating}>
                <Rating value={avgRating} size={14} showValue count={reviews.length} />
              </View>
            ) : null}
          </View>
        </View>

        {/* ─── Contenu centré (max-width responsive) ─── */}
        <View style={styles.contentContainer}>
          {/* Breadcrumb repère spatial — essentiel pour les utilisateurs qui arrivent par le lien public de la boutique */}
          <Breadcrumb
            items={[
              { label: 'Accueil', onPress: () => navigation.navigate('Home') },
              { label: 'Boutiques' },
              { label: getCategoryName(shop.category_id) || 'Boutique' },
              { label: shop.name.slice(0, 28), active: true },
            ]}
            style={styles.breadcrumb}
          />

          {/* CTA principale */}
          <View style={styles.ctaRow}>
            <Button
              label={following ? 'Abonné ✓' : 'Suivre'}
              variant={following ? 'outline' : 'primary'}
              size="sm"
              icon={<Feather name={following ? 'check' : 'plus'} size={16} color={following ? colors.primary : colors.textInverse} />}
              onPress={handleFollow}
              style={{ flex: 1 }}
            />
            {waNumber ? (
              <Button
                label="WhatsApp"
                variant="outline"
                size="sm"
                icon={<MaterialCommunityIcons name="whatsapp" size={16} color={colors.success} />}
                onPress={handleContactWhatsApp}
                style={{ flex: 1 }}
              />
            ) : null}
            {shop.phone_number ? (
              <Button
                label="Appeler"
                variant="outline"
                size="sm"
                icon={<Feather name="phone" size={16} color={colors.secondary} />}
                onPress={handleCall}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>

          {/* Trust badges */}
          <View style={styles.trustWrap}>
            <TrustBadges badges={trustBadges} size="sm" />
          </View>

          {/* Fil de Faso — couture séparatrice */}
          <ThreadDivider color={colors.stitch} style={styles.shopThread} />

          {/* ─── À propos ─── */}
          {shop.description ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>À propos</Text>
              </View>
              <Text style={styles.descBody}>{shop.description}</Text>
            </View>
          ) : null}

          {/* ─── Infos pratiques ─── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Infos pratiques</Text>
            </View>

            {/* Statut d'ouverture */}
            {shop.opening_hours && Object.keys(shop.opening_hours).length > 0 ? (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHead}>
                  <Feather name="clock" size={18} color={colors.primary} />
                  <Text style={styles.infoCardTitle}>Horaires d'ouverture</Text>
                  <View
                    style={[
                      styles.openStatusChip,
                      openStatus.open ? styles.openStatusOpen : styles.openStatusClosed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.openStatusText,
                        openStatus.open ? styles.openStatusTextOpen : styles.openStatusTextClosed,
                      ]}
                    >
                      {openStatus.open ? 'Ouvert' : 'Fermé'}
                    </Text>
                  </View>
                </View>
                {DAY_ORDER.map((day) => {
                  const h = shop.opening_hours?.[day];
                  const isToday = day === getDayKey();
                  return (
                    <View
                      key={day}
                      style={[styles.hoursRow, isToday && styles.hoursRowToday]}
                    >
                      <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                        {DAY_LABELS[day]}
                      </Text>
                      <Text style={[styles.hoursValue, isToday && styles.hoursDayToday]}>
                        {!h || h.closed
                          ? 'Fermé'
                          : `${h.open} – ${h.close}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Coordonnées */}
            <View style={styles.contactGrid}>
              {shop.address ? (
                <InfoTile icon="map-pin" label="Adresse" value={shop.address} />
              ) : null}
              {shop.phone_number ? (
                <InfoTile
                  icon="phone"
                  label="Téléphone"
                  value={shop.phone_number}
                  onPress={handleCall}
                />
              ) : null}
              {shop.email ? (
                <InfoTile
                  icon="mail"
                  label="Email"
                  value={shop.email}
                  onPress={() => openExternalLink(`mailto:${shop.email}`)}
                />
              ) : null}
              <InfoTile
                icon="credit-card"
                label="Paiement"
                value={[
                  shop.orange_money_number ? 'Orange Money' : null,
                  shop.moov_money_number ? 'Moov Money' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Non renseigné'}
              />
            </View>

            {/* Réseaux sociaux */}
            {socialEntries.length > 0 ? (
              <View style={styles.socialRow}>
                {socialEntries.map((network) => {
                  const handle = socials[network] as string;
                  const iconMap: Record<keyof ShopSocialLinks, string> = {
                    instagram: 'instagram',
                    tiktok: 'video',
                    facebook: 'facebook',
                    snapchat: 'ghost',
                  };
                  return (
                    <Pressable
                      key={network}
                      style={styles.socialBtn}
                      onPress={() => openExternalLink(socialUrl(network, handle), { requireTrustedHost: true })}
                    >
                      <Feather name={iconMap[network] as any} size={18} color={colors.textInverse} />
                      <Text style={styles.socialText} numberOfLines={1}>
                        {handle.replace(/^@/, '')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* ─── Catalogue ─── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Catalogue · {products.length} produit{products.length > 1 ? 's' : ''}</Text>
              <StampBadge label="Boutique" color={colors.secondaryDeep} size="sm" />
            </View>

            {products.length > 0 ? (
              <>
                {/* Filtres */}
                <View style={styles.filterRow}>
                  <View style={styles.searchBox}>
                    <View style={styles.searchIconWrap}>
                      <Feather name="search" size={16} color={colors.primary} />
                    </View>
                    <TextInput
                      placeholder="Rechercher dans cette boutique..."
                      value={search}
                      onChangeText={setSearch}
                      style={styles.searchInput}
                      placeholderTextColor={colors.textMuted}
                    />
                    {search ? (
                      <Pressable hitSlop={10} onPress={() => setSearch('')} style={styles.searchClear}>
                        <Feather name="x" size={14} color={colors.textInverse} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>Trier :</Text>
                  {([
                    { key: 'recent', label: 'Récents', icon: 'clock' },
                    { key: 'price_asc', label: 'Prix ↑', icon: 'arrow-up' },
                    { key: 'price_desc', label: 'Prix ↓', icon: 'arrow-down' },
                  ] as const).map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={[styles.sortChip, sort === opt.key && styles.sortChipActive]}
                      onPress={() => setSort(opt.key)}
                    >
                      <Feather
                        name={opt.icon as any}
                        size={12}
                        color={sort === opt.key ? colors.textInverse : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.sortChipText,
                          sort === opt.key && styles.sortChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Grille produits responsive */}
                <View style={styles.productGrid}>
                  {filteredProducts.map((p) => (
                    <View key={p.id} style={[styles.productCell, { width: cardWidth, marginBottom: cardGap + spacing.xs }]}>
                      <ProductCard
                        product={p}
                        onPress={() => handleProductPress(p.id)}
                        compact
                      />
                    </View>
                  ))}
                </View>
                {filteredProducts.length === 0 ? (
                  <EmptyState
                    icon="search"
                    title="Aucun résultat"
                    message="Essayez un autre mot-clé."
                  />
                ) : null}
              </>
            ) : (
              <EmptyState
                icon="package"
                title="Aucun produit"
                message="Cette boutique n'a pas encore de produits."
              />
            )}
          </View>

          {/* ─── Avis clients ─── */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Avis clients · {reviews.length}</Text>
            </View>
            {reviews.length > 0 ? (
              <View>
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingSummaryLeft}>
                    <Text style={styles.ratingBig}>{avgRating.toFixed(1)}</Text>
                    <Text style={styles.ratingMax}>/ 5</Text>
                  </View>
                  <View style={styles.ratingSummaryRight}>
                    <View style={styles.ratingStarsRow}>
                      <Rating value={avgRating} size={18} />
                      <View style={styles.ratingPill}>
                        <Feather name="star" size={11} color={colors.warning} />
                        <Text style={styles.ratingPillText}>Avis vérifiés</Text>
                      </View>
                    </View>
                    <Text style={styles.ratingSummaryCount}>
                      Basé sur {reviews.length} avis client{reviews.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.reviewsList}>
                  {reviews.map((r) => (
                    <View key={r.id} style={styles.reviewItem}>
                      <View style={styles.reviewHead}>
                        <View style={styles.avatar}>
                          <Feather name="user" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.reviewNameRow}>
                            <Text style={styles.reviewName}>Client vérifié</Text>
                            <View style={styles.verifiedTick}>
                              <Feather name="check" size={9} color={colors.textInverse} />
                            </View>
                          </View>
                          <Text style={styles.reviewDate}>
                            {formatRelativeDate(r.created_at)}
                          </Text>
                        </View>
                        <Rating value={r.rating} size={14} />
                      </View>
                      {r.comment ? (
                        <Text style={styles.reviewComment}>{r.comment}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState
                icon="star"
                title="Aucun avis"
                message="Soyez le premier à laisser un avis."
              />
            )}
          </View>

          {/* ─── Footer ─── */}
          <View style={styles.footer}>
            <View style={styles.footerBrand}>
              {shop.logo_url ? (
                <Image source={{ uri: shop.logo_url }} style={styles.footerLogo} contentFit="cover" />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.footerName}>{shop.name}</Text>
                {shop.slogan ? (
                  <Text style={styles.footerSlogan} numberOfLines={1}>
                    {shop.slogan}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.footerPowered}>
              <Text style={styles.footerPoweredText}>
                Propulsé par Boutikplus · {new Date().getFullYear()}
              </Text>
              {socialEntries.length > 0 ? (
                <View style={styles.footerSocials}>
                  {socialEntries.map((network) => {
                    const handle = socials[network] as string;
                    const iconMap: Record<keyof ShopSocialLinks, string> = {
                      instagram: 'instagram',
                      tiktok: 'video',
                      facebook: 'facebook',
                      snapchat: 'ghost',
                    };
                    return (
                      <Pressable
                        key={network}
                        style={styles.footerSocialBtn}
                        onPress={() => openExternalLink(socialUrl(network, handle), { requireTrustedHost: true })}
                        hitSlop={8}
                      >
                        <Feather name={iconMap[network] as any} size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ─── Sticky bottom CTA (mobile-first) ─── */}
      {waNumber ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.bottomBarInner}>
            {shop.phone_number ? (
              <Pressable
                style={styles.bottomIconBtn}
                onPress={handleCall}
                hitSlop={8}
                accessibilityLabel="Appeler la boutique"
              >
                <Feather name="phone" size={20} color={colors.secondary} />
              </Pressable>
            ) : null}
            <Button
              label="Contacter sur WhatsApp"
              variant="primary"
              size="md"
              icon={<MaterialCommunityIcons name="whatsapp" size={18} color={colors.textInverse} />}
              onPress={handleContactWhatsApp}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---- Sous-composant : tuile d'info ----
function InfoTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.infoTile} onPress={onPress}>
      <View style={styles.infoTileIcon}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTileLabel}>{label}</Text>
        <Text style={styles.infoTileValue} numberOfLines={2}>{value}</Text>
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // HERO
  heroWrap: {
    position: 'relative',
    height: 400,
    backgroundColor: colors.surfaceAlt,
    paddingBottom: spacing.xl,
  },
  bannerAnim: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  banner: { width: '100%', height: '100%' },
  // Overlay haut : sombre pour lisibilité de la top bar (glassmorphism)
  bannerOverlayTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 140,
    backgroundColor: 'rgba(31,24,40,0.55)',
  },
  // Overlay global : voile moyen pour profondeur
  bannerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(31,24,40,0.25)',
  },
  // Fondu bas : transition douce vers le fond karité (effet gradient)
  bannerFadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0, height: 120,
    backgroundColor: colors.background,
    opacity: 0.85,
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(31,24,40,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 5 },
      default: { boxShadow: '0px 2px 8px rgba(0,0,0,0.3)' },
    }),
  },
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 56,
    backgroundColor: 'rgba(255,248,242,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
      default: { boxShadow: '0px 2px 10px rgba(42,34,48,0.06)' },
    }),
  },
  stickyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: typography.letterSpacings.tight,
  },
  heroIdentity: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceAlt,
    ...shadows.hero,
  },
  // Badge de vérification collé au logo (effet "premium verified")
  logoVerified: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.primaryDeep, shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
      default: { boxShadow: '0px 2px 6px rgba(192,73,30,0.4)' },
    }),
  },
  shopName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.mega,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: typography.letterSpacings.tight,
  },
  slogan: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  badgeVerified: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDeep,
  },
  badgeTextWhite: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  badgeOpen: { backgroundColor: '#E6F7EE', borderColor: colors.success },
  badgeTextSuccess: { color: colors.success, fontWeight: typography.weights.semibold },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  heroRating: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  // CONTENT
  contentContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  breadcrumb: { marginBottom: spacing.lg },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  trustWrap: {
    marginBottom: spacing.lg,
  },
  shopThread: { alignSelf: 'center', marginBottom: spacing.lg },
  // SECTIONS
  section: { marginBottom: spacing.xl },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionAccent: {
    width: 5,
    height: 22,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: { shadowColor: colors.primaryDeep, shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
      default: { boxShadow: '0px 2px 5px rgba(192,73,30,0.35)' },
    }),
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
    flex: 1,
  },
  descBody: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 24,
  },
  // INFOS PRATIQUES
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.fani,
  },
  infoCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoCardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  openStatusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  openStatusOpen: { backgroundColor: '#E6F7EE' },
  openStatusClosed: { backgroundColor: '#FDECEC' },
  openStatusText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  openStatusTextOpen: { color: colors.success },
  openStatusTextClosed: { color: colors.danger },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  hoursRowToday: {
    backgroundColor: '#FFF7F0',
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  hoursDay: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  hoursValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  hoursDayToday: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexGrow: 1,
    flexBasis: '47%',
    ...shadows.fani,
  },
  infoTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTileLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoTileValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryDeep,
    ...shadows.fani,
  },
  socialText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
    maxWidth: 100,
  },
  // CATALOGUE
  filterRow: { marginBottom: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    paddingVertical: 4,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  sortLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacings.wide,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDeep,
  },
  sortChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  sortChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productCell: {
    ...shadows.fani,
    borderRadius: radius.lg,
  },
  // AVIS
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    ...shadows.fani,
  },
  ratingSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ratingBig: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.ultra,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
    letterSpacing: typography.letterSpacings.tight,
    lineHeight: 56,
  },
  ratingMax: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  ratingSummaryRight: { flex: 1, gap: spacing.xs },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF6E5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FBE3B3',
  },
  ratingPillText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.warning,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacings.wide,
  },
  ratingSummaryCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  reviewsList: { gap: spacing.md },
  reviewItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  verifiedTick: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  reviewComment: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 22,
  },
  // FOOTER
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
    paddingBottom: 100, // laisse de la place au bottom CTA
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  footerName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  footerSlogan: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footerPowered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerPoweredText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    flex: 1,
  },
  footerSocials: { flexDirection: 'row', gap: spacing.sm },
  footerSocialBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // BOTTOM CTA
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'rgba(255,248,242,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 12 },
      default: { boxShadow: '0px -6px 20px rgba(42,34,48,0.12)' },
    }),
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomIconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fani,
  },
});
