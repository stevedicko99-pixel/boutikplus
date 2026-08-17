// Page Produit — Boutikplus (Design Luxe)
// Redesign premium inspiré des sites de luxe (LVMH, Shopify Plus, Farfetch)
// Galerie plein écran, typography élégante, trust badges, animations fluides,
// détails produit enrichis (matériaux, dimensions, disponibilité), CTA sticky.

import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, Alert, Animated, Dimensions, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getProduct, findOrCreateConversation, incrementProductView, sendMessage, getMessages, isDemoMode } from '@/lib/dataService';
import { DEMO_BUYER } from '@/data/demoData';
import { getProductReviewStats, getProductReviews, type ProductReview } from '@/lib/productReviews';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { getCategoryName } from '@/constants/categories';
import { MediaCarousel } from '@/components/product/MediaCarousel';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoriteContext';
import { formatFCFA } from '@/lib/format';
import { TextToSpeech } from '@/components/accessibility/TextToSpeech';
import type { ProductWithImages } from '@/types/models';

const screenWidth = Dimensions.get('window').width;
const isNarrow = screenWidth < 400;

interface ProductDetailScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { productId: string } };
}

interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
  stars_1: number;
  stars_2: number;
  stars_3: number;
  stars_4: number;
  stars_5: number;
}

export function ProductDetailScreen({ navigation, route }: ProductDetailScreenProps) {
  const { productId } = route.params;
  const { addItem } = useCart();
  const { profile, setPendingReturnTo } = useAuth();
  const { isFav, toggleFavorite } = useFavorites();
  const [product, setProduct] = useState<ProductWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  useDocumentTitle(product ? `${product.name} — Boutikplus` : 'Produit — Boutikplus');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [topReviews, setTopReviews] = useState<ProductReview[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const [p, reviewStats, reviewsList] = await Promise.all([
        getProduct(productId),
        getProductReviewStats(productId),
        getProductReviews(productId, profile?.id ?? null),
      ]);
      setProduct(p);
      setStats(reviewStats);
      setTotalReviews(reviewStats?.total_reviews ?? 0);
      setTopReviews((reviewsList ?? []).slice(0, 2));
      setLoading(false);
      if (p) {
        incrementProductView(productId);
      }
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    })();
  }, [productId]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><PageLoader /></SafeAreaView>;
  if (!product) return <SafeAreaView style={styles.container} edges={['top']}><EmptyState icon="alert-circle" title="Produit introuvable" /></SafeAreaView>;

  const images = product.images?.map((i) => i.image_url) ?? [];
  const isOutOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const shop = product.shop;
  const favorited = isFav(product.id);
  const favCount = product.favorites_count ?? 0;
  const avgRating = stats?.avg_rating ?? 0;

  const handleAddToCart = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    addItem(product, qty);
    navigation.navigate('Checkout');
  };

const handleContact = async () => {
    if (!shop) return;
    // CAS INVITÉ : rediriger vers Login, puis revenir sur cette conversation
    if (!profile && !isDemoMode) {
      setPendingReturnTo({
        screen: 'ProductDetail',
        params: { productId },
      });
      Alert.alert(
        'Connexion requise',
        'Connecte-toi pour discuter avec le vendeur. On revient directement sur cette page après !',
        [
          { text: 'Annuler' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('Login', { returnTo: 'ProductDetail' }),
          },
        ],
      );
      return;
    }
    // En mode démo, on utilise le profil acheteur de démonstration
    // (le site Vercel tourne sans Supabase → pas de vraie session possible).
    const buyer = profile ?? DEMO_BUYER;
    // Trouver ou créer la conversation
    const convId = await findOrCreateConversation(buyer.id, shop.owner_id, shop.id);
    if (!convId) {
      Alert.alert('Oups', 'Impossible de lancer la conversation pour le moment.');
      return;
    }
// ✅ Message automatique lors de l'ouverture de la conversation
    const autoMsg = `👋 Bonjour ${shop.name || 'vendeur'}, je suis intéressé(e) par "${product.name}"${product.price ? ` (${formatFCFA(product.price)} FCFA)` : ''}. Est-il disponible ?`;
    try {
      // Envoyer systématiquement le message d'approche pour ce produit.
      // En démo, sendMessage persiste le message en mémoire (demoMessageStore),
      // donc il est visible dès l'ouverture du chat. On évite uniquement les
      // doublons exacts soumis consécutivement.
      const existing = await getMessages(convId);
      const alreadyApproached = existing.some((m) => m.content === autoMsg);
      if (!alreadyApproached) {
        await sendMessage(convId, buyer.id, autoMsg);
      }
    } catch {
      // ignore (fallback silent)
    }
    navigation.navigate('Chat', { conversationId: convId, shopId: shop.id, productId: product.id });
  };

  const handleToggleFav = () => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connecte-toi pour ajouter aux favoris');
      return;
    }
    toggleFavorite(product.id);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, tension: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🛍️ ${product.name} — ${formatFCFA(product.price)} sur Boutikplus\n\n${product.description ?? ''}\n\nDécouvrez-le sur Boutikplus !`,
        title: product.name,
      });
    } catch {}
  };

  const productDetails = extractProductDetails(product.description ?? '', product.category_id);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
        {/* ─── Top bar flottante (glassmorphism) ─── */}
        <View style={styles.topBar}>
          <Pressable onPress={navigation.goBack} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn} hitSlop={12} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Partager le produit">
              <Feather name="share-2" size={19} color={colors.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={12} onPress={handleToggleFav} accessibilityRole="button" accessibilityLabel={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Feather
                  name="heart"
                  size={20}
                  color={favorited ? colors.danger : colors.text}
                  fill={favorited ? colors.danger : undefined}
                />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {/* ─── Galerie plein écran ─── */}
        <MediaCarousel images={images} videos={product.videos} height={isNarrow ? 320 : 420} />

        {/* ─── Contenu ─── */}
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Breadcrumb repère spatial (essentiel pour les utilisateurs qui arrivent par URL partagée) */}
          <Breadcrumb
            items={[
              { label: 'Accueil', onPress: () => navigation.navigate('Home') },
              { label: getCategoryName(product.category_id) || 'Boutique' },
              shop
                ? { label: shop.name, onPress: () => navigation.navigate('ShopDetail', { shopId: shop.id }) }
                : null,
              { label: product.name.slice(0, 24), active: true },
            ].filter(Boolean) as any}
            style={styles.breadcrumb}
          />

          {/* Badges catégorie + stock */}
          <View style={styles.tagRow}>
            <View style={styles.catBadge}>
              <Feather name="tag" size={11} color={colors.primary} />
              <Text style={styles.catBadgeText}>{getCategoryName(product.category_id)}</Text>
            </View>
            {isOutOfStock ? (
              <View style={[styles.stockBadge, styles.stockOut]}>
                <Feather name="x-circle" size={11} color={colors.danger} />
                <Text style={[styles.stockBadgeText, { color: colors.danger }]}>Rupture de stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.stockIn]}>
                <View style={styles.stockDot} />
                <Text style={[styles.stockBadgeText, { color: colors.success }]}>En stock · {product.stock} dispo</Text>
              </View>
            )}
          </View>

          {/* Nom + prix (style luxe) */}
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatFCFA(product.price)}</Text>
            <StampBadge label="Prix Faso" color={colors.primaryDeep} size="sm" />
            <TextToSpeech text={`${product.name}, ${formatFCFA(product.price)}. ${product.description ?? ''}`} size="sm" />
          </View>

          {/* Fil de Faso — couture sous le prix (signature discrète) */}
          <ThreadDivider color={colors.stitch} style={styles.detailThread} />

          {/* Note + favoris + vues (preuve sociale) */}
          <View style={styles.socialProofRow}>
            {totalReviews > 0 ? (
            <Pressable
              style={styles.ratingChip}
              onPress={() => navigation.navigate('ProductReviews', { productId })}
              accessibilityRole="button"
              accessibilityLabel={`Voir les avis, note moyenne ${avgRating.toFixed(1)} sur 5, ${totalReviews} avis`}
            >
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <MaterialCommunityIcons
                      key={s}
                      name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
                      size={16}
                      color={s <= Math.round(avgRating) ? colors.warning : colors.border}
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                <View style={styles.ratingSeparator} />
                <Text style={styles.reviewsLink}>{totalReviews} avis →</Text>
              </Pressable>
            ) : (
              <View style={styles.ratingChip}>
                <Feather name="star" size={15} color={colors.textMuted} />
                <Text style={styles.ratingText}>Premier avis à venir</Text>
              </View>
            )}
            {favCount > 0 ? (
              <View style={styles.favChip}>
                <Feather name="heart" size={13} color={colors.danger} fill={colors.danger} />
                <Text style={styles.favText}>{favCount}</Text>
              </View>
            ) : null}
            <View style={styles.viewChip}>
              <Feather name="eye" size={13} color={colors.info} />
              <Text style={styles.viewText}>{product.views_count ?? 0} vues</Text>
            </View>
          </View>

          {/* ─── Trust badges (style e-commerce premium) ─── */}
          <View style={styles.trustBadgesRow}>
            <TrustBadge icon="shield" label="Paiement sécurisé" sub="Mobile Money" />
            <TrustBadge icon="truck" label="Livraison rapide" sub="2-5 jours" />
            <TrustBadge icon="rotate-ccw" label="Retours 7j" sub="Satisfait/remboursé" />
          </View>

          {/* ─── Section boutique — "Vendu par X" ─── */}
          {shop ? (
            <Pressable
              style={({ pressed }) => [styles.shopCard, pressed && { transform: [{ scale: 0.99 }] }]}
              onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
              accessibilityRole="button"
              accessibilityLabel={`Voir la boutique ${shop.name}`}
            >
              <View style={styles.shopLogoWrap}>
                {shop.logo_url ? (
                  <Image source={{ uri: shop.logo_url }} style={styles.shopLogo} contentFit="cover" />
                ) : (
                  <View style={[styles.shopLogo, styles.shopLogoFallback]}>
                    <Feather name="briefcase" size={22} color={colors.textInverse} />
                  </View>
                )}
                {shop.status === 'active' ? (
                  <View style={styles.shopVerifiedBadge}>
                    <Feather name="check" size={11} color={colors.textInverse} />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopSoldBy}>Vendu par</Text>
                <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                <View style={styles.shopMetaRow}>
                  <Feather name="map-pin" size={11} color={colors.textMuted} />
                  <Text style={styles.shopCity}>{shop.city}</Text>
                  {shop.status === 'active' ? (
                    <View style={styles.verifiedChip}>
                      <Feather name="check-circle" size={9} color={colors.success} />
                      <Text style={styles.verifiedText}>Vérifiée</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.shopArrow}>
                <Feather name="chevron-right" size={20} color={colors.primary} />
              </View>
            </Pressable>
          ) : null}

          {/* ─── Description (style éditorial) ─── */}
          {product.description ? (
            <View style={styles.descSection}>
              <View style={styles.descTitleRow}>
                <View style={styles.descTitleAccent} />
                <Text style={styles.descTitle}>Description</Text>
                <TextToSpeech text={product.description} size="sm" />
              </View>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {/* ─── Détails produit enrichis (fiche technique) ─── */}
          <View style={styles.specsSection}>
            <View style={styles.descTitleRow}>
              <View style={styles.descTitleAccent} />
              <Text style={styles.descTitle}>Détails du produit</Text>
            </View>
            <View style={styles.specsGrid}>
              <SpecRow icon="tag" label="Catégorie" value={getCategoryName(product.category_id)} />
              <SpecRow icon="box" label="Disponibilité" value={isOutOfStock ? 'Rupture' : `${product.stock} en stock`} />
              <SpecRow icon="calendar" label="Publié" value={formatDate(product.created_at)} />
              {productDetails.material ? (
                <SpecRow icon="layers" label="Matériau" value={productDetails.material} />
              ) : null}
              {productDetails.dimensions ? (
                <SpecRow icon="maximize" label="Dimensions" value={productDetails.dimensions} />
              ) : null}
            </View>
          </View>

          {/* ─── Livraison & retours ─── */}
          <View style={styles.shippingSection}>
            <View style={styles.descTitleRow}>
              <View style={styles.descTitleAccent} />
              <Text style={styles.descTitle}>Livraison & Retours</Text>
            </View>
            <View style={styles.shippingList}>
              <View style={styles.shippingRow}>
                <View style={[styles.shippingIconWrap, { backgroundColor: colors.primary + '15' }]}>
                  <Feather name="truck" size={20} color={colors.primaryDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shippingTitle}>Livraison Burkina Faso</Text>
                  <Text style={styles.shippingSub}>2-3 jours à Ouaga/Bobo · 3-5 jours autres villes</Text>
                </View>
              </View>
              <View style={styles.shippingRow}>
                <View style={[styles.shippingIconWrap, { backgroundColor: colors.success + '15' }]}>
                  <Feather name="credit-card" size={20} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shippingTitle}>Paiement Mobile Money</Text>
                  <Text style={styles.shippingSub}>Orange Money ou Moov Money · Sécurisé</Text>
                </View>
              </View>
              <View style={styles.shippingRow}>
                <View style={[styles.shippingIconWrap, { backgroundColor: colors.info + '15' }]}>
                  <Feather name="rotate-ccw" size={20} color={colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shippingTitle}>Retours gratuits</Text>
                  <Text style={styles.shippingSub}>7 jours après réception · Sans justification</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ─── Aperçu avis clients (style Amazon/Shopify) ─── */}
          <View style={styles.reviewsSection}>
            <View style={styles.descTitleRow}>
              <View style={styles.descTitleAccent} />
              <Text style={styles.descTitle}>Avis clients</Text>
              {totalReviews > 0 ? (
                <Pressable
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('ProductReviews', { productId })}
                  accessibilityRole="button"
                  accessibilityLabel="Voir tous les avis"
                >
                  <Text style={styles.seeAllText}>Voir tout ({totalReviews})</Text>
                  <Feather name="chevron-right" size={14} color={colors.primaryDeep} />
                </Pressable>
              ) : null}
            </View>

            {totalReviews > 0 ? (
              <View style={styles.reviewsPreviewList}>
                {/* Résumé note */}
                <View style={styles.reviewsSummaryRow}>
                  <View style={styles.reviewsAvgWrap}>
                    <Text style={styles.reviewsAvg}>{avgRating.toFixed(1)}</Text>
                    <Text style={styles.reviewsAvgMax}>/5</Text>
                  </View>
                  <View style={styles.reviewsSummaryRight}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <MaterialCommunityIcons
                          key={s}
                          name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
                          size={16}
                          color={s <= Math.round(avgRating) ? colors.warning : colors.border}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewsSummaryCount}>
                      Basé sur {totalReviews} avis
                    </Text>
                  </View>
                  <Pressable
                    style={styles.writeReviewBtn}
                    onPress={() => {
                      if (!profile) {
                        Alert.alert('Connexion requise', 'Connecte-toi pour laisser un avis');
                        return;
                      }
                      navigation.navigate('WriteProductReview', { productId });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Écrire un avis"
                  >
                    <Feather name="edit-3" size={13} color={colors.primaryDeep} />
                    <Text style={styles.writeReviewText}>Écrire un avis</Text>
                  </Pressable>
                </View>

                {/* 2 derniers avis */}
                {topReviews.map((r) => (
                  <View key={r.id} style={styles.reviewPreviewCard}>
                    <View style={styles.reviewPreviewHead}>
                      <View style={styles.reviewAvatar}>
                        {r.is_anonymous || !r.user?.avatar_url ? (
                          <Text style={styles.reviewAvatarText}>
                            {(r.is_anonymous ? 'A' : r.user?.full_name?.[0] ?? 'A').toUpperCase()}
                          </Text>
                        ) : (
                          <Image source={{ uri: r.user.avatar_url }} style={styles.reviewAvatarImg} contentFit="cover" />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.reviewAuthorRow}>
                          <Text style={styles.reviewAuthorName} numberOfLines={1}>
                            {r.is_anonymous ? 'Anonyme' : r.user?.full_name ?? 'Client'}
                          </Text>
                          {!r.is_anonymous && r.user?.is_verified ? (
                            <View style={styles.reviewVerifiedTick}>
                              <Feather name="check" size={8} color={colors.textInverse} />
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.reviewMetaRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <MaterialCommunityIcons
                              key={s}
                              name={s <= Math.round(r.rating) ? 'star' : 'star-outline'}
                              size={11}
                              color={s <= Math.round(r.rating) ? colors.warning : colors.border}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewPreviewComment} numberOfLines={3}>
                        {r.comment}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Pressable
                style={styles.noReviewCta}
                onPress={() => {
                  if (!profile) {
                    Alert.alert('Connexion requise', 'Connecte-toi pour laisser un avis');
                    return;
                  }
                  navigation.navigate('WriteProductReview', { productId });
                }}
                accessibilityRole="button"
                accessibilityLabel="Soyez le premier à donner un avis"
              >
                <View style={styles.noReviewIconWrap}>
                  <Feather name="edit-3" size={22} color={colors.primaryDeep} />
                </View>
                <Text style={styles.noReviewTitle}>Soyez le premier à donner votre avis</Text>
                <Text style={styles.noReviewSub}>
                  Partagez votre expérience pour aider les autres acheteurs
                </Text>
              </Pressable>
            )}
          </View>

          {/* ─── Actions secondaires ─── */}
          <View style={styles.secondaryActions}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
              onPress={handleContact}
              accessibilityRole="button"
              accessibilityLabel="Contacter le vendeur"
            >
              <Feather name="message-circle" size={18} color={colors.secondary} />
              <Text style={styles.secondaryBtnText}>Contacter le vendeur</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate('Chatbot', { product: product, shopName: shop?.name })}
              accessibilityRole="button"
              accessibilityLabel="Assistant IA"
            >
              <Feather name="cpu" size={18} color={colors.secondary} />
              <Text style={styles.secondaryBtnText}>Assistant IA</Text>
            </Pressable>
          </View>

          {/* Espace pour bottom bar */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* ─── Bottom bar sticky (CTA principal) ─── */}
      <View style={styles.bottomBar}>
        {!isOutOfStock ? (
          <View style={styles.qtyControl}>
            <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Diminuer la quantité">
              <Feather name="minus" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.min(product.stock, q + 1))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Augmenter la quantité">
              <Feather name="plus" size={18} color={colors.primaryDeep} />
            </Pressable>
          </View>
        ) : null}
        <Button
          label={added ? 'Ajouté ✓' : 'Ajouter au panier'}
          variant="outline"
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          style={[styles.ctaBtn, { flex: 1 }]}
        />
        <Button
          label="Commander"
          onPress={handleBuyNow}
          disabled={isOutOfStock}
          style={[styles.ctaBtn, { flex: 1.3, marginLeft: spacing.sm }]}
        />
      </View>
    </View>
  );
}

// ─── Sous-composants ───

function TrustBadge({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <View style={styles.trustBadge}>
      <View style={styles.trustBadgeIcon}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={styles.trustBadgeLabel}>{label}</Text>
      <Text style={styles.trustBadgeSub}>{sub}</Text>
    </View>
  );
}

function SpecRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Feather name={icon as any} size={14} color={colors.textMuted} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Helpers ───

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return 'Récent';
  }
}

function extractProductDetails(description: string, categoryId: string): { material?: string; dimensions?: string } {
  const descLower = description.toLowerCase();
  const result: { material?: string; dimensions?: string } = {};

  const materials = ['coton', 'wax', 'cuir', 'bois', 'metal', 'métal', 'plastique', 'verre', 'ceramique', 'céramique', 'tissu', 'soie', 'lin', 'karité', 'bronze'];
  for (const m of materials) {
    if (descLower.includes(m)) {
      result.material = m.charAt(0).toUpperCase() + m.slice(1);
      break;
    }
  }

  const dimMatch = description.match(/(\d+\s*[xX×]\s*\d+(?:\s*[xX×]\s*\d+)?\s*(?:cm|mm|m)?)|(\d+\s*(?:cm|mm|m))/);
  if (dimMatch) {
    result.dimensions = dimMatch[0].replace(/\s+/g, ' ').trim();
  }

  if (!result.material) {
    const catMaterials: Record<string, string> = {
      vetements: 'Tissu',
      cosmetiques: 'Naturel',
      nourriture: 'Frais',
      artisanat: 'Fait main',
      accessoires: 'Premium',
      services: 'Sur mesure',
      beaute: 'Cosmétique',
      maison: 'Maison',
    };
    result.material = catMaterials[categoryId] ?? 'Qualité';
  }

  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  // Top bar flottante — glassmorphism (blur + transparence karité)
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255, 248, 242, 0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 138, 92, 0.10)',
    ...Platform.select({
      web: { backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)' } as any,
      default: {},
    }),
  },
  topActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 92, 0.12)',
    ...Platform.select({
      ios: { shadowColor: '#C0491E', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 5 },
      default: { boxShadow: '0px 3px 10px rgba(192,73,30,0.18)' },
    }),
  },
  // Contenu
  content: { padding: screenWidth < 400 ? spacing.md : spacing.lg, paddingTop: spacing.md },
  breadcrumb: { marginBottom: spacing.lg },
  // Tags
  tagRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  catBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  stockIn: { backgroundColor: colors.success + '12' },
  stockOut: { backgroundColor: colors.danger + '12' },
  stockBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  // Nom + prix — typographie impactante (style e-commerce premium)
  productName: {
    fontFamily: typography.fontFamily,
    fontSize: isNarrow ? typography.sizes.title : typography.sizes.mega,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    marginBottom: spacing.sm,
    lineHeight: isNarrow ? 32 : 40,
    letterSpacing: typography.letterSpacings.tight,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailThread: { alignSelf: 'flex-start', marginLeft: spacing.xs, marginBottom: spacing.lg },
  price: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.primaryDeep,
    letterSpacing: typography.letterSpacings.tight,
  },
  // Preuve sociale — chips élégantes avec icônes
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.18)',
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  ratingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  ratingSeparator: {
    width: 1, height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  reviewsLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDeep,
    textDecorationLine: 'underline',
  },
  favChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.danger + '14',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger + '20',
  },
  favText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.danger,
  },
  viewChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.info + '12',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.info + '20',
  },
  viewText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.info,
  },
  // Trust badges — ligne premium avec séparateurs
  trustBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: isNarrow ? spacing.md : spacing.lg,
    paddingVertical: isNarrow ? spacing.md : spacing.lg,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trustBadge: { flex: 1, alignItems: 'center', gap: 4 },
  trustBadgeIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  trustBadgeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: typography.letterSpacings.tight,
  },
  trustBadgeSub: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Carte boutique — design moderne "Vendu par X"
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isNarrow ? spacing.sm : spacing.md,
    padding: isNarrow ? spacing.md : spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: isNarrow ? spacing.md : spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#FF8A5C', shadowOpacity: 0.10, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 3 },
      default: { boxShadow: '0px 6px 18px rgba(255,138,92,0.12), 0px 1px 3px rgba(42,34,48,0.04)' },
    }),
  },
  shopLogoWrap: { position: 'relative' },
  shopLogo: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt },
  shopLogoFallback: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  shopVerifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: colors.surface,
  },
  shopSoldBy: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    letterSpacing: typography.letterSpacings.wide,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  shopName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  shopMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  shopCity: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.success + '15',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  verifiedText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.success,
    letterSpacing: typography.letterSpacings.wide,
  },
  shopArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '14',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  // Description
  descSection: { marginBottom: spacing.lg },
  descTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  descTitleAccent: {
    width: 3, height: 18,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  descTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  desc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    lineHeight: 26,
  },
  // Specs
  specsSection: { marginBottom: spacing.lg },
  specsGrid: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  specLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    width: 100,
  },
  specValue: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'right',
  },
  // Livraison — cartes individuelles avec icônes en cercle coloré
  shippingSection: { marginBottom: spacing.lg },
  shippingList: { gap: spacing.sm },
  shippingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  shippingIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  shippingTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  shippingSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  // Aperçu avis clients (style Amazon/Shopify)
  reviewsSection: { marginBottom: spacing.lg },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary + '0D',
  },
  seeAllText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primaryDeep,
  },
  reviewsPreviewList: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  reviewsAvgWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  reviewsAvg: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
  },
  reviewsAvgMax: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: 4,
  },
  reviewsSummaryRight: { flex: 1, gap: 4 },
  reviewsSummaryCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  writeReviewText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primaryDeep,
  },
  reviewPreviewCard: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  reviewPreviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarImg: { width: '100%', height: '100%', borderRadius: 17 },
  reviewAvatarText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewAuthorName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    maxWidth: 140,
  },
  reviewVerifiedTick: {
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewMetaRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  reviewPreviewComment: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },
  // CTA "premier avis"
  noReviewCta: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary + '20',
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  noReviewIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary + '14',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  noReviewTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  noReviewSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Actions secondaires
  secondaryActions: {
    flexDirection: isNarrow ? 'column' : 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.secondary + '25',
    backgroundColor: colors.secondary + '08',
  },
  secondaryBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.secondaryDeep,
  },
  // Bottom bar sticky — style premium avec glassmorphism
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: isNarrow ? spacing.md : spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: isNarrow ? spacing.lg : spacing.xxl,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#C0491E', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 10 },
      default: {
        boxShadow: '0px -6px 24px rgba(192,73,30,0.10), 0px -1px 3px rgba(42,34,48,0.04)',
        backdropFilter: 'blur(12px)' as any,
        WebkitBackdropFilter: 'blur(12px)' as any,
      },
    }),
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#FF8A5C', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      default: { boxShadow: '0px 2px 4px rgba(255,138,92,0.12)' },
    }),
  },
  qtyValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    minWidth: 28, textAlign: 'center',
  },
  ctaBtn: {
    height: isNarrow ? 48 : 54,
    borderRadius: radius.xl,
  },
});
