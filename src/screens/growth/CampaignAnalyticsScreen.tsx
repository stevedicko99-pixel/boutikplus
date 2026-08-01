import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner } from '@/lib/dataService';
import {
  getShopAnalytics,
  getShareLinkAnalytics,
  getCampaignComparison,
  formatPromoFCFA,
  formatRate,
} from '@/lib/promotionService';
import { AnalyticsChart } from '@/components/promotion/AnalyticsChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  Shop,
  CampaignAnalyticsSummary,
  CampaignComparison,
  ShareLinkMedium,
} from '@/types/models';

interface CampaignAnalyticsScreenProps {
  navigation: { goBack: () => void };
  route: { params?: { linkId?: string } };
}

type Period = 'day' | 'week' | 'month';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
];

const MEDIUM_LABELS: Record<ShareLinkMedium, string> = {
  social: 'Réseaux sociaux',
  qr: 'QR code',
  link: 'Lien direct',
  flyer: 'Flyer',
  sms: 'SMS',
};

export function CampaignAnalyticsScreen({
  navigation,
  route,
}: CampaignAnalyticsScreenProps) {
  const { profile } = useAuth();
  const linkId = route.params?.linkId;
  const [shop, setShop] = useState<Shop | null>(null);
  const [summary, setSummary] = useState<CampaignAnalyticsSummary | null>(null);
  const [comparison, setComparison] = useState<CampaignComparison[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const ownerId = profile?.id ?? 'demo-seller';
    const s = await getShopByOwner(ownerId);
    setShop(s);
    if (s) {
      const [summ, comp] = await Promise.all([
        linkId
          ? getShareLinkAnalytics(linkId, period)
          : getShopAnalytics(s.id, period),
        getCampaignComparison(s.id),
      ]);
      setSummary(summ);
      // Si on regarde un lien spécifique, on filtre la comparaison
      setComparison(linkId ? comp.filter((c) => c.id === linkId) : comp);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile, period, linkId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Statistiques</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt) => {
          const selected = period === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.periodChip,
                selected && styles.periodChipActive,
              ]}
              onPress={() => {
                setPeriod(opt.value);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.periodText,
                  selected && styles.periodTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : !shop ? (
        <EmptyState
          icon="bar-chart-2"
          title="Aucune boutique"
          message="Créez votre boutique pour voir vos statistiques."
        />
      ) : !summary || summary.total_views === 0 ? (
        <EmptyState
          icon="bar-chart-2"
          title="Pas encore de données"
          message="Partagez vos liens de promotion pour générer des vues, des clics et des ventes. Les statistiques apparaîtront ici."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 4 KPI cards */}
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="eye"
              label="Vues"
              value={`${summary.total_views}`}
              color={colors.info}
            />
            <KpiCard
              icon="mouse-pointer"
              label="Clics"
              value={`${summary.total_clicks}`}
              color={colors.primary}
              sub={`CTR ${formatRate(summary.click_through_rate)}`}
            />
            <KpiCard
              icon="check-circle"
              label="Ventes"
              value={`${summary.total_conversions}`}
              color={colors.success}
              sub={`Conv. ${formatRate(summary.conversion_rate)}`}
            />
            <KpiCard
              icon="dollar-sign"
              label="Revenu"
              value={formatPromoFCFA(summary.total_revenue)}
              color={colors.warning}
              compact
            />
          </View>

          {/* Graphique */}
          <Text style={styles.sectionTitle}>
            Évolution ({period === 'day' ? '24h' : period === 'week' ? '7j' : '30j'})
          </Text>
          <AnalyticsChart data={summary} height={200} />

          {/* Répartition par canal */}
          {summary.by_medium.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Répartition par canal</Text>
              <View style={styles.breakdownCard}>
                {summary.by_medium
                  .sort((a, b) => b.views - a.views)
                  .map((m) => {
                    const totalMedium =
                      m.views + m.clicks + m.conversions;
                    const pct =
                      summary.total_views > 0
                        ? Math.round((m.views / summary.total_views) * 100)
                        : 0;
                    return (
                      <View key={m.medium} style={styles.breakdownRow}>
                        <View style={styles.breakdownHeader}>
                          <Text style={styles.breakdownLabel}>
                            {MEDIUM_LABELS[m.medium] ?? m.medium}
                          </Text>
                          <Text style={styles.breakdownPct}>{pct}% des vues</Text>
                        </View>
                        <View style={styles.breakdownStats}>
                          <Text style={styles.breakdownStat}>
                            {m.views} vues · {m.clicks} clics · {m.conversions} ventes
                          </Text>
                          <Text style={styles.breakdownRevenue}>
                            {formatPromoFCFA(m.revenue)}
                          </Text>
                        </View>
                        <View style={styles.breakdownBar}>
                          <View
                            style={[
                              styles.breakdownBarFill,
                              { width: `${Math.max(2, pct)}%`, backgroundColor: colors.primary },
                            ]}
                          />
                        </View>
                        {totalMedium === 0 ? null : null}
                      </View>
                    );
                  })}
              </View>
            </View>
          ) : null}

          {/* Comparaison des campagnes */}
          {comparison.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {linkId ? 'Ce lien' : 'Tous les liens'}
              </Text>
              <View style={styles.comparisonCard}>
                {comparison
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((c) => (
                    <View key={c.id} style={styles.comparisonRow}>
                      <View style={styles.comparisonLabelWrap}>
                        <Feather
                          name="link"
                          size={14}
                          color={colors.textMuted}
                        />
                        <Text style={styles.comparisonLabel} numberOfLines={1}>
                          {c.label}
                        </Text>
                      </View>
                      <View style={styles.comparisonStats}>
                        <Text style={styles.comparisonStat}>
                          {c.views}v · {c.clicks}c · {c.conversions}vte
                        </Text>
                        <Text style={styles.comparisonRevenue}>
                          {formatPromoFCFA(c.revenue)}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  sub,
  compact,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  sub?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, { borderColor: color + '30' }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text
        style={[
          styles.kpiValue,
          compact && { fontSize: typography.sizes.body },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  periodTextActive: {
    color: colors.textInverse,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  kpiLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  kpiSub: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  breakdownRow: {
    marginBottom: spacing.md,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  breakdownPct: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  breakdownStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownStat: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  breakdownRevenue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  breakdownBar: {
    height: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  comparisonLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: spacing.sm,
  },
  comparisonLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  comparisonStats: {
    alignItems: 'flex-end',
  },
  comparisonStat: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  comparisonRevenue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
});
