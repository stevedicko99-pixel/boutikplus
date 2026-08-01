import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getPendingShops, getReports, getProducts } from '@/lib/dataService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatRelativeDate } from '@/lib/format';
import type { Shop } from '@/types/models';

interface AdminDashboardScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function AdminDashboardScreen({ navigation }: AdminDashboardScreenProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, r, p] = await Promise.all([getPendingShops(), getReports(), getProducts({ limit: 999 })]);
      setShops(s);
      setReports(r);
      setProductCount(p.length);
      setLoading(false);
    })();
  }, []);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><LoadingSpinner /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Administration</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Statistiques globales */}
        <View style={styles.statsGrid}>
          <StatBox icon="briefcase" value={`${shops.length}`} label="Boutiques" color={colors.primary} onPress={() => navigation.navigate('ShopValidation')} />
          <StatBox icon="package" value={`${productCount}`} label="Produits" color={colors.secondary} />
          <StatBox icon="alert-circle" value={`${reports.length}`} label="Signalements" color={colors.danger} onPress={() => navigation.navigate('Reports')} />
          <StatBox icon="users" value="128" label="Utilisateurs" color={colors.success} />
        </View>

        {/* Boutiques à valider */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Boutiques à valider</Text>
            <Pressable onPress={() => navigation.navigate('ShopValidation')}><Text style={styles.seeAll}>Voir tout</Text></Pressable>
          </View>
          {shops.slice(0, 3).map((shop) => (
            <Pressable key={shop.id} style={styles.shopRow} onPress={() => navigation.navigate('ShopValidation')}>
              <View style={styles.shopLogo}><Feather name="briefcase" size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
                <Text style={styles.shopMeta}>{shop.city} · {formatRelativeDate(shop.created_at)}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
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

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionCard} onPress={() => navigation.navigate('ShopValidation')}>
              <Feather name="check-square" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Valider boutiques</Text>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => navigation.navigate('Reports')}>
              <Feather name="flag" size={24} color={colors.danger} />
              <Text style={styles.actionText}>Traiter signalements</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label, color, onPress }: { icon: string; value: string; label: string; color: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.statBox} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}><Feather name={icon as any} size={20} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statBox: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold, color: colors.text },
  statLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  section: { marginBottom: spacing.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text },
  seeAll: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  shopLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E0', alignItems: 'center', justifyContent: 'center' },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  shopMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  reportIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportReason: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  reportMeta: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  reportStatus: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  reportStatusText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  emptyText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: spacing.md },
  actionCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
  actionText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
});
