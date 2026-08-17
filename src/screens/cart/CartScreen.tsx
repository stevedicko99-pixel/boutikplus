import { useState } from 'react';
import { Alert, Dimensions, StyleSheet, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatFCFA } from '@/lib/format';
import type { CartLine, CartSellerGroup } from '@/context/CartContext';
import type { VariantInfo } from '@/types/models';

const screenWidth = Dimensions.get('window').width;
const isNarrow = screenWidth < 400;

interface CartScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function CartScreen({ navigation }: CartScreenProps) {
  const {
    sellerGroups,
    selectedSellerGroups,
    count,
    total,
    selectedTotal,
    selectedLineCount,
    hasSelection,
    includeDelivery,
    setIncludeDelivery,
    toggleSelected,
    setAllSelected,
    updateQuantity,
    removeItem,
    updateVariant,
    clear,
  } = useCart();

  // Livraison = 1000 FCFA par vendeur sélectionné (pas tous les vendeurs)
  const deliveryFee = includeDelivery && hasSelection
    ? selectedSellerGroups.length * 1000
    : 0;
  const grandTotal = selectedTotal + deliveryFee;
  const hasMultipleSelectedShops = selectedSellerGroups.length > 1;

  const handleCheckout = () => {
    if (hasMultipleSelectedShops) {
      Alert.alert(
        'Une boutique à la fois',
        'Votre sélection contient plusieurs boutiques. Désélectionnez les articles des autres boutiques avant de passer commande.',
      );
      return;
    }
    navigation.navigate('Checkout');
  };

  const totalLines = sellerGroups.reduce((s, g) => s + g.lines.length, 0);
  const allAreSelected = selectedLineCount === totalLines && totalLines > 0;

  if (count === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="shopping-cart"
          title="Votre panier est vide"
          message="Parcourez les boutiques et ajoutez des produits"
          action={<Button label="Explorer" onPress={() => navigation.navigate('Home')} style={{ marginTop: spacing.lg }} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon panier</Text>
        <Pressable onPress={clear} hitSlop={10}>
          <Text style={styles.clearBtn}>Vider</Text>
        </Pressable>
      </View>

      {/* ─── Barre Tout sélectionner ─── */}
      <View style={styles.selectAllRow}>
        <CheckBox value={allAreSelected} onToggle={() => setAllSelected(!allAreSelected)} />
        <Text style={styles.selectAllText}>Tout sélectionner</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.selectionPill}>
          <Text style={styles.selectionPillText}>
            {selectedLineCount} article{selectedLineCount > 1 ? 's' : ''} · {formatFCFA(selectedTotal)}
          </Text>
        </View>
      </View>

      <FlatList
        data={sellerGroups}
        keyExtractor={(item) => item.sellerId}
        renderItem={({ item: group }) => (
          <SellerGroup
            group={group}
            onQty={updateQuantity}
            onRemove={removeItem}
            onVariant={updateVariant}
            onToggle={toggleSelected}
            onShopPress={(shopId) => navigation.navigate('ShopDetail', { shopId })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: isNarrow ? spacing.md : spacing.lg }} />}
        ListFooterComponent={
          /* ─── Options supplémentaires sous la liste ─── */
          <View style={styles.optionsCard}>
            {/* Toggle Livraison */}
            <Pressable style={styles.optionRow} onPress={() => hasSelection && setIncludeDelivery(!includeDelivery)}>
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, !hasSelection && {opacity: 0.5}]}>
                  <MaterialCommunityIcons name="truck-fast-outline" size={18} color={colors.secondaryDeep} />
                </View>
                <View>
                  <Text style={[styles.optionTitle, !hasSelection && {opacity:0.5}]}>Livraison à domicile</Text>
                  <Text style={styles.optionSub}>
                    {includeDelivery
                      ? `1 000 FCFA par vendeur (paiement au livreur)`
                      : `Retrait en main propre chez le vendeur (gratuit)`}
                  </Text>
                </View>
              </View>
              <SwitchToggle value={includeDelivery && hasSelection} onValueChange={(v) => hasSelection && setIncludeDelivery(v)} />
            </Pressable>
          </View>
        }
      />
      <View style={styles.bottomBar}>
        <View style={styles.totalCol}>
          {includeDelivery && hasSelection ? (
            <Text style={styles.deliveryMini}>+ Livraison estimée</Text>
          ) : null}
          <Text style={styles.totalLabel}>Total sélection</Text>
          <Text style={styles.totalAmount}>{formatFCFA(grandTotal)}</Text>
        </View>
        <Button
          label="Passer commande"
          onPress={handleCheckout}
          style={{ flex: 1, marginLeft: spacing.lg }}
          disabled={!hasSelection}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Checkbox UI (custom design premium) ───
function CheckBox({ value, onToggle }: { value: boolean; onToggle?: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={6} style={[styles.checkbox, value && styles.checkboxOn]}>
      {value ? <Feather name="check" size={14} color={colors.textInverse} /> : null}
    </Pressable>
  );
}

// ─── Toggle Switch iOS style ───
function SwitchToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      style={[styles.switchTrack, value && styles.switchTrackOn]}
    >
      <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
    </Pressable>
  );
}

function SellerGroup({
  group,
  onQty,
  onRemove,
  onVariant,
  onToggle,
  onShopPress,
}: {
  group: CartSellerGroup;
  onQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onVariant: (productId: string, variant: VariantInfo) => void;
  onToggle: (productId: string) => void;
  onShopPress: (shopId: string) => void;
}) {
  return (
    <View style={styles.groupCard}>
      <Pressable style={styles.groupHead} onPress={() => group.shop && onShopPress(group.shop.id)}>
        <Feather name="briefcase" size={16} color={colors.secondary} />
        <Text style={styles.groupShopName} numberOfLines={1}>{group.shop?.name ?? 'Boutique'}</Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Pressable>
      {group.lines.map((line, idx) => (
        <CartLineItem key={line.product.id + '-' + idx} line={line} onQty={onQty} onRemove={onRemove} onVariant={onVariant} onToggle={onToggle} />
      ))}
      <View style={styles.groupFoot}>
        <Text style={styles.groupFootLabel}>Sous-total</Text>
        <Text style={styles.groupFootAmount}>{formatFCFA(group.subtotal)}</Text>
      </View>
    </View>
  );
}

function CartLineItem({ line, onQty, onRemove, onVariant, onToggle }: {
  line: CartLine;
  onQty: (id: string, q: number) => void;
  onRemove: (id: string) => void;
  onVariant: (id: string, v: VariantInfo) => void;
  onToggle: (id: string) => void;
}) {
  const cartCtx = useCart();
  const selected = cartCtx.allSelected || cartCtx.selectedIds.has(line.product.id);
  const img = line.product.images?.[0]?.image_url;
  const [model, setModel] = useState(line.variant_info?.model ?? '');
  const [color, setColor] = useState(line.variant_info?.color ?? '');

  const handleModelChange = (v: string) => {
    setModel(v);
    onVariant(line.product.id, { model: v || undefined, color: color || undefined });
  };
  const handleColorChange = (v: string) => {
    setColor(v);
    onVariant(line.product.id, { model: model || undefined, color: v || undefined });
  };

  return (
    <View style={[styles.line, !selected && { opacity: 0.55 }]}>
      <CheckBox value={selected} onToggle={() => onToggle(line.product.id)} />
      {img ? (
        <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}><Feather name="image" size={18} color={colors.textMuted} /></View>
      )}
      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>{line.product.name}</Text>
        <Text style={styles.linePrice}>{formatFCFA(line.product.price)}</Text>
        {/* Sélection modèle / couleur (style Pinduoduo) */}
        <View style={styles.variantRow}>
          <View style={styles.variantInput}>
            <Text style={styles.variantLabel}>Modèle</Text>
            <TextInput
              style={styles.variantField}
              value={model}
              onChangeText={handleModelChange}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.variantInput}>
            <Text style={styles.variantLabel}>Couleur</Text>
            <TextInput
              style={styles.variantField}
              value={color}
              onChangeText={handleColorChange}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <View style={styles.lineControls}>
          <View style={styles.qtyControl}>
            <Pressable style={styles.qtyBtn} onPress={() => onQty(line.product.id, line.quantity - 1)}>
              <Feather name="minus" size={14} color={colors.text} />
            </Pressable>
            <Text style={styles.qtyValue}>{line.quantity}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => onQty(line.product.id, line.quantity + 1)}>
              <Feather name="plus" size={14} color={colors.text} />
            </Pressable>
          </View>
          <Pressable onPress={() => onRemove(line.product.id)} hitSlop={8}>
            <Feather name="trash-2" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: isNarrow ? spacing.md : spacing.lg, paddingHorizontal: isNarrow ? spacing.md : spacing.lg, paddingBottom: isNarrow ? spacing.sm : spacing.md },
  title: { fontFamily: typography.fontFamily, fontSize: isNarrow ? typography.sizes.title : typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  clearBtn: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.danger, fontWeight: typography.weights.semibold },
  list: { padding: isNarrow ? spacing.md : spacing.lg, paddingTop: 0 },
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  groupShopName: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  line: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  thumb: { width: isNarrow ? 60 : 72, height: isNarrow ? 60 : 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lineInfo: { flex: 1 },
  lineName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginBottom: 4 },
  linePrice: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.xs },
  variantRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  variantInput: { flex: 1 },
  variantLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: 2 },
  variantField: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.text, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  lineControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text, minWidth: 20, textAlign: 'center' },
  groupFoot: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  groupFootLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  groupFootAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: isNarrow ? spacing.md : spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: isNarrow ? spacing.lg : spacing.xxl, marginBottom: isNarrow ? 60 : 84 },
  totalLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  totalAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.primary },
  // ─── Sélection articles ───
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: isNarrow ? spacing.md : spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  selectAllText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text },
  checkboxWrap: { padding: 4 },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.secondaryDeep, borderColor: colors.secondaryDeep },
  selectionPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.secondaryDeep + '18' },
  selectionPillText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.secondaryDeep },
  // ─── Options cards (livraison toggle) ───
  optionsCard: { marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  optionIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.secondaryDeep + '18', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  optionSub: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2, maxWidth: 240 },
  switchTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.borderLight, padding: 2, justifyContent: 'center' },
  switchTrackOn: { backgroundColor: colors.secondaryDeep },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  switchThumbOn: { transform: [{ translateX: 18 }] },
  // Total col
  totalCol: { flex: 1 },
  deliveryMini: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.secondaryDeep, fontWeight: typography.weights.semibold },
});
