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
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner } from '@/lib/dataService';
import {
  getDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  generateCode,
  formatPromoFCFA,
} from '@/lib/promotionService';
import { DiscountCodeCard } from '@/components/promotion/DiscountCodeCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Shop, DiscountCode } from '@/types/models';

interface DiscountCodeManagementScreenProps {
  navigation: { goBack: () => void };
}

const DURATION_OPTIONS = [
  { days: 7, label: '7 jours' },
  { days: 14, label: '14 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' },
];

export function DiscountCodeManagementScreen({
  navigation,
}: DiscountCodeManagementScreenProps) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulaire
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [durationDays, setDurationDays] = useState(14);

  const loadCodes = useCallback(async () => {
    const ownerId = profile?.id ?? 'demo-seller';
    const s = await getShopByOwner(ownerId);
    setShop(s);
    if (s) {
      const c = await getDiscountCodes(s.id);
      setCodes(c);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCodes();
  };

  const resetForm = () => {
    setCode('');
    setType('percentage');
    setValue('');
    setMinAmount('');
    setMaxUses('');
    setDurationDays(14);
  };

  const handleGenerateCode = () => {
    const prefix = shop?.name?.slice(0, 4) ?? 'PROMO';
    const numValue = parseInt(value, 10);
    const generated = generateCode(
      prefix,
      !isNaN(numValue) ? numValue : undefined,
    );
    setCode(generated);
  };

  const handleCreate = async () => {
    if (!shop) return;
    const numValue = parseInt(value, 10);
    if (!code.trim()) {
      Alert.alert('Erreur', 'Renseignez un code');
      return;
    }
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Erreur', 'Renseignez une valeur valide');
      return;
    }
    setSaving(true);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    expiresAt.setHours(23, 59, 59, 0);

    const { error } = await createDiscountCode({
      shopId: shop.id,
      code: code.trim(),
      discountType: type,
      discountValue: numValue,
      minOrderAmount: minAmount ? parseInt(minAmount, 10) : 0,
      maxUses: maxUses ? parseInt(maxUses, 10) : 0,
      expiresAt: expiresAt.toISOString(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    setShowForm(false);
    resetForm();
    await loadCodes();
    Alert.alert('Code créé ✓', 'Votre code promo est actif.');
  };

  const handleTogglePause = async (dc: DiscountCode) => {
    const newStatus = dc.status === 'paused' ? 'active' : 'paused';
    const { error } = await updateDiscountCode(dc.id, { status: newStatus });
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    await loadCodes();
  };

  const handleDelete = (dc: DiscountCode) => {
    Alert.alert(
      'Supprimer le code',
      `Voulez-vous vraiment supprimer le code « ${dc.code} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteDiscountCode(dc.id);
            await loadCodes();
          },
        },
      ],
    );
  };

  const handleCopy = async (dc: DiscountCode) => {
    await Clipboard.setStringAsync(dc.code);
    Alert.alert('Copié ✓', `Code ${dc.code} copié.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Codes promo</Text>
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
      ) : codes.length === 0 ? (
        <EmptyState
          icon="percent"
          title="Aucun code promo"
          message="Créez des codes de réduction pour fidéliser vos clients et stimuler vos ventes (ex: WAX20 pour -20%)."
          action={
            <Button
              label="Créer un code"
              onPress={() => setShowForm(true)}
              style={{ marginTop: spacing.lg }}
            />
          }
        />
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.tipBox}>
              <Feather name="info" size={16} color={colors.info} />
              <Text style={styles.tipText}>
                {codes.length} code{codes.length > 1 ? 's' : ''} · les codes
                s'appliquent automatiquement au checkout si le montant minimum
                est atteint.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DiscountCodeCard
              code={item}
              onPress={handleCopy}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
            />
          )}
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
              <Text style={styles.modalTitle}>Nouveau code promo</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
              {/* Code avec bouton générer */}
              <Input
                label="Code *"
                value={code}
                onChangeText={setCode}
                placeholder="Ex: WAX20"
                icon="percent"
                rightElement={
                  <Pressable
                    onPress={handleGenerateCode}
                    style={styles.generateBtn}
                    hitSlop={8}
                  >
                    <Feather name="refresh-cw" size={14} color={colors.primary} />
                    <Text style={styles.generateText}>Générer</Text>
                  </Pressable>
                }
              />

              {/* Type de réduction */}
              <Text style={styles.label}>Type de réduction</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[
                    styles.typeChip,
                    type === 'percentage' && styles.typeChipActive,
                  ]}
                  onPress={() => setType('percentage')}
                >
                  <Feather
                    name="percent"
                    size={16}
                    color={type === 'percentage' ? colors.textInverse : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      type === 'percentage' && styles.typeChipTextActive,
                    ]}
                  >
                    Pourcentage (%)
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeChip,
                    type === 'fixed' && styles.typeChipActive,
                  ]}
                  onPress={() => setType('fixed')}
                >
                  <Feather
                    name="tag"
                    size={16}
                    color={type === 'fixed' ? colors.textInverse : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      type === 'fixed' && styles.typeChipTextActive,
                    ]}
                  >
                    Montant fixe (FCFA)
                  </Text>
                </Pressable>
              </View>

              <Input
                label={type === 'percentage' ? 'Pourcentage de réduction *' : 'Montant de réduction (FCFA) *'}
                value={value}
                onChangeText={setValue}
                placeholder={type === 'percentage' ? 'Ex: 20' : 'Ex: 1000'}
                keyboardType="numeric"
                icon="hash"
              />
              {type === 'percentage' && parseInt(value, 10) > 100 ? (
                <Text style={styles.warnText}>Le pourcentage ne peut pas dépasser 100%.</Text>
              ) : null}

              <Input
                label="Montant minimum du panier (FCFA)"
                value={minAmount}
                onChangeText={setMinAmount}
                placeholder="Ex: 5000 (0 = aucun minimum)"
                keyboardType="numeric"
                icon="shopping-cart"
              />
              <Input
                label="Nombre max d'utilisations (0 = illimité)"
                value={maxUses}
                onChangeText={setMaxUses}
                placeholder="Ex: 100"
                keyboardType="numeric"
                icon="repeat"
              />

              <Text style={styles.label}>Durée de validité</Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.days}
                    style={[
                      styles.durationChip,
                      durationDays === opt.days && styles.durationChipActive,
                    ]}
                    onPress={() => setDurationDays(opt.days)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        durationDays === opt.days && styles.durationTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {value && !isNaN(parseInt(value, 10)) ? (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Aperçu</Text>
                  <Text style={styles.previewValue}>
                    {type === 'percentage'
                      ? `-${parseInt(value, 10)}% sur le panier`
                      : `-${formatPromoFCFA(parseInt(value, 10))} sur le panier`}
                    {minAmount && parseInt(minAmount, 10) > 0
                      ? ` (dès ${formatPromoFCFA(parseInt(minAmount, 10))})`
                      : ''}
                  </Text>
                </View>
              ) : null}

              <Button
                label="Créer le code"
                onPress={handleCreate}
                loading={saving}
                disabled={type === 'percentage' && parseInt(value, 10) > 100}
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
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  tipBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.info + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + '30',
    marginBottom: spacing.lg,
  },
  tipText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
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
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generateText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  typeChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  typeChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  warnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  durationTextActive: {
    color: colors.textInverse,
  },
  previewBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  previewLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  previewValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
