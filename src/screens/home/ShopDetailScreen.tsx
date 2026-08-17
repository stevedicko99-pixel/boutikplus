import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AdaptiveImage } from '@/components/ui/AdaptiveImage';
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
import { formatRelativeDate } from '@/lib/format';
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

type DayKey = keyof ShopOpeningHours;
const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi',
  fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
};
const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PAGE_SIZE = 24;
const isNarrow = Dimensions.get('window').width < 360;

function getDayKey(date = new Date()): DayKey {
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[date.getDay()];
}

function parseTimeToMin(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function computeOpenStatus(hours: ShopOpeningHours | null) {
  if (!hours) return { open: false, label: 'Horaires non renseignés' };
  const today = hours[getDayKey()];
  if (!today || today.closed) return { open: false, label: "Fermé aujourd'hui" };
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= parseTimeToMin(today.open) && current <= parseTimeToMin(today.close)) {
    return { open: true, label: `Ouvert · ferme à ${today.close}` };
  }
  if (current < parseTimeToMin(today.open)) return { open: false, label: `Fermé · ouvre à ${today.open}` };
  return { open: false, label: 'Fermé' };
}

function socialUrl(network: keyof ShopSocialLinks, handle: string) {
  const clean = handle.trim();
  if (clean.startsWith('http')) return clean;
  const name = clean.replace(/^@/, '');
  const roots: Record<keyof ShopSocialLinks, string> = {
    instagram: 'https://instagram.com/',
    tiktok: 'https://tiktok.com/@',
    facebook: 'https://facebook.com/',
    snapchat: 'https://snapchat.com/add/',
  };
  return `${roots[network]}${name}`;
}

export function ShopDetailScreen({ navigation, route }: ShopDetailScreenProps) {
  const { shopId } = route.params;
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [contentWidth, setContentWidth] = useState(0);

  useDocumentTitle(shop ? `${shop.name} — Boutikplus` : 'Boutique — Boutikplus');

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextShop, nextProducts, nextReviews] = await Promise.all([
        getShop(shopId), getProductsByShop(shopId), getShopReviews(shopId),
      ]);
      setShop(nextShop);
      setProducts(nextProducts);
      setReviews(nextReviews);
      if (!nextShop) setError('Cette boutique est introuvable ou indisponible.');
    } catch {
      setError('Impossible de charger la boutique. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void loadShop();
  }, [loadShop]);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, sort]);

  // Use window width directly for column calculation (more reliable on mobile web)
  const effectiveWidth = width;
  // Shopify Mobile style: 1 column on mobile, 2 on tablet, 3 on desktop
  const columns = effectiveWidth < 600 ? 1 : effectiveWidth < 1024 ? 2 : 3;
  const sidePadding = effectiveWidth < 600 ? 16 : effectiveWidth < 1024 ? 24 : 32;
  const gap = effectiveWidth < 600 ? 16 : 20;
  const availableWidth = Math.max(0, effectiveWidth - sidePadding * 2);
  const cardWidth = Math.max(0, (availableWidth - gap * (columns - 1)) / columns);
  const isNarrow = effectiveWidth < 360;
  const isTablet = effectiveWidth >= 600;
  const isDesktop = effectiveWidth >= 1024;
  const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setContentWidth((current) => current === nextWidth ? current : nextWidth);
  }, []);
  const heroHeight = isDesktop ? Math.min(600, height * 0.7) : isTablet ? 420 : isNarrow ? 280 : 340;

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = products.filter((product) =>
      !query || product.name.toLowerCase().includes(query) || product.description?.toLowerCase().includes(query),
    );
    if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [products, search, sort]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView accessibilityLabel="Chargement de la boutique" contentContainerStyle={styles.loadingContent}>
          <Skeleton width="100%" height={isNarrow ? 300 : 380} borderRadius={0} />
          <View style={[styles.content, { paddingHorizontal: sidePadding }]} onLayout={handleContentLayout}>
            <Skeleton width="55%" height={30} />
            <Skeleton width="80%" height={14} style={styles.skeletonLine} />
            <Skeleton width="100%" height={52} borderRadius={radius.sm} style={styles.skeletonBlock} />
            <SkeletonProductGrid count={columns * 2} numColumns={columns} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorState} accessibilityRole="alert">
          <Feather name="wifi-off" size={32} color={colors.primaryDeep} />
          <Text accessibilityRole="header" style={styles.errorTitle}>Boutique indisponible</Text>
          <Text style={styles.errorText}>{error ?? 'Cette boutique est introuvable.'}</Text>
          <Button label="Réessayer" onPress={loadShop} accessibilityHint="Recharge les informations de la boutique" />
          <Button label="Retour" variant="ghost" onPress={navigation.goBack} />
        </View>
      </SafeAreaView>
    );
  }

  const avgRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
  const openStatus = computeOpenStatus(shop.opening_hours);
  const waNumber = shop.whatsapp_number ?? shop.phone_number;
  const socials = shop.social_links ?? {};
  const socialEntries = (Object.keys(socials) as (keyof ShopSocialLinks)[]).filter((key) => socials[key]);
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const handleContactWhatsApp = async () => {
    if (!waNumber) return;
    await openWhatsApp(waNumber, `Bonjour ${shop.name}, je vous contacte depuis Boutikplus.`);
  };
  const handleCall = async () => {
    if (!shop.phone_number) return;
    await openPhone(shop.phone_number);
  };
  const handleFollow = () => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connectez-vous pour suivre cette boutique et recevoir ses nouveautés.', [
        { text: 'Annuler' },
        { text: 'Se connecter', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    setFollowing((current) => !current);
  };
  const handleShare = async () => {
    try {
      await Share.share({ message: `${shop.name} sur Boutikplus\n${shop.slogan ?? ''}\n${shopPublicUrl(shop.id)}`, title: shop.name });
    } catch {}
  };

  const primaryLabel = waNumber ? 'Contacter la boutique' : following ? 'Boutique suivie' : 'Suivre la boutique';
  const primaryAction = waNumber ? handleContactWhatsApp : handleFollow;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.xl) }}>
        <View style={[styles.hero, { height: heroHeight }]}>
          {shop.banner_url || shop.logo_url ? (
            <AdaptiveImage
              uri={shop.banner_url || shop.logo_url || ''}
              role="hero"
              displayWidth={width}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={`${shop.id}-hero`}
              accessibilityLabel={`Photo de couverture de ${shop.name}`}
            />
          ) : <View style={[StyleSheet.absoluteFill, styles.heroFallback]} />}
          <LinearGradient colors={['rgba(20,16,22,0.22)', 'rgba(20,16,22,0.08)', 'rgba(20,16,22,0.78)']} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTopBar, { paddingTop: insets.top + spacing.sm, paddingHorizontal: sidePadding }]}>
            <IconControl icon="arrow-left" label="Revenir à l’écran précédent" onPress={navigation.goBack} />
            <View style={styles.actionRow}>
              <IconControl icon="share-2" label="Partager la boutique" onPress={handleShare} />
              <IconControl icon={following ? 'heart' : 'heart'} label={following ? 'Ne plus suivre la boutique' : 'Suivre la boutique'} onPress={handleFollow} selected={following} />
            </View>
          </View>
          <View style={[styles.heroCopy, { paddingHorizontal: sidePadding, maxWidth: isDesktop ? 760 : 620 }]}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>{getCategoryName(shop.category_id)} · {shop.city}</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.shopName, isNarrow && styles.shopNameNarrow]}>{shop.name}</Text>
            {shop.slogan ? <Text style={styles.slogan}>{shop.slogan}</Text> : null}
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaChip}>
                <View style={[styles.statusDot, { backgroundColor: openStatus.open ? colors.success : colors.textInverse }]} />
                <Text style={styles.heroMetaText}>{openStatus.label}</Text>
              </View>
              {shop.is_verified ? (
                <View style={styles.verifiedChip}>
                  <Feather name="shield" size={13} color={colors.goldLight} />
                  <Text style={styles.verifiedChipText}>Boutique vérifiée</Text>
                </View>
              ) : null}
              {avgRating > 0 ? <Rating value={avgRating} count={reviews.length} size={15} inverse /> : null}
            </View>
          </View>
          <View style={[styles.heroGlassCard, { marginHorizontal: sidePadding }]}>
            <View style={styles.glassItem}>
              <Feather name="package" size={18} color={colors.primaryDeep} />
              <View style={styles.glassItemText}>
                <Text style={styles.glassItemValue}>{products.length}</Text>
                <Text style={styles.glassItemLabel}>Produits</Text>
              </View>
            </View>
            <View style={styles.glassDivider} />
            <View style={styles.glassItem}>
              <Feather name="star" size={18} color={colors.primaryDeep} />
              <View style={styles.glassItemText}>
                <Text style={styles.glassItemValue}>{reviews.length ? avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.glassItemLabel}>Note</Text>
              </View>
            </View>
            <View style={styles.glassDivider} />
            <View style={styles.glassItem}>
              <Feather name="message-circle" size={18} color={colors.primaryDeep} />
              <View style={styles.glassItemText}>
                <Text style={styles.glassItemValue}>{reviews.length}</Text>
                <Text style={styles.glassItemLabel}>Avis</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.content, { paddingHorizontal: sidePadding }]} onLayout={handleContentLayout}>
          <View style={[styles.primaryCta, isTablet && styles.primaryCtaWide]}>
            <Button
              label={primaryLabel}
              onPress={primaryAction}
              size="lg"
              fullWidth={!isTablet}
              icon={waNumber ? <MaterialCommunityIcons name="whatsapp" size={20} color={colors.textInverse} /> : <Feather name="heart" size={19} color={colors.textInverse} />}
              accessibilityHint={waNumber ? 'Ouvre une conversation WhatsApp avec la boutique' : 'Ajoute cette boutique à vos abonnements'}
            />
            {shop.phone_number ? <Button label="Appeler" variant="outline" size="lg" onPress={handleCall} icon={<Feather name="phone" size={18} color={colors.primaryDeep} />} /> : null}
          </View>

          <SectionHeader title={`Catalogue (${products.length})`} subtitle="Une sélection proposée directement par la boutique." />
          {products.length ? (
            <>
              <View style={[styles.catalogControls, isTablet && styles.catalogControlsWide]}>
                <View style={styles.searchBox}>
                  <Feather name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    accessibilityLabel="Rechercher dans le catalogue"
                    placeholder="Rechercher un produit"
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  {search ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" hitSlop={10} onPress={() => setSearch('')}>
                      <Feather name="x" size={18} color={colors.text} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.sortGroup} accessibilityRole="radiogroup" accessibilityLabel="Trier les produits">
                  {([
                    ['recent', 'Récents'], ['price_asc', 'Prix croissant'], ['price_desc', 'Prix décroissant'],
                  ] as const).map(([key, label]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityLabel={`Tri : ${label}`}
                      accessibilityState={{ selected: sort === key }}
                      onPress={() => setSort(key)}
                      style={[styles.sortButton, sort === key && styles.sortButtonActive]}
                    >
                      <Text style={[styles.sortText, sort === key && styles.sortTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {visibleProducts.length ? (
                <View style={[styles.productGrid, { gap }]}>
                  {visibleProducts.map((product) => (
                    <View key={product.id} style={{ width: cardWidth, marginBottom: spacing.sm }}>
                      <ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { productId: product.id })} compact={columns > 1} />
                    </View>
                  ))}
                </View>
              ) : <EmptyState icon="search" title="Aucun résultat" message="Essayez un autre mot-clé." />}
              {visibleCount < filteredProducts.length ? (
                <Button
                  label={`Charger plus (${filteredProducts.length - visibleCount})`}
                  variant="outline"
                  onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  style={styles.loadMore}
                  accessibilityHint="Affiche jusqu’à 24 produits supplémentaires"
                />
              ) : null}
            </>
          ) : <EmptyState icon="package" title="Aucun produit" message="Cette boutique n’a pas encore publié de produits." />}

          <SectionHeader title="Ce que vous pouvez vérifier" subtitle="Uniquement des informations issues de cette boutique et de ses avis publiés." />
          <View style={[styles.proofGrid, isTablet && styles.proofGridWide]}>
            <ProofItem icon="package" value={String(products.length)} label="produits publiés" />
            <ProofItem icon="message-circle" value={String(reviews.length)} label="avis publiés" />
            {reviews.length ? <ProofItem icon="star" value={`${avgRating.toFixed(1)}/5`} label="note moyenne" /> : null}
            {shop.is_verified ? <ProofItem icon="check-circle" value="Identité" label="boutique vérifiée" /> : null}
          </View>

          <SectionHeader title="L’histoire et les informations" />
          <View style={[styles.storyLayout, isDesktop && styles.storyLayoutWide]}>
            {shop.description ? (
              <View style={styles.storyBlock}>
                <Text accessibilityRole="header" style={styles.subheading}>À propos</Text>
                <Text style={styles.body}>{shop.description}</Text>
              </View>
            ) : null}
            <View style={styles.infoBlock}>
              <Text accessibilityRole="header" style={styles.subheading}>Informations pratiques</Text>
              {shop.address ? <InfoRow icon="map-pin" label="Adresse" value={shop.address} /> : null}
              {shop.phone_number ? <InfoRow icon="phone" label="Téléphone" value={shop.phone_number} onPress={handleCall} /> : null}
              {shop.email ? <InfoRow icon="mail" label="E-mail" value={shop.email} onPress={() => openExternalLink(`mailto:${shop.email}`)} /> : null}
              <InfoRow icon="clock" label="Aujourd’hui" value={openStatus.label} />
            </View>
          </View>

          {shop.opening_hours && Object.keys(shop.opening_hours).length ? (
            <View style={styles.hoursCard}>
              <Text accessibilityRole="header" style={styles.subheading}>Horaires</Text>
              {DAY_ORDER.map((day) => {
                const hours = shop.opening_hours?.[day];
                const today = day === getDayKey();
                return (
                  <View key={day} style={[styles.hoursRow, today && styles.hoursToday]}>
                    <Text style={[styles.hoursText, today && styles.hoursTextToday]}>{DAY_LABELS[day]}</Text>
                    <Text style={[styles.hoursText, today && styles.hoursTextToday]}>{!hours || hours.closed ? 'Fermé' : `${hours.open} – ${hours.close}`}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {socialEntries.length ? (
            <View style={styles.socialRow}>
              {socialEntries.map((network) => {
                const handle = socials[network] as string;
                return (
                  <Pressable
                    key={network}
                    accessibilityRole="link"
                    accessibilityLabel={`Ouvrir ${network} de ${shop.name}`}
                    onPress={() => openExternalLink(socialUrl(network, handle), { requireTrustedHost: true })}
                    style={styles.socialLink}
                  >
                    <Text style={styles.socialLinkText}>{network}</Text>
                    <Feather name="arrow-up-right" size={15} color={colors.primaryDeep} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <SectionHeader title={`Avis clients (${reviews.length})`} subtitle="Les trois avis les plus récents." />
          {reviews.length ? (
            <View style={[styles.reviewsList, isTablet && styles.reviewsListWide]}>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewIdentity}>
                      <View style={styles.avatar}><Feather name="user" size={17} color={colors.primaryDeep} /></View>
                      <View style={styles.reviewNameWrap}>
                        <Text style={styles.reviewName}>{review.user?.full_name || 'Client'}</Text>
                        <Text style={styles.reviewDate}>{formatRelativeDate(review.created_at)}</Text>
                      </View>
                    </View>
                    <Rating value={review.rating} size={14} />
                  </View>
                  {review.comment ? <Text style={styles.reviewComment}>“{review.comment}”</Text> : null}
                </View>
              ))}
            </View>
          ) : <EmptyState icon="star" title="Aucun avis" message="Cette boutique n’a pas encore reçu d’avis." />}

          <View style={styles.footer}>
            <Text style={styles.footerName}>{shop.name}</Text>
            <Text style={styles.footerText}>Propulsé par Boutikplus · {new Date().getFullYear()}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function IconControl({ icon, label, onPress, selected = false }: { icon: string; label: string; onPress: () => void; selected?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconControl, pressed && styles.controlPressed]}
    >
      <Feather name={icon as any} size={20} color={colors.textInverse} />
    </Pressable>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function ProofItem({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.proofItem}>
      <Feather name={icon as any} size={20} color={colors.primaryDeep} />
      <Text style={styles.proofValue}>{value}</Text>
      <Text style={styles.proofLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  const content = (
    <>
      <Feather name={icon as any} size={18} color={colors.primaryDeep} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onPress ? <Feather name="chevron-right" size={17} color={colors.textMuted} /> : null}
    </>
  );
  if (onPress) return <Pressable accessibilityRole="button" accessibilityLabel={`${label} : ${value}`} onPress={onPress} style={styles.infoRow}>{content}</Pressable>;
  return <View style={styles.infoRow}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContent: { paddingBottom: spacing.xl },
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  skeletonLine: { marginTop: spacing.md },
  skeletonBlock: { marginTop: spacing.xl, marginBottom: spacing.xl },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md },
  errorTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.ink, textAlign: 'center' },
  errorText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, lineHeight: 23, textAlign: 'center', maxWidth: 440 },
  hero: { position: 'relative', justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.ink },
  heroFallback: { backgroundColor: colors.secondaryDeep },
  heroTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  iconControl: { width: 48, height: 48, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,16,22,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  controlPressed: { opacity: 0.7 },
heroCopy: { width: '100%', paddingBottom: spacing.xl, alignSelf: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.goldLight },
  eyebrow: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textInverse, textTransform: 'uppercase', letterSpacing: 1.2 },
  shopName: { fontFamily: typography.fontFamily, fontSize: isNarrow ? 28 : 48, lineHeight: isNarrow ? 34 : 56, fontWeight: typography.weights.bold, color: colors.textInverse, letterSpacing: -1.4 },
  shopNameNarrow: { fontSize: 28, lineHeight: 34 },
  slogan: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, lineHeight: 26, color: 'rgba(255,255,255,0.88)', marginTop: spacing.sm, maxWidth: 620 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  heroMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  heroMetaText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.textInverse },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(201,154,60,0.22)', paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(230,200,120,0.5)' },
  verifiedChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.goldLight },
  heroGlassCard: {
    flexDirection: 'row', alignItems: 'stretch', alignSelf: 'center', maxWidth: 1200,
    backgroundColor: colors.glassStrong,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl,
    borderWidth: 1, borderColor: colors.glassBorder,
    paddingVertical: spacing.md,
    ...shadows.fani,
  },
  glassItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  glassItemText: { alignItems: 'flex-start' },
  glassItemValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.ink, lineHeight: 24 },
  glassItemLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  glassDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: spacing.xs },
  primaryCta: { gap: spacing.sm, paddingTop: isNarrow ? spacing.lg : spacing.xxl, paddingBottom: isNarrow ? spacing.xl : spacing.huge, borderBottomWidth: 1, borderBottomColor: colors.border },
  primaryCtaWide: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: { marginTop: isNarrow ? spacing.xxl : spacing.massive, marginBottom: isNarrow ? spacing.lg : spacing.xl, maxWidth: 680 },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, lineHeight: 31, fontWeight: typography.weights.bold, color: colors.ink, letterSpacing: -0.5 },
  sectionSubtitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: 23, color: colors.textMuted, marginTop: spacing.sm },
  catalogControls: { gap: spacing.md, marginBottom: spacing.xl },
  catalogControlsWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchBox: { minHeight: 50, flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.sm },
  searchInput: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, paddingVertical: spacing.sm },
  sortGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sortButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.sm },
  sortButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  sortText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text },
  sortTextActive: { color: colors.textInverse },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  loadMore: { alignSelf: 'center', marginTop: spacing.xl },
  proofGrid: { borderTopWidth: 1, borderTopColor: colors.border },
  proofGridWide: { flexDirection: 'row' },
  proofItem: { flex: 1, minWidth: 170, paddingVertical: spacing.xl, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  proofValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.ink, marginTop: spacing.sm },
  proofLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, marginTop: 2 },
  storyLayout: { gap: spacing.xl },
  storyLayoutWide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.massive },
  storyBlock: { flex: 1.2 },
  infoBlock: { flex: 1 },
  subheading: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.ink, marginBottom: spacing.md },
  body: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: 26, color: colors.text },
  infoRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoText: { flex: 1 },
  infoLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text, marginTop: 2 },
  hoursCard: { marginTop: spacing.xl, maxWidth: 620, padding: spacing.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  hoursToday: { backgroundColor: colors.surfaceAlt, marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm },
  hoursText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  hoursTextToday: { color: colors.primaryDeep, fontWeight: typography.weights.bold },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
  socialLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface },
  socialLinkText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primaryDeep, textTransform: 'capitalize', fontWeight: typography.weights.semibold },
  reviewsList: { gap: spacing.md },
  reviewsListWide: { flexDirection: 'row', alignItems: 'stretch' },
  reviewCard: { flex: 1, minWidth: 0, padding: spacing.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, ...shadows.fani },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  reviewIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  reviewNameWrap: { flex: 1 },
  reviewName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  reviewDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
  reviewComment: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: 24, color: colors.text, marginTop: spacing.lg },
  footer: { marginTop: isNarrow ? spacing.xxl : spacing.massive, paddingVertical: spacing.xxl, borderTopWidth: 1, borderTopColor: colors.border },
  footerName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.ink },
  footerText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: spacing.xs },
});
