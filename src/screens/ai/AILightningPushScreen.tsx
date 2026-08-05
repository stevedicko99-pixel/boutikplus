import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CITY_LIST } from '@/constants/cities';
import { CATEGORIES } from '@/constants/categories';
import {
  generateLightningPushPlan,
  type LightningPlan,
  type PushChannel,
} from '@/lib/aiSuite';
import { formatFCFA, formatNumber } from '@/lib/format';

interface AILightningPushScreenProps {
  navigation: { goBack: () => void };
  route?: {
    params?: {
      productName?: string;
      price?: number;
      shopName?: string;
      shopCity?: string;
      categoryId?: string;
    };
  };
}

const BUDGET_PRESETS = [2000, 5000, 15000, 30000];
const PERIOD_OPTIONS: (7 | 14)[] = [7, 14];
const TOP_CITIES = CITY_LIST.slice(0, 8);

const CHANNEL_META: Record<PushChannel, { label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  whatsapp_status: { label: 'WhatsApp', icon: 'message-circle', color: '#25D366', bg: '#DCFCE7' },
  tiktok_reel:     { label: 'TikTok',   icon: 'video',         color: '#000000', bg: '#F1F3F5' },
  facebook_post:   { label: 'Facebook', icon: 'facebook',      color: '#1877F2', bg: '#DBEAFE' },
  sms_group:       { label: 'SMS',      icon: 'message-square',color: '#FF6B00', bg: '#FFF0E0' },
  influencer_bf:   { label: 'Influenceur', icon: 'star',       color: '#6B2D8E', bg: '#F3E8FF' },
};

export function AILightningPushScreen({ navigation, route }: AILightningPushScreenProps) {
  const params = route?.params ?? {};

  const [productName, setProductName] = useState(params.productName ?? '');
  const [priceText, setPriceText] = useState(params.price ? String(params.price) : '');
  const [shopName, setShopName] = useState(params.shopName ?? 'Ma Boutique');
  const [shopCity, setShopCity] = useState(params.shopCity ?? CITY_LIST[0]);
  const [categoryId, setCategoryId] = useState(params.categoryId ?? CATEGORIES[0].id);

  const [selectedBudget, setSelectedBudget] = useState<number | null>(5000);
  const [customBudget, setCustomBudget] = useState('');
  const [periodDays, setPeriodDays] = useState<7 | 14>(7);
  const [selectedCities, setSelectedCities] = useState<string[]>([CITY_LIST[0], CITY_LIST[1]]);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LightningPlan | null>(null);

  const price = useMemo(() => {
    const n = parseInt(priceText, 10);
    return isNaN(n) ? 0 : n;
  }, [priceText]);

  const budget = useMemo(() => {
    if (selectedBudget !== null) return selectedBudget;
    const n = parseInt(customBudget, 10);
    return isNaN(n) ? 0 : n;
  }, [selectedBudget, customBudget]);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const canSubmit = productName.trim().length > 0 && price > 0 && budget > 0 && selectedCities.length > 0;

  const handleGenerate = async () => {
    if (!canSubmit) {
      Alert.alert('Information', 'Veuillez remplir le produit, le prix, un budget et au moins une ville.');
      return;
    }
    setLoading(true);
    setPlan(null);
    try {
      const result = await generateLightningPushPlan({
        productName: productName.trim(),
        price,
        shopName: shopName.trim() || 'Ma Boutique',
        shopCity: shopCity || CITY_LIST[0],
        categoryId,
        budgetFCFA: budget,
        periodDays,
        targetCities: selectedCities,
      });
      setPlan(result);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le plan. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleSharePlan = async () => {
    if (!plan) return;
    const lines = plan.days.map((d) => {
      const posts = d.posts.map((p) => `  • ${CHANNEL_META[p.channel].label} ${p.time} — ${p.title}`).join('\n');
      return `Jour ${d.day} : ${d.expectedSales} ventes estimées\n${posts}`;
    }).join('\n\n');
    const msg = `⚡ Plan Boost Promo — ${plan.productName}\nBudget : ${formatFCFA(plan.budgetFCFA)} sur ${plan.periodDays}j\nROAS estimé : ${plan.summary.expectedROAS}×\nCA espéré : ${formatFCFA(plan.summary.totalExpectedSalesFCFA)}\n\n${lines}`;
    try { await Share.share({ message: msg }); } catch { /* noop */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>⚡ Boost Promo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!plan ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <View style={styles.sectionHeader}>
                <Feather name="box" size={18} color={colors.warning} />
                <Text style={styles.sectionTitle}>Produit à lancer</Text>
              </View>
              <Input
                label="Nom du produit"
                value={productName}
                onChangeText={setProductName}
                placeholder="Ex: Wax de Ouaga Premium"
                icon="tag"
              />
              <Input
                label="Prix (FCFA)"
                value={priceText}
                onChangeText={(v) => setPriceText(v.replace(/[^0-9]/g, ''))}
                placeholder="5000"
                keyboardType="numeric"
                icon="dollar-sign"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Boutique"
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="Nom boutique"
                    icon="shopping-bag"
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Ville boutique"
                    value={shopCity}
                    onChangeText={setShopCity}
                    placeholder="Ouagadougou"
                    icon="map-pin"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map((c) => {
                  const active = categoryId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.chip, active && styles.chipActive, { borderColor: active ? c.color : colors.border }]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Feather name={c.icon as any} size={14} color={active ? colors.textInverse : c.color} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>

            <Card>
              <View style={styles.sectionHeader}>
                <Feather name="credit-card" size={18} color={colors.success} />
                <Text style={styles.sectionTitle}>Budget marketing</Text>
              </View>
              <View style={styles.chipRow}>
                {BUDGET_PRESETS.map((b) => {
                  const active = selectedBudget === b;
                  return (
                    <Pressable
                      key={b}
                      style={[styles.budgetChip, active && styles.chipActive]}
                      onPress={() => { setSelectedBudget(b); setCustomBudget(''); }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatNumber(b)}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.budgetChip, selectedBudget === null && styles.chipActive]}
                  onPress={() => setSelectedBudget(null)}
                >
                  <Feather name="edit-2" size={14} color={selectedBudget === null ? colors.textInverse : colors.primary} />
                  <Text style={[styles.chipText, selectedBudget === null && styles.chipTextActive]}>Perso</Text>
                </Pressable>
              </View>
              {selectedBudget === null && (
                <Input
                  label="Montant personnalisé (FCFA)"
                  value={customBudget}
                  onChangeText={(v) => setCustomBudget(v.replace(/[^0-9]/g, ''))}
                  placeholder="10000"
                  keyboardType="numeric"
                  icon="edit-3"
                  hideTopLabel
                />
              )}

              <View style={{ height: spacing.lg }} />
              <View style={styles.sectionHeader}>
                <Feather name="calendar" size={18} color={colors.info} />
                <Text style={styles.sectionTitle}>Durée de la campagne</Text>
              </View>
              <View style={styles.chipRow}>
                {PERIOD_OPTIONS.map((p) => {
                  const active = periodDays === p;
                  return (
                    <Pressable
                      key={p}
                      style={[styles.periodChip, active && styles.chipActive]}
                      onPress={() => setPeriodDays(p)}
                    >
                      <Feather name="zap" size={14} color={active ? colors.textInverse : colors.primary} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p} jours</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card>
              <View style={styles.sectionHeader}>
                <Feather name="map" size={18} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Villes ciblées ({selectedCities.length})</Text>
              </View>
              <View style={styles.wrapRow}>
                {TOP_CITIES.map((city) => {
                  const active = selectedCities.includes(city);
                  return (
                    <Pressable
                      key={city}
                      style={[styles.cityChip, active && styles.chipActive]}
                      onPress={() => toggleCity(city)}
                    >
                      {active ? <Feather name="check" size={14} color={colors.textInverse} /> : null}
                      <Text style={[styles.cityChipText, active && styles.chipTextActive]}>{city}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Button
              label="⚡ Générer mon plan promo"
              onPress={handleGenerate}
              loading={loading}
              disabled={!canSubmit}
              fullWidth
            />
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ backgroundColor: colors.warning + '12', borderColor: colors.warning + '40' }}>
              <View style={styles.summaryTop}>
                <View style={styles.summaryIcon}>
                  <Feather name="trending-up" size={28} color={colors.textInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>Résultats estimés — {plan.periodDays} jours</Text>
                  <Text style={styles.summarySub}>{plan.productName} · {formatFCFA(plan.budgetFCFA)} investis</Text>
                </View>
                <Pressable onPress={handleSharePlan} hitSlop={8}>
                  <Feather name="share-2" size={20} color={colors.warning} />
                </Pressable>
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Portée total</Text>
                  <Text style={styles.metricValue}>{formatNumber(plan.summary.totalReach)}</Text>
                  <Text style={styles.metricHint}>personnes</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Clicks</Text>
                  <Text style={styles.metricValue}>{formatNumber(plan.summary.totalClicks)}</Text>
                  <Text style={styles.metricHint}>visites</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>ROAS</Text>
                  <Text style={[styles.metricValue, { color: colors.success }]}>{plan.summary.expectedROAS}×</Text>
                  <Text style={styles.metricHint}>retour sur invest.</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>CA estimé</Text>
                  <Text style={[styles.metricValue, { color: colors.primary }]}>{formatFCFA(plan.summary.totalExpectedSalesFCFA)}</Text>
                  <Text style={styles.metricHint}>en {plan.periodDays} jours</Text>
                </View>
              </View>
            </Card>

            <View style={{ gap: spacing.md }}>
              <View style={styles.sectionHeader}>
                <Feather name="clock" size={18} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Calendrier jour par jour</Text>
              </View>
              {plan.days.map((day) => (
                <Card key={day.day}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>J{day.day}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>Jour {day.day}</Text>
                      <Text style={styles.dayDate}>{day.date}</Text>
                    </View>
                    <Badge
                      label={`${day.expectedSales} ventes`}
                      color={colors.success}
                      bgColor={colors.success + '18'}
                    />
                  </View>
                  <View style={{ height: spacing.md }} />
                  <View style={{ gap: spacing.md }}>
                    {day.posts.map((p, i) => {
                      const meta = CHANNEL_META[p.channel];
                      return (
                        <View key={i} style={styles.postCard}>
                          <View style={styles.postTop}>
                            <View style={[styles.channelBadge, { backgroundColor: meta.bg }]}>
                              <Feather name={meta.icon} size={14} color={meta.color} />
                              <Text style={[styles.channelLabel, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                            <View style={styles.postTime}>
                              <Feather name="clock" size={12} color={colors.textMuted} />
                              <Text style={styles.postTimeText}>{p.time}</Text>
                            </View>
                          </View>
                          <Text style={styles.postTitle}>{p.title}</Text>
                          <Text style={styles.postCopy} numberOfLines={3}>{p.copy}</Text>
                          <View style={styles.postFooter}>
                            <View style={styles.postStat}>
                              <Feather name="eye" size={12} color={colors.info} />
                              <Text style={styles.postStatText}>{formatNumber(p.expectedReach)}</Text>
                            </View>
                            <View style={styles.postStat}>
                              <Feather name="mouse-pointer" size={12} color={colors.primary} />
                              <Text style={styles.postStatText}>{formatNumber(p.expectedClicks)}</Text>
                            </View>
                            <View style={styles.postTarget}>
                              <Feather name="target" size={12} color={colors.secondary} />
                              <Text style={styles.postTargetText}>{p.targeting}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              ))}
            </View>

            <View style={{ height: spacing.huge }} />
          </View>
        )}
      </ScrollView>

      <View style={styles.stickyBottom}>
        <Card padded={false} style={{ borderRadius: radius.md }}>
          <View style={styles.benchHeader}>
            <Feather name="award" size={16} color={colors.warning} />
            <Text style={styles.benchTitle}>Boost Promo — plan sur 7 jours</Text>
          </View>
          {plan ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Button
                label="🔄 Nouveau plan"
                variant="outline"
                size="sm"
                onPress={() => setPlan(null)}
                fullWidth
              />
            </View>
          ) : null}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive + 180,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'nowrap' as any, paddingBottom: spacing.xs },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  budgetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  summarySub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  metric: {
    width: '50%',
    padding: spacing.sm,
  },
  metricLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  metricValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  metricHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  dayTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dayDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  postCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  postTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  channelLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  postTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postTimeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  postTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postCopy: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  postTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  postTargetText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  stickyBottom: {
    position: 'absolute' as any,
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  benchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.warning + '08',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  benchTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  benchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  benchItem: {
    width: '50%',
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  benchLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  benchCompare: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  benchBad: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  benchGood: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
});
