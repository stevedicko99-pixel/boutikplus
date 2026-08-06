import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { getAddresses, saveAddress, createOrder } from '@/lib/dataService';
import { validateDiscountCode, redeemDiscountCode } from '@/lib/promotionService';
import { formatFCFA } from '@/lib/format';
import { friendlyMessage } from '@/lib/errorMessages';
import { CITY_LIST } from '@/constants/cities';
import type { DeliveryAddress, DiscountValidationResult } from '@/types/models';
import { showAlert } from '@/lib/dialog';
import { DELIVERY_FEE_PER_SELLER } from '@/constants/delivery';

interface CheckoutScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function CheckoutScreen({ navigation }: CheckoutScreenProps) {
  const { sellerGroups, removeItems } = useCart();
  const { profile } = useAuth();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ city: CITY_LIST[0], district: '', instructions: '', phone: profile?.phone ?? '' });
  const [loading, setLoading] = useState(false);
  // Livraison optionnelle : l'acheteur peut préférer retirer sa commande.
  const [wantsDelivery, setWantsDelivery] = useState(true);
  // Paiement partiel : l'acheteur choisit les boutiques à payer maintenant.
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);

  // Code promo
  const [promoInput, setPromoInput] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    result: DiscountValidationResult;
    shopId: string;
    sellerId: string;
    shopName: string;
  } | null>(null);

  useEffect(() => {
    if (profile) loadAddresses();
  }, [profile]);

  // Par défaut tout le panier est sélectionné ; on suit les vendeurs encore présents.
  useEffect(() => {
    const ids = sellerGroups.map((g) => g.sellerId);
    setSelectedSellers((prev) => {
      const kept = prev.filter((id) => ids.includes(id));
      return kept.length ? kept : ids;
    });
  }, [sellerGroups]);

  const selectedGroups = sellerGroups.filter((g) =>
    selectedSellers.includes(g.sellerId),
  );

  const toggleSeller = (sellerId: string) => {
    setSelectedSellers((prev) =>
      prev.includes(sellerId)
        ? prev.filter((id) => id !== sellerId)
        : [...prev, sellerId],
    );
  };

  const loadAddresses = async (preferDistrict?: string) => {
    const addrs = await getAddresses(profile!.id);
    setAddresses(addrs);
    const preferred = preferDistrict
      ? addrs.find((a) => a.district === preferDistrict)
      : undefined;
    const def = preferred ?? addrs.find((a) => a.is_default) ?? addrs[0];
    if (def) setSelectedAddr(def.id);
  };

  const buildNote = (shopName?: string) => {
    const parts = [note.trim()];
    if (!wantsDelivery) parts.push(`Retrait sur place${shopName ? ` (${shopName})` : ''}`);
    const merged = parts.filter(Boolean).join(' — ');
    return merged || null;
  };

  const handleSaveAddr = async () => {
    if (!newAddr.district || !newAddr.phone) {
      showAlert('Champs manquants', 'Veuillez remplir le quartier et le téléphone');
      return;
    }
    setLoading(true);
    const { error } = await saveAddress({
      city: newAddr.city,
      district: newAddr.district,
      instructions: newAddr.instructions,
      contact_phone: newAddr.phone,
      user_id: profile!.id,
      is_default: addresses.length === 0,
    });
    setLoading(false);
    if (error) {
      showAlert('Adresse non enregistrée', friendlyMessage(error));
      return;
    }
    const savedDistrict = newAddr.district;
    setShowAddrForm(false);
    setNewAddr({ city: CITY_LIST[0], district: '', instructions: '', phone: profile?.phone ?? '' });
    await loadAddresses(savedDistrict);
  };

  // Tente de valider le code promo saisi contre chaque boutique du panier.
  // Le code est rattaché à une boutique : on cherche la première pour laquelle
  // il est valide, puis on applique la réduction à son sous-total.
  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError('Saisissez un code promo');
      return;
    }
    setPromoBusy(true);
    setPromoError(null);
    setAppliedPromo(null);

    let lastError = 'Code introuvable pour les boutiques du panier';
    let found:
      | {
          result: DiscountValidationResult;
          shopId: string;
          sellerId: string;
          shopName: string;
        }
      | null = null;

    for (const group of selectedGroups) {
      const shopId = group.shop?.id;
      if (!shopId) continue;
      const result = await validateDiscountCode({
        code,
        shopId,
        cartTotal: group.subtotal,
        buyerId: profile?.id ?? null,
      });
      if (result.valid && result.discount_code) {
        found = {
          result,
          shopId,
          sellerId: group.sellerId,
          shopName: group.shop?.name ?? 'Boutique',
        };
        break;
      }
      if (result.error) lastError = result.error;
    }

    setPromoBusy(false);
    if (found) {
      setAppliedPromo(found);
      setPromoInput('');
    } else {
      setPromoError(lastError);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const discountAmount = appliedPromo?.result.discount_amount ?? 0;

  const handlePlaceOrder = async () => {
    if (!profile) {
      showAlert('Connexion requise', 'Connectez-vous pour finaliser votre commande.');
      navigation.navigate('Login');
      return;
    }
    if (selectedGroups.length === 0) {
      showAlert('Aucun article sélectionné', 'Choisissez au moins une boutique à payer maintenant.');
      return;
    }
    // Une adresse n'est indispensable que si l'acheteur demande la livraison :
    // sans ce contrôle, l'étape suivante échouait sans explication.
    if (wantsDelivery && !selectedAddr) {
      showAlert('Adresse manquante', 'Ajoutez et sélectionnez une adresse de livraison, ou choisissez le retrait.');
      return;
    }
    setLoading(true);
    const orderIds: string[] = [];
    let redeemedOrderId: string | null = null;
    for (const group of selectedGroups) {
      // Applique la réduction sur le sous-total de la boutique concernée
      const groupDiscount =
        appliedPromo && appliedPromo.sellerId === group.sellerId
          ? appliedPromo.result.discount_amount
          : 0;
      const groupTotal = Math.max(
        0,
        group.subtotal - groupDiscount + (wantsDelivery ? DELIVERY_FEE_PER_SELLER : 0),
      );
      const { orderId, error } = await createOrder({
        buyerId: profile.id,
        sellerId: group.sellerId,
        items: group.lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.product.price,
        })),
        totalAmount: groupTotal,
        addressId: wantsDelivery ? selectedAddr : null,
        note: buildNote(group.shop?.name),
      });
      if (error) {
        showAlert('Commande impossible', friendlyMessage(error));
        setLoading(false);
        return;
      }
      if (orderId) {
        orderIds.push(orderId);
        if (groupDiscount > 0 && redeemedOrderId === null) {
          redeemedOrderId = orderId;
        }
      }
    }

    // Consomme le code promo (incrémente le compteur + événement de conversion)
    if (appliedPromo && redeemedOrderId) {
      await redeemDiscountCode({
        code: appliedPromo.result.discount_code!.code,
        shopId: appliedPromo.shopId,
        orderId: redeemedOrderId,
        buyerId: profile.id,
        amount: appliedPromo.result.discount_amount,
      }).catch((e) => console.error('redeemDiscountCode:', e));
    }

    // Seules les lignes commandées quittent le panier (paiement partiel).
    removeItems(
      selectedGroups.flatMap((g) => g.lines.map((l) => l.product.id)),
    );
    setLoading(false);
    if (orderIds.length === 0) return;
    // Une commande par boutique : on enchaîne les paiements Mobile Money.
    navigation.navigate('Payment', {
      orderId: orderIds[0],
      remainingOrderIds: orderIds.slice(1),
    });
  };

  const selectedSubtotal = selectedGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const deliveryFee = wantsDelivery ? selectedGroups.length * DELIVERY_FEE_PER_SELLER : 0;
  const grandTotal = Math.max(0, selectedSubtotal + deliveryFee - discountAmount);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Commande</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Mode de réception */}
        <Text style={styles.sectionTitle}>Livraison</Text>
        <View style={styles.deliveryToggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deliveryLabel}>
              {wantsDelivery ? 'Faire livrer ma commande' : 'Retrait chez le vendeur'}
            </Text>
            <Text style={styles.deliveryHint}>
              {wantsDelivery
                ? `${formatFCFA(DELIVERY_FEE_PER_SELLER)} par boutique`
                : 'Aucun frais de livraison'}
            </Text>
          </View>
          <Switch
            value={wantsDelivery}
            onValueChange={setWantsDelivery}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Activer la livraison"
          />
        </View>

        {/* Adresse de livraison */}
        {wantsDelivery ? (
        <>
        <Text style={styles.sectionTitle}>Adresse de livraison</Text>
        {addresses.map((addr) => (
          <Pressable
            key={addr.id}
            style={[styles.addrCard, selectedAddr === addr.id && styles.addrCardActive]}
            onPress={() => setSelectedAddr(addr.id)}
          >
            <View style={styles.radio}>{selectedAddr === addr.id ? <View style={styles.radioInner} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addrCity}>{addr.city} — {addr.district}</Text>
              {addr.instructions ? <Text style={styles.addrInfo}>{addr.instructions}</Text> : null}
              <Text style={styles.addrPhone}>{addr.contact_phone}</Text>
            </View>
            {addr.is_default ? <View style={styles.defaultTag}><Text style={styles.defaultText}>Par défaut</Text></View> : null}
          </Pressable>
        ))}

        {showAddrForm ? (
          <Card style={styles.addrForm}>
            <Input label="Ville" value={newAddr.city} onChangeText={(v) => setNewAddr({ ...newAddr, city: v })} icon="map-pin" />
            <Input label="Quartier *" value={newAddr.district} onChangeText={(v) => setNewAddr({ ...newAddr, district: v })} placeholder="Ex: Gounghin" icon="home" />
            <Input label="Indications" value={newAddr.instructions} onChangeText={(v) => setNewAddr({ ...newAddr, instructions: v })} placeholder="Ex: près de la pharmacie" multiline numberOfLines={2} />
            <Input label="Téléphone *" value={newAddr.phone} onChangeText={(v) => setNewAddr({ ...newAddr, phone: v })} keyboardType="phone-pad" icon="phone" />
            <View style={styles.formActions}>
              <Button label="Annuler" variant="ghost" onPress={() => setShowAddrForm(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" onPress={handleSaveAddr} style={{ flex: 1, marginLeft: spacing.md }} />
            </View>
          </Card>
        ) : (
          <Pressable style={styles.addAddrBtn} onPress={() => setShowAddrForm(true)}>
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={styles.addAddrText}>Ajouter une adresse</Text>
          </Pressable>
        )}
        </>
        ) : null}

        {/* Récap par vendeur — sélection des boutiques à payer maintenant */}
        <Text style={styles.sectionTitle}>Que payer maintenant ?</Text>
        <Text style={styles.sectionHint}>
          Décochez une boutique pour la garder dans le panier et la payer plus tard.
        </Text>
        {sellerGroups.map((group) => (
          <Card key={group.sellerId} style={styles.recapCard}>
            <Pressable style={styles.recapHead} onPress={() => toggleSeller(group.sellerId)}>
              <View style={[styles.checkbox, selectedSellers.includes(group.sellerId) && styles.checkboxChecked]}>
                {selectedSellers.includes(group.sellerId) ? (
                  <Feather name="check" size={14} color={colors.textInverse} />
                ) : null}
              </View>
              <Text style={styles.recapShop}>{group.shop?.name}</Text>
            </Pressable>
            {group.lines.map((line) => (
              <View key={line.product.id} style={styles.recapLine}>
                <Text style={styles.recapItem} numberOfLines={1}>{line.quantity}× {line.product.name}</Text>
                <Text style={styles.recapPrice}>{formatFCFA(line.product.price * line.quantity)}</Text>
              </View>
            ))}
            <View style={styles.recapSub}>
              <Text style={styles.recapSubLabel}>Sous-total</Text>
              <Text style={styles.recapSubAmount}>{formatFCFA(group.subtotal)}</Text>
            </View>
          </Card>
        ))}

        {/* Note */}
        <Input label="Note (optionnel)" value={note} onChangeText={setNote} placeholder="Instructions pour le vendeur..." multiline numberOfLines={2} />

        {/* Code promo */}
        <Text style={styles.sectionTitle}>Code promo</Text>
        {appliedPromo ? (
          <View style={styles.promoAppliedCard}>
            <View style={styles.promoAppliedInfo}>
              <Feather name="tag" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.promoAppliedCode}>{appliedPromo.result.discount_code!.code}</Text>
                <Text style={styles.promoAppliedDesc}>
                  {appliedPromo.result.discount_code!.discount_type === 'percentage'
                    ? `-${appliedPromo.result.discount_code!.discount_value}% sur ${appliedPromo.shopName}`
                    : `Réduction de ${formatFCFA(appliedPromo.result.discount_code!.discount_value)} sur ${appliedPromo.shopName}`}
                </Text>
              </View>
              <Text style={styles.promoAppliedAmount}>−{formatFCFA(appliedPromo.result.discount_amount)}</Text>
            </View>
            <Pressable onPress={handleRemovePromo} hitSlop={10} style={styles.promoRemoveBtn}>
              <Feather name="x" size={16} color={colors.danger} />
              <Text style={styles.promoRemoveText}>Retirer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.promoInputRow}>
            <View style={{ flex: 1 }}>
              <Input
                label=""
                value={promoInput}
                onChangeText={(v) => {
                  setPromoInput(v.toUpperCase());
                  if (promoError) setPromoError(null);
                }}
                placeholder="Ex: WAX20"
                icon="percent"
                autoCapitalize="characters"
                autoCorrect={false}
                error={promoError ?? undefined}
              />
            </View>
            <Button
              label="Appliquer"
              onPress={handleApplyPromo}
              loading={promoBusy}
              variant="outline"
              style={styles.promoApplyBtn}
            />
          </View>
        )}

        {/* Totaux */}
        <Card style={styles.totalsCard}>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Sous-total</Text><Text style={styles.totalValue}>{formatFCFA(selectedSubtotal)}</Text></View>
          {discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.discountLabel}>Réduction</Text>
              <Text style={styles.discountValue}>−{formatFCFA(discountAmount)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {wantsDelivery
                ? `Livraison (${selectedGroups.length} boutique${selectedGroups.length > 1 ? 's' : ''})`
                : 'Livraison (retrait)'}
            </Text>
            <Text style={styles.totalValue}>{formatFCFA(deliveryFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.grandTotalLabel}>Total à payer</Text><Text style={styles.grandTotal}>{formatFCFA(grandTotal)}</Text></View>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Total</Text>
          <Text style={styles.bottomAmount}>{formatFCFA(grandTotal)}</Text>
        </View>
        <Button
          label={selectedGroups.length > 1 ? `Payer ${selectedGroups.length} boutiques` : 'Payer'}
          onPress={handlePlaceOrder}
          loading={loading}
          disabled={selectedGroups.length === 0}
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: 120 },
  deliveryToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  deliveryLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  deliveryHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
  sectionHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.md, marginTop: -spacing.sm },
  recapHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  addrCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
  addrCardActive: { borderColor: colors.primary, backgroundColor: '#FFF8F0' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  addrCity: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: 2 },
  addrInfo: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: 2 },
  addrPhone: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  defaultTag: { backgroundColor: '#FFF0E0', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  defaultText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold },
  addrForm: { marginBottom: spacing.md },
  formActions: { flexDirection: 'row', marginTop: spacing.sm },
  addAddrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.lg, marginBottom: spacing.md },
  addAddrText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.primary, fontWeight: typography.weights.semibold },
  recapCard: { marginBottom: spacing.md },
  recapShop: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.secondary },
  recapLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  recapItem: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text, marginRight: spacing.sm },
  recapPrice: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text },
  recapSub: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  recapSubLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  recapSubAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  totalsCard: { marginTop: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted },
  totalValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.text, fontWeight: typography.weights.medium },
  discountLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.success, fontWeight: typography.weights.semibold },
  discountValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.success, fontWeight: typography.weights.bold },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
  grandTotalLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  grandTotal: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold, color: colors.primary },
  // Code promo
  promoInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  promoApplyBtn: { minHeight: 50, paddingHorizontal: spacing.lg },
  promoAppliedCard: { backgroundColor: '#E6F7EE', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.success, marginBottom: spacing.md },
  promoAppliedInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  promoAppliedCode: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text, letterSpacing: 0.5 },
  promoAppliedDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
  promoAppliedAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.success },
  promoRemoveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.sm, paddingVertical: spacing.xs },
  promoRemoveText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.danger, fontWeight: typography.weights.semibold },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
  bottomLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  bottomAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.primary },
});
