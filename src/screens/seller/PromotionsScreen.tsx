import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProductsByShop } from '@/lib/dataService';
import {
  getShopPromotions,
  createPromotion,
  pausePromotion,
  reactivatePromotion,
  deletePromotion,
  getDiscountCodes,
  formatPromoFCFA,
} from '@/lib/promotionService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PromotionTypePicker } from '@/components/promotion/PromotionTypePicker';
import { formatRelativeDate } from '@/lib/format';
import type {
  Shop,
  ProductWithImages,
  Promotion,
  PromotionType,
  DiscountCode,
} from '@/types/models';

interface PromotionsScreenProps {
  navigation: { goBack: () => void };
}

const TYPE_META: Record<
  PromotionType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  announcement: {
    label: 'Annonce',
    icon: 'bell',
    color: colors.warning,
    bgColor: '#FFF8E1',
  },
  special_offer: {
    label: 'Offre spéciale',
    icon: 'tag',
    color: colors.primary,
    bgColor: '#FFF0E0',
  },
  discount_code: {
    label: 'Code promo',
    icon: 'percent',
    color: colors.secondary,
    bgColor: '#F3E5F5',
  },
};

export function PromotionsScreen({ navigation }: PromotionsScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [promoType, setPromoType] = useState<PromotionType>('announcement');
  const [promoText, setPromoText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [days, setDays] = useState('7');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [selectedDiscountCode, setSelectedDiscountCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const ownerId = profile?.id ?? 'demo-seller';
    const s = await getShopByOwner(ownerId);
    setShop(s);
    if (s) {
      const [prods, promos, codes] = await Promise.all([
        getProductsByShop(s.id),
        getShopPromotions(s.id),
        getDiscountCodes(s.id),
      ]);
      setProducts(prods);
      setPromotions(promos);
      setDiscountCodes(codes);
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

  const resetForm = () => {
    setPromoType('announcement');
    setPromoText('');
    setSelectedProduct(null);
    setDays('7');
    setOriginalPrice('');
    setDiscountedPrice('');
    setSelectedDiscountCode(null);
  };

  const handleCreate = async () => {
    if (!shop) return;
    if (!promoText.trim()) {
      Alert.alert('Erreur', 'Renseignez le texte de la promotion');
      return;
    }
    if (promoType === 'special_offer') {
      const orig = parseInt(originalPrice, 10);
      const disc = parseInt(discountedPrice, 10);
      if (isNaN(orig) || isNaN(disc) || disc >= orig) {
        Alert.alert(
          'Erreur',
          'Renseignez un prix promo inférieur au prix original',
        );
        return;
      }
    }
    if (promoType === 'discount_code' && !selectedDiscountCode) {
      Alert.alert(
        'Erreur',
        'Sélectionnez un code promo à associer (créez-en un d\'abord si nécessaire)',
      );
      return;
    }

    setSaving(true);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (parseInt(days, 10) || 7));

    const { error } = await createPromotion({
      shopId: shop.id,
      productId: selectedProduct,
      promoText: promoText.trim(),
      endDate: endDate.toISOString(),
      visibility: 'home',
      promotionType: promoType,
      discountCodeId: selectedDiscountCode,
      originalPrice:
        promoType === 'special_offer' && originalPrice
          ? parseInt(originalPrice, 10)
          : null,
      discountedPrice:
        promoType === 'special_offer' && discountedPrice
          ? parseInt(discountedPrice, 10)
          : null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    Alert.alert(
      'Succès ✓',
      'Promotion créée et visible sur l\'accueil',
    );
    setShowForm(false);
    resetForm();
    await loadData();
  };

  const handleTogglePause = async (promo: Promotion) => {
    if (promo.status === 'paused') {
      await reactivatePromotion(promo.id);
    } else {
      await pausePromotion(promo.id);
    }
    await loadData();
  };

  const handleDelete = (promo: Promotion) => {
    Alert.alert(
      'Supprimer la promotion',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deletePromotion(promo.id);
            await loadData();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Promotions</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Feather name="plus" size={22} color={colors.textInverse} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : promotions.length === 0 ? (
        <EmptyState
          icon="percent"
          title="Aucune promotion"
          message="Créez une annonce, une offre spéciale ou un code promo pour mettre en avant vos produits sur l'accueil."
          action={
            <Pressable
              style={styles.createBtn}
              onPress={() => setShowForm(true)}
            >
              <Feather name="plus" size={18} color={colors.textInverse} />
              <Text style={styles.createBtnText}>Créer une promo</Text>
            </Pressable>
          }
        />
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const typeMeta = TYPE_META[item.promotion_type ?? 'announcement'];
            const isPaused = item.status === 'paused';
            return (
              <Card
                style={[
                  styles.promoCard,
                  { backgroundColor: isPaused ? colors.surfaceAlt : typeMeta.bgColor },
                ]}
              >
                <View style={styles.promoHead}>
                  <View style={styles.promoBadges}>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: typeMeta.color },
                      ]}
                    >
                      <Feather
                        name={typeMeta.icon as any}
                        size={11}
                        color={colors.textInverse}
                      />
                      <Text style={styles.typeBadgeText}>{typeMeta.label}</Text>
                    </View>
                    <Badge
                      label={isPaused ? 'En pause' : 'Active'}
                      color={isPaused ? colors.textMuted : colors.success}
                      bgColor={isPaused ? colors.border : '#E6F7EE'}
                    />
                  </View>
                  <View style={styles.promoActions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleTogglePause(item)}
                      style={styles.iconAction}
                    >
                      <Feather
                        name={isPaused ? 'play' : 'pause'}
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleDelete(item)}
                      style={styles.iconAction}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.promoText}>{item.promo_text}</Text>

                {/* Prix barré pour les offres spéciales */}
                {item.promotion_type === 'special_offer' &&
                item.original_price != null &&
                item.discounted_price != null ? (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceOriginal}>
                      {formatPromoFCFA(item.original_price)}
                    </Text>
                    <Text style={styles.priceDiscounted}>
                      {formatPromoFCFA(item.discounted_price)}
                    </Text>
                    <Badge
                      label={`-${Math.round(
                        ((item.original_price - item.discounted_price) /
                          item.original_price) *
                          100,
                      )}%`}
                      color={colors.danger}
                      bgColor="#FFEBEE"
                    />
                  </View>
                ) : null}

                {/* Code promo associé */}
                {item.promotion_type === 'discount_code'
                  ? (() => {
                      const dc = discountCodes.find(
                        (c) => c.id === item.discount_code_id,
                      );
                      return dc ? (
                        <View style={styles.codeChip}>
                          <Feather
                            name="percent"
                            size={12}
                            color={colors.textInverse}
                          />
                          <Text style={styles.codeChipText}>{dc.code}</Text>
                        </View>
                      ) : null;
                    })()
                  : null}

                {/* Produit associé */}
                {item.product ? (
                  <View style={styles.promoProduct}>
                    <Image
                      source={{ uri: (item.product as ProductWithImages).images?.[0]?.image_url }}
                      style={styles.promoImg}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoProductName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.promoProductPrice}>
                        {formatPromoFCFA(item.product.price)}
                      </Text>
                    </View>
                    <Badge
                      label="Accueil"
                      color={colors.primary}
                      bgColor="#FFF0E0"
                    />
                  </View>
                ) : null}

                <Text style={styles.promoDate}>
                  Jusqu'au {formatRelativeDate(item.end_date)}
                </Text>
              </Card>
            );
          }}
        />
      )}

      {/* Modal de création */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Nouvelle promotion</Text>
              <Pressable
                onPress={() => setShowForm(false)}
                hitSlop={10}
              >
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: '80%' }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Type de promotion</Text>
              <PromotionTypePicker value={promoType} onChange={setPromoType} />

              <Input
                label="Texte de la promo *"
                value={promoText}
                onChangeText={setPromoText}
                placeholder={
                  promoType === 'announcement'
                    ? 'Ex: Soldes: -20% cette semaine !'
                    : promoType === 'special_offer'
                      ? 'Ex: Robe wax en promo limitée'
                      : 'Ex: Utilisez le code WAX20 !'
                }
                multiline
                numberOfLines={2}
              />

              {/* Champs conditionnels : offre spéciale */}
              {promoType === 'special_offer' ? (
                <View style={styles.conditionalSection}>
                  <Text style={styles.conditionalLabel}>
                    Prix de l'offre (FCFA)
                  </Text>
                  <View style={styles.priceInputRow}>
                    <Input
                      label="Prix original *"
                      value={originalPrice}
                      onChangeText={setOriginalPrice}
                      placeholder="Ex: 15000"
                      keyboardType="numeric"
                      icon="tag"
                    />
                    <Input
                      label="Prix promo *"
                      value={discountedPrice}
                      onChangeText={setDiscountedPrice}
                      placeholder="Ex: 12000"
                      keyboardType="numeric"
                      icon="tag"
                    />
                  </View>
                  {originalPrice && discountedPrice &&
                  parseInt(discountedPrice, 10) < parseInt(originalPrice, 10) ? (
                    <Text style={styles.discountPreview}>
                      Réduction: {formatPromoFCFA(
                        parseInt(originalPrice, 10) -
                          parseInt(discountedPrice, 10),
                      )}{' '}
                      ({Math.round(
                        ((parseInt(originalPrice, 10) -
                          parseInt(discountedPrice, 10)) /
                          parseInt(originalPrice, 10)) *
                          100,
                      )}%)
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Champs conditionnels : code promo */}
              {promoType === 'discount_code' ? (
                <View style={styles.conditionalSection}>
                  <Text style={styles.conditionalLabel}>Code promo à associer</Text>
                  {discountCodes.length === 0 ? (
                    <View style={styles.noCodeBox}>
                      <Feather
                        name="alert-circle"
                        size={16}
                        color={colors.warning}
                      />
                      <Text style={styles.noCodeText}>
                        Aucun code promo créé. Créez-en un d'abord depuis le hub
                        de promotion.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: spacing.sm }}
                    >
                      {discountCodes.map((dc) => {
                        const selected = selectedDiscountCode === dc.id;
                        return (
                          <Pressable
                            key={dc.id}
                            style={[
                              styles.codePickerChip,
                              selected && styles.codePickerChipActive,
                            ]}
                            onPress={() => setSelectedDiscountCode(dc.id)}
                          >
                            <Text
                              style={[
                                styles.codePickerText,
                                selected && styles.codePickerTextActive,
                              ]}
                            >
                              {dc.code}
                            </Text>
                            <Text style={styles.codePickerValue}>
                              {dc.discount_type === 'percentage'
                                ? `-${dc.discount_value}%`
                                : `-${formatPromoFCFA(dc.discount_value)}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              ) : null}

              {/* Produit associé (optionnel pour tous les types) */}
              <Text style={styles.label}>Produit associé (optionnel)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}
              >
                <Pressable
                  style={[
                    styles.prodChip,
                    !selectedProduct && styles.prodChipActive,
                  ]}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text
                    style={[
                      styles.prodChipText,
                      !selectedProduct && styles.prodChipTextActive,
                    ]}
                  >
                    Aucun
                  </Text>
                </Pressable>
                {products.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.prodChip,
                      selectedProduct === p.id && styles.prodChipActive,
                    ]}
                    onPress={() => setSelectedProduct(p.id)}
                  >
                    <Text
                      style={[
                        styles.prodChipText,
                        selectedProduct === p.id && styles.prodChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Input
                label="Durée (jours)"
                value={days}
                onChangeText={setDays}
                placeholder="7"
                keyboardType="numeric"
                icon="calendar"
              />
              <View style={styles.durationRow}>
                {[3, 7, 14, 30].map((d) => (
                  <Pressable
                    key={d}
                    style={[
                      styles.durationChip,
                      days === String(d) && styles.durationChipActive,
                    ]}
                    onPress={() => setDays(String(d))}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        days === String(d) && styles.durationTextActive,
                      ]}
                    >
                      {d}j
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                label="Publier la promotion"
                onPress={handleCreate}
                loading={saving}
                style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  promoCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  promoHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  promoBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  promoActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconAction: {
    padding: spacing.xs,
  },
  promoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  priceOriginal: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  priceDiscounted: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.danger,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  codeChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  promoProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  promoImg: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  promoProductName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  promoProductPrice: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  promoDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  createBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  conditionalSection: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  conditionalLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  discountPreview: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  noCodeBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  noCodeText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  codePickerChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  codePickerChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  codePickerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  codePickerTextActive: {
    color: colors.textInverse,
  },
  codePickerValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  prodChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  prodChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  prodChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  durationChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  durationTextActive: {
    color: colors.textInverse,
  },
});
