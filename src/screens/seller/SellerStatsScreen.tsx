import { useState, useEffect, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getSellerOrders, getShopByOwner, getProductsByShop, getShopReviews, getTopViewedProducts } from '@/lib/dataService';
import { PageLoader } from '@/components/ui/PageLoader';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { formatFCFA, formatNumber } from '@/lib/format';
import type { Order, OrderItem, Payment, ProductWithImages, Review } from '@/types/models';

interface SellerStatsScreenProps {
  navigation: { goBack: () => void };
}

type Period = 'day' | 'week' | 'month';

export function SellerStatsScreen({ navigation }: SellerStatsScreenProps) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[]; payment?: Payment })[]>([]);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [topViewed, setTopViewed] = useState<{ product_id: string; product_name: string; view_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    (async () => {
      const [ords, shop] = await Promise.all([
        getSellerOrders(profile?.id ?? 'demo-seller'),
        getShopByOwner(profile?.id ?? 'demo-seller'),
      ]);
      setOrders(ords as any);
      if (shop) {
        const [prods, revs, viewed] = await Promise.all([
          getProductsByShop(shop.id),
          getShopReviews(shop.id),
          getTopViewedProducts(shop.id, 5),
        ]);
        setProducts(prods);
        setReviews(revs);
        setTopViewed(viewed);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><PageLoader /></SafeAreaView>;

  // Filtre commandes non annulées et non en attente
  const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment');
  const now = new Date();
  const periodStart = new Date(now);
  if (period === 'day') periodStart.setHours(0, 0, 0, 0);
  if (period === 'week') periodStart.setDate(now.getDate() - 7);
  if (period === 'month') periodStart.setMonth(now.getMonth() - 1);

  const periodOrders = validOrders.filter((o) => new Date(o.created_at) >= periodStart);
  const prevPeriodStart = new Date(periodStart);
  if (period === 'day') prevPeriodStart.setDate(prevPeriodStart.getDate() - 1);
  if (period === 'week') prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);
  if (period === 'month') prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
  const prevPeriodOrders = validOrders.filter(
    (o) => new Date(o.created_at) >= prevPeriodStart && new Date(o.created_at) < periodStart,
  );

  const currentRevenue = periodOrders.reduce((s, o) => s + o.total_amount, 0);
  const prevRevenue = prevPeriodOrders.reduce((s, o) => s + o.total_amount, 0);
  const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  // Produits les plus vendus
  const productSales = new Map<string, { name: string; qty: number; revenue: number; views: number }>();
  for (const o of validOrders) {
    for (const it of o.items ?? []) {
      const existing = productSales.get(it.product_id) ?? {
        name: it.product?.name ?? 'Produit',
        qty: 0,
        revenue: 0,
        views: 0,
      };
      existing.qty += it.quantity;
      existing.revenue += it.quantity * it.unit_price;
      productSales.set(it.product_id, existing);
    }
  }
  // Produits vus (données réelles depuis la base)
  const productViews = new Map<string, { name: string; views: number }>();
  for (const p of products) {
    productViews.set(p.id, { name: p.name, views: p.views_count ?? 0 });
  }
  // Compléter avec le topViewed récupéré séparément pour garantir les données
  for (const tv of topViewed) {
    if (!productViews.has(tv.product_id)) {
      productViews.set(tv.product_id, { name: tv.product_name, views: tv.view_count });
    }
  }

  const topBySales = [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topByViews = [...productViews.values()].sort((a, b) => b.views - a.views).slice(0, 5);
  const maxSales = topBySales[0]?.qty ?? 1;
  const maxViews = topByViews[0]?.views ?? 1;

  // Taux de conversion
  const totalViews = [...productViews.values()].reduce((s, p) => s + p.views, 0);
  const totalOrders = validOrders.length;
  const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

  // Clients récurrents vs nouveaux
  const buyerMap = new Map<string, number>();
  for (const o of validOrders) {
    buyerMap.set(o.buyer_id, (buyerMap.get(o.buyer_id) ?? 0) + 1);
  }
  const returningBuyers = [...buyerMap.values()].filter((c) => c > 1).length;
  const newBuyers = buyerMap.size - returningBuyers;

  // Données graphique
  const chartData = generateChartData(validOrders, period);
  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  // Statuts
  const statusCount = {
    pending_payment: orders.filter((o) => o.status === 'pending_payment').length,
    proof_uploaded: orders.filter((o) => o.status === 'proof_uploaded').length,
    payment_validated: orders.filter((o) => o.status === 'payment_validated').length,
    in_delivery: orders.filter((o) => o.status === 'in_delivery').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  const avgOrder = validOrders.length ? currentRevenue / periodOrders.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Feather name="bar-chart-2" size={24} color={colors.text} onPress={navigation.goBack} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Statistiques détaillées</Text>
          <StampBadge label="Stats" color={colors.primaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>
      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sélecteur de période */}
        <View style={styles.periodSelector}>
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'day' ? 'Aujourd\'hui' : p === 'week' ? '7 jours' : '30 jours'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* KPIs principaux */}
        <View style={styles.kpiRow}>
          <KpiCard
            icon="dollar-sign"
            label={`CA sur ${period === 'day' ? 'la journée' : period === 'week' ? '7 jours' : '30 jours'}`}
            value={formatFCFA(currentRevenue)}
            color={colors.success}
            trend={revenueChange}
          />
          <KpiCard
            icon="shopping-bag"
            label="Commandes"
            value={`${periodOrders.length}`}
            color={colors.primary}
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard
            icon="trending-up"
            label="Panier moyen"
            value={formatFCFA(Math.round(avgOrder))}
            color={colors.secondary}
          />
          <KpiCard
            icon="check-circle"
            label="Taux conversion"
            value={`${conversionRate.toFixed(1)}%`}
            color={colors.info}
          />
        </View>

        {/* Graphique à barres des ventes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chiffre d'affaires</Text>
          <View style={styles.chartContainer}>
            {chartData.map((point, i) => {
              const barHeight = (point.value / maxChartValue) * 150;
              return (
                <View key={i} style={styles.chartBarCol}>
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: Math.max(barHeight, 3) },
                        i === chartData.length - 1 && styles.chartBarLatest,
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{point.label}</Text>
                </View>
              );
            })}
          </View>
          {prevRevenue > 0 ? (
            <Text style={styles.comparisonText}>
              {revenueChange >= 0 ? '📈' : '📉'} {Math.abs(revenueChange).toFixed(1)}% vs période précédente
            </Text>
          ) : null}
        </View>

        {/* Top produits par ventes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Produits les plus vendus</Text>
          {topBySales.length === 0 ? (
            <Text style={styles.emptyText}>Pas encore de ventes</Text>
          ) : (
            topBySales.map((p, i) => (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barRank}>{i + 1}</Text>
                <Text style={styles.barName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(p.qty / maxSales) * 100}%` }]} />
                </View>
                <Text style={styles.barQty}>{p.qty}×</Text>
              </View>
            ))
          )}
        </View>

        {/* Top produits par vues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👀 Produits les plus vus</Text>
          {topByViews.length === 0 ? (
            <Text style={styles.emptyText}>Pas encore de données</Text>
          ) : (
            topByViews.map((p, i) => (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barRank}>{i + 1}</Text>
                <Text style={styles.barName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(p.views / maxViews) * 100}%`, backgroundColor: colors.info }]} />
                </View>
                <Text style={styles.barQty}>{p.views}</Text>
              </View>
            ))
          )}
        </View>

        {/* Clients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Analyse clients</Text>
          <View style={styles.clientRow}>
            <View style={[styles.clientCard, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.clientNum, { color: colors.primary }]}>{buyerMap.size}</Text>
              <Text style={styles.clientLabel}>Clients totaux</Text>
            </View>
            <View style={[styles.clientCard, { backgroundColor: colors.success + '18' }]}>
              <Text style={[styles.clientNum, { color: colors.success }]}>{returningBuyers}</Text>
              <Text style={styles.clientLabel}>Récurrents</Text>
            </View>
            <View style={[styles.clientCard, { backgroundColor: colors.info + '18' }]}>
              <Text style={[styles.clientNum, { color: colors.info }]}>{newBuyers}</Text>
              <Text style={styles.clientLabel}>Nouveaux</Text>
            </View>
          </View>
        </View>

        {/* Répartition des commandes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 État des commandes</Text>
          <StatusLine label="En attente" count={statusCount.pending_payment} total={orders.length} color={colors.warning} />
          <StatusLine label="À valider" count={statusCount.proof_uploaded} total={orders.length} color={colors.info} />
          <StatusLine label="En préparation" count={statusCount.payment_validated} total={orders.length} color={colors.secondary} />
          <StatusLine label="En livraison" count={statusCount.in_delivery} total={orders.length} color={colors.primary} />
          <StatusLine label="Livrées" count={statusCount.delivered} total={orders.length} color={colors.success} />
        </View>

        {/* Catalogue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Mon catalogue</Text>
          <View style={styles.catalogRow}>
            <View style={styles.catalogItem}>
              <Text style={styles.catalogNum}>{products.length}</Text>
              <Text style={styles.catalogLabel}>Produits</Text>
            </View>
            <View style={styles.catalogItem}>
              <Text style={styles.catalogNum}>{products.filter((p) => p.status === 'available').length}</Text>
              <Text style={styles.catalogLabel}>Disponibles</Text>
            </View>
            <View style={styles.catalogItem}>
              <Text style={styles.catalogNum}>{products.filter((p) => p.status === 'out_of_stock').length}</Text>
              <Text style={styles.catalogLabel}>Rupture</Text>
            </View>
            <View style={styles.catalogItem}>
              <Text style={styles.catalogNum}>{reviews.length}</Text>
              <Text style={styles.catalogLabel}>Avis</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const KpiCard = memo(function KpiCard({
  icon,
  label,
  value,
  color,
  trend,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  trend?: number;
}) {
  return (
    <View style={[styles.kpiCard, { borderColor: color + '30' }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiValue}>{value}</Text>
        {trend != null && trend !== 0 ? (
          <Text style={[styles.trend, trend > 0 ? styles.trendUp : styles.trendDown]}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </Text>
        ) : null}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
});

const StatusLine = memo(function StatusLine({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={styles.statusTrack}>
        <View style={[styles.statusFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statusCount}>{count}</Text>
    </View>
  );
});

function generateChartData(orders: Order[], period: Period) {
  const points: { label: string; value: number }[] = [];
  const now = new Date();

  let pointsCount = 7;
  if (period === 'day') pointsCount = 12;
  if (period === 'month') pointsCount = 30;

  for (let i = pointsCount - 1; i >= 0; i--) {
    const date = new Date(now);
    if (period === 'day') {
      date.setHours(now.getHours() - i);
      points.push({ label: `${date.getHours()}h`, value: 0 });
    } else if (period === 'week') {
      date.setDate(now.getDate() - i);
      points.push({ label: getDayShort(date), value: 0 });
    } else {
      date.setDate(now.getDate() - i);
      points.push({ label: `${date.getDate()}`, value: 0 });
    }
  }

  // Remplissage avec les commandes
  for (const o of orders) {
    if (o.status === 'cancelled' || o.status === 'pending_payment') continue;
    const oDate = new Date(o.created_at);
    for (const p of points) {
      if (period === 'day') {
        if (oDate.getHours() === parseInt(p.label) && isSameDay(oDate, now)) {
          p.value += o.total_amount;
        }
      } else if (period === 'week') {
        const pDate = new Date(now);
        const idx = points.indexOf(p);
        pDate.setDate(now.getDate() - (points.length - 1 - idx));
        if (isSameDay(oDate, pDate)) {
          p.value += o.total_amount;
        }
      } else {
        const pDate = new Date(now);
        const idx = points.indexOf(p);
        pDate.setDate(now.getDate() - (points.length - 1 - idx));
        if (isSameDay(oDate, pDate)) {
          p.value += o.total_amount;
        }
      }
    }
  }

  // Minimum visible pour le dernier point
  return points;
}

function getDayShort(date: Date) {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  periodChip: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  periodChipActive: { backgroundColor: colors.primary },
  periodText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
  },
  periodTextActive: { color: colors.textInverse, fontWeight: typography.weights.bold },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kpiValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  trend: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.bold },
  trendUp: { color: colors.success },
  trendDown: { color: colors.danger },
  kpiLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 170,
    gap: 3,
    marginBottom: spacing.sm,
  },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBarTrack: { width: '100%', height: 150, backgroundColor: colors.surfaceAlt, borderRadius: 4, justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  chartBarLatest: { backgroundColor: colors.success },
  chartLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  comparisonText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: typography.weights.semibold,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.md,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barRank: {
    width: 20,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  barName: {
    width: 100,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
  },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  barQty: {
    width: 30,
    textAlign: 'right',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  clientRow: { flexDirection: 'row', gap: spacing.sm },
  clientCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  clientNum: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
  },
  clientLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    marginTop: 2,
  },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLabel: { width: 100, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  statusTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 4 },
  statusCount: {
    width: 24,
    textAlign: 'right',
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  catalogRow: { flexDirection: 'row', justifyContent: 'space-around' },
  catalogItem: { alignItems: 'center' },
  catalogNum: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  catalogLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
