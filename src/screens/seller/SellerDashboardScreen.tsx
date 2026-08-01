import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProductsByShop, getSellerOrders } from '@/lib/dataService';
import { formatFCFA, formatRelativeDate } from '@/lib/format';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Image } from 'expo-image';
import { TrustBadges, calculateTrustBadges, type TrustBadge } from '@/components/growth/TrustBadges';
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

  useEffect(() => {
    (async () => {
      const ownerId = profile?.id ?? 'demo-seller';
      const s = await getShopByOwner(ownerId);
      setShop(s);
      if (s) {
        const [prods, ords] = await Promise.all([getProductsByShop(s.id), getSellerOrders(ownerId)]);
        setProducts(prods);
        setOrders(ords as any);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><LoadingSpinner /></SafeAreaView>;

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

  const monthSales = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0);
  const pendingOrders = orders.filter((o) => o.status === 'proof_uploaded' || o.status === 'pending_payment').length;
  const activeProducts = products.filter((p) => p.status === 'available').length;
  const recentOrders = orders.slice(0, 5);
  const topProducts = products.slice(0, 5);

  // Badges de confiance
  const trustBadges = calculateTrustBadges({
    isVerified: shop?.status === 'active',
    averageRating: 4.5,
    totalReviews: 5,
    deliveryDays: 3,
    totalOrders: orders.length,
    cancellationRate: 0.02,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: shop.status === 'active' ? colors.success : colors.textMuted }]} />
            <Text style={styles.statusText}>{shop.status === 'active' ? 'Active' : 'En pause'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('ShareLinkManagement')}>
            <Feather name="share-2" size={20} color={colors.primary} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('ReferralProgram')}>
            <Feather name="gift" size={20} color={colors.secondary} />
          </Pressable>
          <Pressable hitSlop={10}><Feather name="edit-2" size={20} color={colors.primary} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Badges de confiance */}
        <View style={styles.badgesRow}>
          <TrustBadges badges={trustBadges} size="sm" />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="trending-up" label="Ventes du mois" value={formatFCFA(monthSales)} color={colors.success} />
          <StatCard icon="clock" label="En attente" value={`${pendingOrders}`} color={colors.warning} />
          <StatCard icon="package" label="Produits actifs" value={`${activeProducts}`} color={colors.primary} />
        </View>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickAction icon="plus-circle" label="Ajouter\nproduit" color={colors.primary} onPress={() => navigation.navigate('AddEditProduct')} />
          <QuickAction icon="cpu" label="Assistant\nIA" color={colors.secondary} onPress={() => navigation.navigate('AIProductAssistant')} />
          <QuickAction icon="shopping-bag" label="Mes\ncommandes" color={colors.primary} onPress={() => navigation.navigate('SellerOrders')} />
          <QuickAction icon="percent" label="Créer\npromo" color={colors.warning} onPress={() => navigation.navigate('PromotionHub')} />
          <QuickAction icon="bar-chart-2" label="Stat\nistiques" color={colors.info} onPress={() => navigation.navigate('SellerStats')} />
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
        </View>

        {/* Commandes récentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>Aucune commande pour le moment</Text>
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
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}><Feather name={icon as any} size={18} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}><Feather name={icon as any} size={22} color={colors.textInverse} /></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  headerActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  badgesRow: { marginBottom: spacing.md },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  statLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
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
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md },
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
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.lg, marginTop: spacing.lg },
  createBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textInverse },
});
