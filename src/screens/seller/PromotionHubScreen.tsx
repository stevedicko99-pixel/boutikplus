import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner } from '@/lib/dataService';
import {
  getShopPromotionKpi,
  formatPromoFCFA,
  formatRate,
  type ShopPromotionKpi,
} from '@/lib/promotionService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Shop } from '@/types/models';

interface PromotionHubScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export function PromotionHubScreen({ navigation }: PromotionHubScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [kpi, setKpi] = useState<ShopPromotionKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const ownerId = profile?.id ?? 'demo-seller';
    const s = await getShopByOwner(ownerId);
    setShop(s);
    if (s) {
      const k = await getShopPromotionKpi(s.id);
      setKpi(k);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={navigation.goBack} title="Promotions" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header onBack={navigation.goBack} title="Promotions" />
        <View style={styles.emptyWrap}>
          <Feather name="briefcase" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Créez d'abord votre boutique pour accéder aux outils de promotion.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const convRate =
    kpi && kpi.total_clicks_7d > 0
      ? kpi.total_conversions_7d / kpi.total_clicks_7d
      : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onBack={navigation.goBack} title="Promotions" shopName={shop.name} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Aperçu performance 7 jours */}
        {kpi ? (
          <View style={styles.kpiCard}>
            <Text style={styles.kpiTitle}>Performance des 7 derniers jours</Text>
            <View style={styles.kpiRow}>
              <KpiItem
                icon="eye"
                label="Vues"
                value={`${kpi.total_views_7d}`}
                color={colors.info}
              />
              <KpiItem
                icon="mouse-pointer"
                label="Clics"
                value={`${kpi.total_clicks_7d}`}
                color={colors.primary}
              />
              <KpiItem
                icon="check-circle"
                label="Ventes"
                value={`${kpi.total_conversions_7d}`}
                color={colors.success}
              />
            </View>
            <View style={styles.kpiFooter}>
              <View style={styles.kpiFooterItem}>
                <Text style={styles.kpiFooterLabel}>Revenu estimé</Text>
                <Text style={styles.kpiFooterValue}>
                  {formatPromoFCFA(kpi.total_revenue_7d)}
                </Text>
              </View>
              <View style={styles.kpiFooterDivider} />
              <View style={styles.kpiFooterItem}>
                <Text style={styles.kpiFooterLabel}>Taux conversion</Text>
                <Text style={styles.kpiFooterValue}>{formatRate(convRate)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 4 cartes d'action principales */}
        <Text style={styles.sectionTitle}>Outils de promotion</Text>
        <View style={styles.actionGrid}>
          <HubAction
            icon="share-2"
            label="Liens partagés"
            desc={`${kpi?.total_links ?? 0} lien(s) actif(s)`}
            color={colors.primary}
            onPress={() => navigation.navigate('ShareLinkManagement')}
          />
          <HubAction
            icon="percent"
            label="Codes promo"
            desc={`${kpi?.active_discount_codes ?? 0} actif(s)`}
            color={colors.secondary}
            onPress={() => navigation.navigate('DiscountCodeManagement')}
          />
          <HubAction
            icon="bell"
            label="Annonces & offres"
            desc={`${kpi?.active_promotions ?? 0} en cours`}
            color={colors.warning}
            onPress={() => navigation.navigate('Promotions')}
          />
          <HubAction
            icon="bar-chart-2"
            label="Statistiques"
            desc="Voir les performances"
            color={colors.info}
            onPress={() => navigation.navigate('CampaignAnalytics')}
          />
        </View>

        {/* Partage rapide de la boutique */}
        <Pressable
          style={styles.quickShareCard}
          onPress={() =>
            navigation.navigate('ShareableShop', {
              shopId: shop.id,
              shopName: shop.name,
              shopLogo: shop.logo_url ?? undefined,
            })
          }
        >
          <View style={[styles.quickShareIcon, { backgroundColor: colors.primary }]}>
            <Feather name="share-2" size={22} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickShareTitle}>Partager ma boutique maintenant</Text>
            <Text style={styles.quickShareDesc}>
              WhatsApp, Facebook, QR code — avec suivi des clics
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>

        {/* Recommandations */}
        <Text style={styles.sectionTitle}>Suggestions</Text>
        <View style={styles.tipCard}>
          <View style={[styles.tipIcon, { backgroundColor: colors.success + '18' }]}>
            <Feather name="zap" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Créez un code de bienvenue</Text>
            <Text style={styles.tipText}>
              Un code -10% incite les nouveaux acheteurs à passer leur première
              commande.
            </Text>
          </View>
        </View>
        <View style={styles.tipCard}>
          <View style={[styles.tipIcon, { backgroundColor: colors.info + '18' }]}>
            <Feather name="grid" size={18} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Imprimez un QR code</Text>
            <Text style={styles.tipText}>
              Affichez-le en boutique pour que vos clients ouvrent votre
              catalogue en un scan.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  title,
  shopName,
}: {
  onBack: () => void;
  title: string;
  shopName?: string;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}>
        <Feather name="arrow-left" size={24} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={styles.title}>{title}</Text>
        {shopName ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {shopName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function KpiItem({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.kpiItem}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function HubAction({
  icon,
  label,
  desc,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  desc: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.hubAction, pressed && { opacity: 0.95 }]}
      onPress={onPress}
    >
      <View style={[styles.hubIcon, { backgroundColor: color }]}>
        <Feather name={icon as any} size={26} color={colors.textInverse} />
      </View>
      <Text style={styles.hubLabel}>{label}</Text>
      <Text style={styles.hubDesc} numberOfLines={1}>
        {desc}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  kpiTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  kpiItem: {
    alignItems: 'center',
    gap: 4,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  kpiFooterItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiFooterDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderLight,
  },
  kpiFooterLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  kpiFooterValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  hubAction: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    gap: spacing.sm,
  },
  hubIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  hubDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  quickShareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  quickShareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickShareTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  quickShareDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  tipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
