import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '@/theme';
import { getAllShops, getReports, getProductCount, getUserCount } from '@/lib/dataService';
import { PageLoader } from '@/components/ui/PageLoader';
import { formatRelativeDate } from '@/lib/format';
import type { Shop } from '@/types/models';

interface AdminDashboardScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [recentShops, setRecentShops] = useState<Shop[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [all, r, p, uc] = await Promise.all([
        getAllShops(),
        getReports(),
        getProductCount(),
        getUserCount(),
      ]);
      setAllShops(all);
      setRecentShops(all.slice(0, 5));
      setReports(r);
      setProductCount(p);
      setUserCount(uc);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ⚡ Auto-refresh à chaque focus — l'admin voit les changements en temps réel
  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><PageLoader /></SafeAreaView>;

  const activeShops = allShops.filter((s) => s.status === 'active').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour"><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Administration</Text>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          hitSlop={10}
          style={styles.siteBtn}
          accessibilityRole="button"
          accessibilityLabel="Retourner sur le site"
        >
          <Feather name="home" size={16} color={colors.primary} />
          <Text style={styles.siteBtnText}>Site</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, wide && styles.wideContent]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Statistiques globales — TOUTES les boutiques, pas juste pending */}
        <View style={styles.statsGrid}>
          <StatBox icon="briefcase" value={`${allShops.length}`} sublabel={`${activeShops} actives`} label="Boutiques" color={colors.primary} onPress={() => navigation.navigate('ShopValidation')} />
          <StatBox icon="package" value={`${productCount}`} label="Produits" color={colors.secondary} onPress={() => navigation.navigate('ProductManagement')} />
          <StatBox icon="alert-circle" value={`${reports.length}`} label="Signalements" color={colors.danger} onPress={() => navigation.navigate('Reports')} />
          <StatBox icon="users" value={`${userCount}`} label="Utilisateurs" color={colors.success} />
        </View>

        {/* Toutes les boutiques (récentes) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Toutes les boutiques</Text>
            <Pressable onPress={() => navigation.navigate('ShopValidation')}><Text style={styles.seeAll}>Voir tout ({allShops.length})</Text></Pressable>
          </View>
          {recentShops.length === 0 ? (
            <Text style={styles.emptyText}>Aucune boutique pour le moment</Text>
          ) : (
            recentShops.map((shop) => (
              <Pressable key={shop.id} style={styles.shopRow} onPress={() => navigation.navigate('ShopValidation')}>
                <View style={styles.shopLogo}>
                  {shop.logo_url ? (
                    <View style={styles.shopLogoImg} />
                  ) : (
                    <Feather name="briefcase" size={18} color={colors.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                  <Text style={styles.shopMeta}>{shop.city} · {formatRelativeDate(shop.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, shop.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusBadgeText, { color: shop.status === 'active' ? colors.success : colors.textMuted }]}>
                    {shop.status === 'active' ? 'Active' : 'En pause'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>

        {/* Signalements */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Signalements récents</Text>
            <Pressable onPress={() => navigation.navigate('Reports')}><Text style={styles.seeAll}>Voir tout</Text></Pressable>
          </View>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>Aucun signalement</Text>
          ) : (
            reports.slice(0, 3).map((r) => (
              <Pressable key={r.id} style={styles.reportRow} onPress={() => navigation.navigate('Reports')}>
                <View style={[styles.reportIcon, { backgroundColor: '#FDECEC' }]}><Feather name="alert-triangle" size={16} color={colors.danger} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportReason}>{r.reason}</Text>
                  <Text style={styles.reportMeta}>{r.target_type} · {formatRelativeDate(r.created_at)}</Text>
                </View>
                <View style={[styles.reportStatus, { backgroundColor: '#FFF8E1' }]}><Text style={[styles.reportStatusText, { color: colors.warning }]}>En attente</Text></View>
              </Pressable>
            ))
          )}
        </View>

        {/* Actions rapides — accès complet à la modération */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modération</Text>
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionCard} onPress={() => navigation.navigate('ShopValidation')}>
              <Feather name="check-square" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Gérer boutiques</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => navigation.navigate('ProductManagement')}>
              <Feather name="package" size={24} color={colors.secondary} />
              <Text style={styles.actionText}>Gérer produits</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Reports')}>
              <Feather name="flag" size={24} color={colors.danger} />
              <Text style={styles.actionText}>Signalements</Text>
              {reports.length > 0 ? <View style={[styles.actionBadge, { backgroundColor: colors.danger }]}><Text style={styles.actionBadgeText}>{reports.length}</Text></View> : null}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label, sublabel, color, onPress }: { icon: string; value: string; label: string; sublabel?: string; color: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.statBox} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}><Feather name={icon as any} size={20} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel ? <Text style={styles.statSublabel}>{sublabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  wideContent: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statBox: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold, color: colors.text },
  statLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  statSublabel: { fontFamily: typography.fontFamily, fontSize: 10, color: colors.success, fontWeight: typography.weights.semibold, marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text },
  seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  shopLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shopLogoImg: { width: '100%', height: '100%', backgroundColor: '#FFF0E0' },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  shopMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusActive: { backgroundColor: colors.success + '18' },
  statusInactive: { backgroundColor: colors.surfaceAlt },
  statusBadgeText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  reportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportReason: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  reportMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  reportStatus: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  reportStatusText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  emptyText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionCard: { flex: 1, minWidth: 130, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  actionText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  actionBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  actionBadgeText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.bold, color: colors.textInverse },
  siteBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primaryLight + '33', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  siteBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.primary },
});
