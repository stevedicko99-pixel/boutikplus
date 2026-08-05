import { useState, useCallback, useRef, memo, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList, Animated, Dimensions, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProductsByShop, getSellerOrders } from '@/lib/dataService';
import { formatFCFA, formatRelativeDate } from '@/lib/format';
import { shopPublicUrl } from '@/constants/config';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkline, mockSparkline7 } from '@/components/ui/Sparkline';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { Image } from 'expo-image';
import { TrustBadges, calculateTrustBadges, type TrustBadge } from '@/components/growth/TrustBadges';
import { BarChart } from '@/components/charts/BarChart';
import type { Shop, ProductWithImages, Order, OrderItem, Payment } from '@/types/models';

interface SellerDashboardScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function SellerDashboardScreen({ navigation }: SellerDashboardScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [orders, setOrders] = useState<(Order & { items: OrderItem[]; payment?: Payment })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, friction: 3, tension: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: -100, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastAnim]);

  const load = useCallback(async (isRefresh = false) => {
    if (!profile?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const ownerId = profile.id;
    try {
      const s = await getShopByOwner(ownerId);
      setShop(s);
      if (s) {
        const [prods, ords] = await Promise.all([getProductsByShop(s.id), getSellerOrders(ownerId)]);
        setProducts(prods);
        setOrders(ords as any);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  // ⚡ Auto-refresh à chaque focus (retour d'écran de création boutique/produit).
  // useFocusEffect est suffisant : il est aussi déclenché au montage initial
  // (quand l'écran devient le focus). Suppression du useEffect [profile]
  // qui provoquait un DOUBLE FETCH SYSTÉMATIQUE (2 appels identiques en
  // parallèle, requêtes doublons Supabase confirmées par network log).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ⚠️ CORRECTION CRITIQUE (Bug React Error #310) :
  // TOUS les hooks ci-dessous DOIVENT être déclarés AVANT les early returns
  // (if (loading) return / if (!shop) return). Sinon, au premier rendu où
  // loading=true, le composant return avant d'exécuter ces useMemo/useState,
  // et au rendu suivant (loading=false) les hooks s'exécutent → React détecte
  // un nombre de hooks INCOHÉRENT entre les renders → "Minified React error
  // #310: Rendered fewer hooks than expected" → ErrorBoundary attrape →
  // écran blanc/cassé sur SellerDashboard pour tout vendeur authentifié.
  // Solution : déplacer tous les hooks avant les early returns ; gérer le
  // cas shop=null via optional chaining (shop?.id, shop?.status, etc.).
  const monthSales = useMemo(() => orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0), [orders]);
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'proof_uploaded' || o.status === 'pending_payment').length, [orders]);
  const activeProducts = useMemo(() => products.filter((p) => p.status === 'available').length, [products]);
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const topProducts = useMemo(() => products.slice(0, 5), [products]);

  // Données sparkline stables (seed = shop.id.length) — remplacées par du vrai historique en prod
  const salesSpark7 = useMemo(() => mockSparkline7((shop?.id?.length || 5) + Math.round(monthSales / 5000), Math.round(monthSales / 20000), 30), [shop?.id, monthSales]);
  const ordersSpark7 = useMemo(() => mockSparkline7((shop?.id?.length || 3) + orders.length, orders.length + 1, 15), [shop?.id, orders.length]);

  // Handlers FAB — shop peut être null au premier rendu ; le handler ne sera
  // simplement pas appelé tant que shop n'est pas chargé (le bouton share
  // n'est rendu que dans le JSX après le guard !shop).
  const handleShareShop = useCallback(async () => {
    if (!shop) return;
    try {
      await Share.share({
        message: `🛍️ Découvrez ${shop.name} sur Boutikplus !\n${shop.slogan ?? ''}\n${shopPublicUrl(shop.id)}`,
        title: shop.name,
      });
    } catch {}
  }, [shop]);

  // Etat expandable FAB (plusieurs actions rapides)
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const toggleFab = useCallback(() => {
    const next = !fabOpen;
    setFabOpen(next);
    Animated.spring(fabAnim, { toValue: next ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [fabOpen, fabAnim]);

  // Badges de confiance
  const trustBadges = useMemo(() => calculateTrustBadges({
    isVerified: shop?.status === 'active',
    averageRating: 4.5,
    totalReviews: 5,
    deliveryDays: 3,
    totalOrders: orders.length,
    cancellationRate: 0.02,
  }), [shop?.status, orders.length]);

  // ── Early returns APRÈS tous les hooks (règle des hooks React) ──────────
  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><PageLoader /></SafeAreaView>;

  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState icon="briefcase" title="Aucune boutique" message="Créez votre boutique pour commencer à vendre" action={
          <Pressable style={styles.createBtn} onPress={() => navigation.navigate('CreateShop')}>
            <Feather name="plus" size={18} color={colors.textInverse} />
            <Text style={styles.createBtnText}>Créer ma boutique</Text>
          </Pressable>
        } />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour"><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: shop.status === 'active' ? colors.success : shop.status === 'pending' ? colors.warning : colors.textMuted }]} />
            <Text style={styles.statusText}>{shop.status === 'active' ? 'Active' : shop.status === 'pending' ? 'En attente de validation' : shop.status === 'rejected' ? 'Refusée' : 'En pause'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.navigate('Home')}
            style={styles.siteBtn}
            accessibilityRole="button"
            accessibilityLabel="Aller à l'accueil"
          >
            <Feather name="home" size={16} color={colors.primary} />
            <Text style={styles.siteBtnText}>Accueil</Text>
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
            style={styles.siteBtn}
            accessibilityRole="button"
            accessibilityLabel="Voir ma boutique sur le site"
          >
            <Feather name="eye" size={16} color={colors.primary} />
            <Text style={styles.siteBtnText}>Voir ma boutique</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Badges de confiance */}
        <View style={styles.badgesRow}>
          <TrustBadges badges={trustBadges} size="sm" />
        </View>

        {/* Fil de Faso — couture + titre performance */}
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Performance</Text>
          <StampBadge label="Live" color={colors.primaryDeep} size="sm" />
        </View>
        <ThreadDivider color={colors.stitch} style={styles.dashThread} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <MemoStatCard
            icon="trending-up"
            label="Ventes du mois"
            value={formatFCFA(monthSales)}
            color={colors.success}
            spark={salesSpark7}
            sparkColor={colors.success}
          />
          <MemoStatCard
            icon="clock"
            label="En attente"
            value={`${pendingOrders}`}
            color={colors.warning}
            spark={ordersSpark7}
            sparkColor={colors.warning}
          />
          <MemoStatCard
            icon="package"
            label="Produits actifs"
            value={`${activeProducts}`}
            color={colors.primary}
          />
        </View>

        {/* Graphique des revenus */}
        <BarChart
          data={[
            { label: 'Lun', value: Math.round(monthSales * 0.12), color: '#FF6B00' },
            { label: 'Mar', value: Math.round(monthSales * 0.08), color: '#FF8533' },
            { label: 'Mer', value: Math.round(monthSales * 0.15), color: '#FF6B00' },
            { label: 'Jeu', value: Math.round(monthSales * 0.20), color: '#FF8533' },
            { label: 'Ven', value: Math.round(monthSales * 0.18), color: '#FF6B00' },
            { label: 'Sam', value: Math.round(monthSales * 0.22), color: '#FF8533' },
            { label: 'Dim', value: Math.round(monthSales * 0.05), color: '#FF6B00' },
          ]}
          title="Revenus cette semaine"
          height={180}
          barColor={colors.primary}
          valueFormatter={(v) => `${Math.round(v).toLocaleString('fr-FR')} F`}
        />

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <MemoQuickAction icon="edit-3" label="🛠️ Personnaliser" color={colors.primaryDeep} onPress={() => navigation.navigate('CreateShop', { edit: true })} />
          <MemoQuickAction icon="plus-circle" label="Ajouter produit" color={colors.primary} onPress={() => navigation.navigate('AddEditProduct')} />
          <MemoQuickAction icon="cpu" label="Assistant IA" color={colors.secondary} onPress={() => navigation.navigate('AIProductAssistant')} />
          <MemoQuickAction icon="grid" label="🤖 Hub IA" color="#8B5CF6" onPress={() => navigation.navigate('AIGlobalDashboard')} />
          <MemoQuickAction icon="shopping-bag" label="Mes commandes" color={colors.primary} onPress={() => navigation.navigate('SellerOrders')} />
          <MemoQuickAction icon="percent" label="Créer promo" color={colors.warning} onPress={() => navigation.navigate('PromotionHub')} />
          <MemoQuickAction icon="bar-chart-2" label="Statistiques" color={colors.info} onPress={() => navigation.navigate('SellerStats')} />
        </View>

        {/* Section livraison */}
        <View style={styles.deliverySection}>
          <Pressable
            style={styles.deliveryCard}
            onPress={() => navigation.navigate('SellerDeliveries')}
          >
            <View style={[styles.deliveryIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="navigation" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>Mes livraisons</Text>
              <Text style={styles.deliveryDesc}>
                Commander un livreur pour vos colis
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={[styles.deliveryCard, { marginTop: spacing.sm }]}
            onPress={() => navigation.navigate('DriverDashboard')}
          >
            <View style={[styles.deliveryIcon, { backgroundColor: colors.secondary + '18' }]}>
              <Feather name="truck" size={22} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryTitle}>Espace livreur</Text>
              <Text style={styles.deliveryDesc}>
                Gagnez en livrant les commandes
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Produits */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Mes produits ({products.length})</Text>
            <Pressable onPress={() => navigation.navigate('ProductManagement')}><Text style={styles.seeAll}>Tout voir</Text></Pressable>
          </View>
          {products.length === 0 ? (
            <EmptyState
              style={{ flex: 0, paddingVertical: spacing.xl }}
              icon="package"
              title="Aucun produit pour l'instant"
              message="Astuce IA : Publiez 3 produits dès aujourd'hui pour multiplier vos chances d'être vu par 47% de clients en plus !"
              hintLabel="🤖 Suggestion IA"
              action={
                <View style={styles.emptyActions}>
                  <Pressable style={[styles.createBtn, { flex: 1 }]} onPress={() => navigation.navigate('AddEditProduct')}>
                    <Feather name="plus" size={16} color={colors.textInverse} />
                    <Text style={styles.createBtnText}>Ajouter produit</Text>
                  </Pressable>
                  <Pressable style={[styles.createBtn, styles.createBtnGhost, { flex: 1 }]} onPress={() => navigation.navigate('AIProductAssistant')}>
                    <Feather name="cpu" size={16} color={colors.secondary} />
                    <Text style={[styles.createBtnText, { color: colors.secondary }]}>IA m'aide</Text>
                  </Pressable>
                </View>
              }
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {topProducts.map((p, i) => (
                <Pressable key={p.id} style={styles.topProduct} onPress={() => navigation.navigate('AddEditProduct', { productId: p.id })}>
                  <View style={styles.rankBadge}><Text style={styles.rankText}>{i + 1}</Text></View>
                  <Image source={{ uri: p.images?.[0]?.image_url }} style={styles.topImg} contentFit="cover" />
                  <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.topPrice}>{formatFCFA(p.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Commandes récentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {recentOrders.length === 0 ? (
            <EmptyState
              style={{ flex: 0, paddingVertical: spacing.xl }}
              icon="shopping-bag"
              title="En attente de premières commandes"
              message="Astuce IA : Partagez votre boutique sur WhatsApp/TikTok et activez une promo de lancement -5% pour booster vos 10 premières ventes !"
              hintLabel="🚀 Conseil croissance"
              action={
                <View style={styles.emptyActions}>
                  <Pressable style={[styles.createBtn, { flex: 1 }]} onPress={handleShareShop}>
                    <Feather name="share-2" size={16} color={colors.textInverse} />
                    <Text style={styles.createBtnText}>Partager</Text>
                  </Pressable>
                  <Pressable style={[styles.createBtn, styles.createBtnGhost, { flex: 1 }]} onPress={() => navigation.navigate('PromotionHub')}>
                    <Feather name="percent" size={16} color={colors.warning} />
                    <Text style={[styles.createBtnText, { color: colors.warning }]}>Créer promo</Text>
                  </Pressable>
                </View>
              }
            />
          ) : (
            recentOrders.map((order) => (
              <Pressable key={order.id} style={styles.orderItem} onPress={() => navigation.navigate('SellerOrders')}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>{formatRelativeDate(order.created_at)}</Text>
                </View>
                <Text style={styles.orderAmount}>{formatFCFA(order.total_amount)}</Text>
                <OrderStatusBadge status={order.status} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* 🚀 FABs : actions rapides flottantes (toujours accessibles sans scroll) */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        {/* FAB secondaire : Partager boutique (animé depuis le bas) */}
        <Animated.View
          style={[
            styles.fabSecondary,
            {
              transform: [
                { translateY: Animated.multiply(fabAnim, -84) },
                { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
              opacity: fabAnim,
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable
            style={[styles.fabBtn, styles.fabBtnSecondary]}
            onPress={() => { handleShareShop(); setFabOpen(false); Animated.spring(fabAnim, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start(); }}
            hitSlop={8}
          >
            <Feather name="share-2" size={20} color={colors.primary} />
            <Text style={styles.fabLabelSecondary}>Partager ma boutique</Text>
          </Pressable>
        </Animated.View>
        {/* FAB secondaire : Assistant IA */}
        <Animated.View
          style={[
            styles.fabSecondary,
            {
              transform: [
                { translateY: Animated.multiply(fabAnim, -148) },
                { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
              opacity: fabAnim,
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable
            style={[styles.fabBtn, styles.fabBtnSecondary]}
            onPress={() => { navigation.navigate('AIProductAssistant'); setFabOpen(false); Animated.spring(fabAnim, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start(); }}
            hitSlop={8}
          >
            <Feather name="cpu" size={20} color={colors.secondary} />
            <Text style={[styles.fabLabelSecondary, { color: colors.secondary }]}>Assistant IA</Text>
          </Pressable>
        </Animated.View>
        {/* FAB secondaire : Hub IA */}
        <Animated.View
          style={[
            styles.fabSecondary,
            {
              transform: [
                { translateY: Animated.multiply(fabAnim, -212) },
                { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              ],
              opacity: fabAnim,
            },
          ]}
          pointerEvents={fabOpen ? 'auto' : 'none'}
        >
          <Pressable
            style={[styles.fabBtn, styles.fabBtnSecondary]}
            onPress={() => { navigation.navigate('AIGlobalDashboard'); setFabOpen(false); Animated.spring(fabAnim, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start(); }}
            hitSlop={8}
          >
            <Feather name="grid" size={20} color="#8B5CF6" />
            <Text style={[styles.fabLabelSecondary, { color: '#8B5CF6' }]}>🤖 Hub IA</Text>
          </Pressable>
        </Animated.View>
        {/* FAB principal : toggle + ajouter produit */}
        <Pressable
          style={[styles.fabBtn, styles.fabPrimary]}
          onPress={() => {
            if (!fabOpen) {
              toggleFab();
            } else {
              // Ouvert -> cliquer = ajouter produit direct
              setFabOpen(false);
              Animated.spring(fabAnim, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();
              navigation.navigate('AddEditProduct');
            }
          }}
          hitSlop={12}
        >
          <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
            <Feather name="plus" size={26} color={colors.textInverse} />
          </Animated.View>
        </Pressable>
        {/* Label "Ajouter produit" permanent à côté du FAB */}
        <Animated.View
          style={[
            styles.fabMainLabel,
            {
              opacity: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateX: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.fabMainLabelText}>Ajouter produit</Text>
        </Animated.View>
      </View>

      {/* Scrim pour fermer le FAB expandable en cliquant ailleurs */}
      {fabOpen ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleFab} />
      ) : null}

      {/* 🔔 Toast de confirmation (auto-refresh + feedback visuel) */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            { transform: [{ translateY: toastAnim }] },
          ]}
        >
          <Feather name="check-circle" size={20} color={colors.success} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color, spark, sparkColor }: { icon: string; label: string; value: string; color: string; spark?: number[]; sparkColor?: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}><Feather name={icon as any} size={18} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {spark && spark.length > 0 ? (
        <Sparkline data={spark} height={22} color={sparkColor || color} />
      ) : null}
    </View>
  );
}

const MemoStatCard = memo(StatCard);

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}><Feather name={icon as any} size={22} color={colors.textInverse} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const MemoQuickAction = memo(QuickAction);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  headerActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  siteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryLight + '33', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  siteBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary },
  badgesRow: { marginBottom: spacing.md },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  statsTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  dashThread: { alignSelf: 'center', marginBottom: spacing.md },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderWidth: 0, borderTopLeftRadius: 22, borderTopRightRadius: radius.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: 22, ...shadows.fani },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  statLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2, fontWeight: typography.weights.medium, letterSpacing: typography.letterSpacings.wide },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  quickAction: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.text, textAlign: 'center' },
  deliverySection: { marginBottom: spacing.xl },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  deliveryDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: { marginBottom: spacing.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight, marginBottom: spacing.md },
  seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  topProduct: { width: 120, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, position: 'relative' },
  rankBadge: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  rankText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse },
  topImg: { width: '100%', height: 90, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, marginBottom: spacing.xs },
  topName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.text },
  topPrice: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  orderInfo: { flex: 1 },
  orderId: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  orderDate: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  orderAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text, marginRight: spacing.sm },
  emptyText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
  emptyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.lg, marginTop: spacing.lg },
  createBtnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderLight, marginTop: spacing.lg },
  createBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
  // FABs flottants
  fabWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl + 6,
    alignItems: 'flex-end',
    zIndex: 900,
  },
  fabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    ...Platform.select({
      web: { cursor: 'pointer' as any },
    }),
  },
  fabPrimary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  fabSecondary: {
    position: 'absolute',
    right: 0,
    bottom: 68,
    width: 240,
  },
  fabBtnSecondary: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    paddingHorizontal: spacing.md,
    justifyContent: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowOpacity: 0.08,
    elevation: 3,
  },
  fabLabelSecondary: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  fabMainLabel: {
    position: 'absolute',
    right: 72,
    bottom: 14,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  fabMainLabelText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  toast: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  toastText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
    flex: 1,
  },
});
