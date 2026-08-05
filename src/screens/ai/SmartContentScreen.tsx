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
  Clipboard,
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
  generateSmartContentBatch,
  type ContentBatch,
} from '@/lib/aiSuite';
import { formatFCFA } from '@/lib/format';

type PlatformTab = 'whatsapp' | 'tiktok' | 'facebook' | 'instagram';

interface SmartContentScreenProps {
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

const PLATFORM_TABS: { key: PlatformTab; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', icon: 'message-circle', color: '#25D366' },
  { key: 'tiktok',   label: 'TikTok',   icon: 'video',         color: '#000000' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook',      color: '#1877F2' },
  { key: 'instagram',label: 'Instagram',icon: 'camera',        color: '#E1306C' },
];

const PROMO_PRESETS = [
  { label: '🔥 Promo -20%', value: '-20% ce weekend' },
  { label: '🎁 Cadeau', value: 'Cadeau offert pour les 10 premiers' },
  { label: '🚚 Livraison', value: 'Livraison offerte dès 30.000 FCFA' },
  { label: '⚡ Flash 24h', value: 'Promo flash 24h seulement' },
];

export function SmartContentScreen({ navigation, route }: SmartContentScreenProps) {
  const params = route?.params ?? {};

  const [productName, setProductName] = useState(params.productName ?? '');
  const [priceText, setPriceText] = useState(params.price ? String(params.price) : '');
  const [shopName, setShopName] = useState(params.shopName ?? 'Ma Boutique');
  const [shopCity, setShopCity] = useState(params.shopCity ?? CITY_LIST[0]);
  const [categoryId, setCategoryId] = useState(params.categoryId ?? CATEGORIES[0].id);

  const [promo, setPromo] = useState<string>('');
  const [customPromo, setCustomPromo] = useState('');
  const [activeTab, setActiveTab] = useState<PlatformTab>('whatsapp');

  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<ContentBatch | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<Record<string, boolean>>({});

  const price = useMemo(() => {
    const n = parseInt(priceText, 10);
    return isNaN(n) ? 0 : n;
  }, [priceText]);

  const activePromo = useMemo(() => {
    if (customPromo.trim()) return customPromo.trim();
    return promo || undefined;
  }, [promo, customPromo]);

  const canSubmit = productName.trim().length > 0 && price > 0;

  const handleGenerate = async () => {
    if (!canSubmit) {
      Alert.alert('Information', 'Veuillez renseigner le nom du produit et son prix.');
      return;
    }
    setLoading(true);
    setBatch(null);
    try {
      const result = await generateSmartContentBatch({
        productName: productName.trim(),
        price,
        shopName: shopName.trim() || 'Ma Boutique',
        shopCity: shopCity || CITY_LIST[0],
        categoryId,
        promo: activePromo,
      });
      setBatch(result);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer les contenus. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await Clipboard.setString(text);
      setCopiedIdx((s) => ({ ...s, [key]: true }));
      setTimeout(() => setCopiedIdx((s) => ({ ...s, [key]: false })), 1500);
    } catch { /* noop */ }
  };

  const shareContent = async (text: string) => {
    try { await Share.share({ message: text }); } catch { /* noop */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>✨ Atelier Contenu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!batch ? (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <View style={styles.sectionHeader}>
                <Feather name="package" size={18} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Informations produit</Text>
              </View>
              <Input
                label="Nom du produit"
                value={productName}
                onChangeText={setProductName}
                placeholder="Ex: Crème karité bio"
                icon="tag"
              />
              <Input
                label="Prix (FCFA)"
                value={priceText}
                onChangeText={(v) => setPriceText(v.replace(/[^0-9]/g, ''))}
                placeholder="3500"
                keyboardType="numeric"
                icon="dollar-sign"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Nom de boutique"
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="Ma Boutique"
                    icon="shopping-bag"
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Ville"
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
                <Feather name="percent" size={18} color={colors.danger} />
                <Text style={styles.sectionTitle}>Promo en cours (optionnel)</Text>
              </View>
              <View style={styles.wrapRow}>
                {PROMO_PRESETS.map((p) => {
                  const active = promo === p.value && !customPromo;
                  return (
                    <Pressable
                      key={p.label}
                      style={[styles.chip, active && styles.chipPromo]}
                      onPress={() => { setPromo(p.value); setCustomPromo(''); }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ height: spacing.md }} />
              <Input
                label="Ou promo personnalisée"
                value={customPromo}
                onChangeText={setCustomPromo}
                placeholder="Ex: Happy hour vendredi soir -15%"
                icon="edit-3"
                hideTopLabel
              />
            </Card>

            <Button
              label="✨ Générer mes contenus multi-canaux"
              onPress={handleGenerate}
              loading={loading}
              disabled={!canSubmit}
              fullWidth
            />
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <View style={styles.batchHeader}>
                <View>
                  <Text style={styles.batchTitle}>{productName} · {formatFCFA(price)}</Text>
                  <Text style={styles.batchSub}>{shopName} — {shopCity} {activePromo ? `· ${activePromo}` : ''}</Text>
                </View>
                <Pressable onPress={() => setBatch(null)} hitSlop={8}>
                  <Badge
                    label="Recommencer"
                    color={colors.primary}
                    bgColor={colors.primary + '18'}
                  />
                </Pressable>
              </View>
            </Card>

            <View>
              <View style={styles.sectionHeader}>
                <Feather name="layers" size={18} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Captions par plateforme</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
                {PLATFORM_TABS.map((t) => {
                  const active = activeTab === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      style={[styles.tab, active && styles.tabActive, { borderColor: active ? t.color : colors.border }]}
                      onPress={() => setActiveTab(t.key)}
                    >
                      <Feather name={t.icon} size={14} color={active ? colors.textInverse : t.color} />
                      <Text style={[styles.tabText, active && styles.chipTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
                {batch.captions[activeTab].map((caption, i) => {
                  const copyKey = `caption-${activeTab}-${i}`;
                  return (
                    <Card key={i} padded={false}>
                      <View style={styles.captionHeader}>
                        <View style={[styles.captionCount, { backgroundColor: PLATFORM_TABS.find((t) => t.key === activeTab)!.color + '18' }]}>
                          <Text style={[styles.captionCountText, { color: PLATFORM_TABS.find((t) => t.key === activeTab)!.color }]}>#{i + 1}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                          <Pressable
                            onPress={() => copyToClipboard(copyKey, caption)}
                            style={styles.iconBtn}
                            hitSlop={6}
                          >
                            <Feather
                              name={copiedIdx[copyKey] ? 'check' : 'copy'}
                              size={16}
                              color={copiedIdx[copyKey] ? colors.success : colors.primary}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => shareContent(caption)}
                            style={styles.iconBtn}
                            hitSlop={6}
                          >
                            <Feather name="share" size={16} color={colors.secondary} />
                          </Pressable>
                        </View>
                      </View>
                      <Text style={styles.captionBody}>{caption}</Text>
                    </Card>
                  );
                })}
              </View>
            </View>

            <Card>
              <View style={styles.sectionHeaderNoGap}>
                <Feather name="hash" size={18} color={colors.info} />
                <Text style={styles.sectionTitle}>Hashtags ({batch.hashtags.length})</Text>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => copyToClipboard('hashtags', batch.hashtags.join(' '))}
                  hitSlop={6}
                >
                  <Feather
                    name={copiedIdx['hashtags'] ? 'check' : 'copy'}
                    size={16}
                    color={copiedIdx['hashtags'] ? colors.success : colors.info}
                  />
                </Pressable>
              </View>
              <View style={styles.wrapRow}>
                {batch.hashtags.map((h, i) => (
                  <Badge
                    key={i}
                    label={h}
                    color={colors.info}
                    bgColor={colors.info + '12'}
                  />
                ))}
              </View>
            </Card>

            <View>
              <View style={styles.sectionHeader}>
                <Feather name="image" size={18} color={colors.secondary} />
                <Text style={styles.sectionTitle}>Stories ({batch.stories.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}>
                {batch.stories.map((s, i) => {
                  const copyKey = `story-${i}`;
                  const gradients = [
                    { start: '#FF6B00', end: '#6B2D8E' },
                    { start: '#25D366', end: '#1877F2' },
                    { start: '#FFC107', end: '#DC3545' },
                    { start: '#0DCAF0', end: '#6B2D8E' },
                  ];
                  const g = gradients[i % gradients.length];
                  return (
                    <View key={i} style={[styles.storyCard, { backgroundColor: g.start }]}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: g.end, opacity: 0.55 }]} />
                      <View style={styles.storyOverlay}>
                        <Text style={styles.storyCount}>Story {i + 1}</Text>
                        <Text style={styles.storyText}>{s}</Text>
                        <View style={styles.storyActions}>
                          <Pressable onPress={() => copyToClipboard(copyKey, s)} style={styles.storyBtn} hitSlop={6}>
                            <Feather
                              name={copiedIdx[copyKey] ? 'check' : 'copy'}
                              size={14}
                              color={copiedIdx[copyKey] ? colors.success : colors.textInverse}
                            />
                          </Pressable>
                          <Pressable onPress={() => shareContent(s)} style={styles.storyBtn} hitSlop={6}>
                            <Feather name="share" size={14} color={colors.textInverse} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <View style={styles.sectionHeader}>
                <Feather name="book-open" size={18} color={colors.warning} />
                <Text style={styles.sectionTitle}>Flyers ({batch.flyers.length})</Text>
              </View>
              <View style={{ gap: spacing.md }}>
                {batch.flyers.map((f, i) => {
                  const copyKey = `flyer-${i}`;
                  return (
                    <Card key={i} padded={false} style={{ overflow: 'hidden' }}>
                      <View style={[styles.flyerBanner, { backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary }]}>
                        <Feather name="volume-2" size={20} color={colors.textInverse} />
                        <Text style={styles.flyerBannerText}>Flyer {i + 1}</Text>
                      </View>
                      <View style={{ padding: spacing.lg }}>
                        <Text style={styles.flyerTitle}>{f.title}</Text>
                        <View style={{ height: spacing.sm }} />
                        <Badge
                          label={f.cta}
                          color={colors.success}
                          bgColor={colors.success + '18'}
                        />
                        <View style={{ height: spacing.md }} />
                        <View style={styles.flyerShareBox}>
                          <Text style={styles.flyerShareLabel}>Texte à partager :</Text>
                          <Text style={styles.flyerShareText}>{f.shareText}</Text>
                        </View>
                        <View style={{ height: spacing.md }} />
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <Button
                            label="Copier"
                            variant="outline"
                            size="sm"
                            icon={<Feather name={copiedIdx[copyKey] ? 'check' : 'copy'} size={14} color={colors.primary} />}
                            onPress={() => copyToClipboard(copyKey, f.shareText)}
                            style={{ flex: 1 }}
                          />
                          <Button
                            label="Partager"
                            size="sm"
                            icon={<Feather name="share-2" size={14} color={colors.textInverse} />}
                            onPress={() => shareContent(f.shareText)}
                            style={{ flex: 1 }}
                          />
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>

            <View style={{ height: spacing.huge }} />
          </View>
        )}
      </ScrollView>
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
    paddingBottom: spacing.massive + 200,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionHeaderNoGap: {
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
    marginTop: spacing.sm,
  },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
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
  chipPromo: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
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
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  batchSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  tabText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  captionCount: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  captionCountText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  captionBody: {
    padding: spacing.lg,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 22,
  },
  storyCard: {
    width: 180,
    height: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  storyCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    opacity: 0.9,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  storyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    lineHeight: 22,
    flex: 1,
    marginTop: spacing.md,
  },
  storyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  storyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  flyerBannerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  flyerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  flyerShareBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  flyerShareLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  flyerShareText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 20,
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
    backgroundColor: colors.secondary + '08',
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
