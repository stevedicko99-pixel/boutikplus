import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Dimensions, StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { CheckoutStepper } from '@/components/ui/CheckoutStepper';
import { getAddresses, saveAddress, createOrder, getShop, isDemoMode } from '@/lib/dataService';
import { validateDiscountCode, redeemDiscountCode } from '@/lib/promotionService';
import { formatFCFA } from '@/lib/format';
import { friendlyMessage } from '@/lib/errorMessages';
import { CITY_LIST, getZoneById, getZonesForCity } from '@/constants/cities';
import type { DeliveryAddress, DiscountValidationResult } from '@/types/models';

import type { CheckoutStep } from '@/components/ui/CheckoutStepper';

interface CheckoutScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

const screenWidth = Dimensions.get('window').width;
const isNarrow = screenWidth < 400;

export function CheckoutScreen({ navigation }: CheckoutScreenProps) {
  const {
    selectedSellerGroups,
    selectedTotal,
    includeDelivery,
    setIncludeDelivery,
    clearSelectedOnly,
  } = useCart();
  const activeGroups = selectedSellerGroups;
  const activeSubtotal = selectedTotal;
  const { profile, setPendingReturnTo } = useAuth();
  // En mode démo, profile est toujours null (pas de Supabase). On utilise un
  // buyer de démonstration pour permettre le parcours complet jusqu'au paiement.
  const demoBuyerId = 'demo-buyer';
  const buyerId = profile?.id ?? (isDemoMode ? demoBuyerId : null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const emptyAddress = () => ({ city: CITY_LIST[0], zoneId: '', district: '', landmark: '', instructions: '', phone: profile?.phone ?? '', latitude: null as number | null, longitude: null as number | null });
  const [newAddr, setNewAddr] = useState(emptyAddress);
  const [loading, setLoading] = useState(false);

  // ─── Navigation par étapes ──────────────────────────────────────────
  // Étapes supportées : address → review → payment
  const [step, setStep] = useState<CheckoutStep>('address');

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
    if (buyerId) loadAddresses();
  }, [buyerId]);

  const loadAddresses = async () => {
    if (!buyerId) return;
    const addrs = await getAddresses(buyerId);
    setAddresses(addrs);
    const def = addrs.find((a) => a.is_default) ?? addrs[0];
    if (def) setSelectedAddr(def.id);
  };

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Localisation refusée', 'Autorisez la localisation pour utiliser votre position.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setNewAddr((current) => ({ ...current, latitude: location.coords.latitude, longitude: location.coords.longitude }));
  };

  const handleSaveAddr = async () => {
    if (!newAddr.zoneId || !newAddr.landmark.trim() || !newAddr.phone) {
      Alert.alert('Erreur', 'Veuillez choisir une zone et renseigner le repère et le téléphone');
      return;
    }
    if (!buyerId) return;
    const selectedZone = getZoneById(newAddr.zoneId);
    await saveAddress({
      city: newAddr.city,
      zone_id: newAddr.zoneId,
      latitude: newAddr.latitude,
      longitude: newAddr.longitude,
      landmark: newAddr.landmark.trim(),
      district: newAddr.district.trim() || selectedZone?.name || newAddr.landmark.trim(),
      instructions: newAddr.instructions || newAddr.landmark.trim(),
      contact_phone: newAddr.phone,
      user_id: buyerId,
      is_default: addresses.length === 0,
    });
    setShowAddrForm(false);
    setNewAddr(emptyAddress());
    await loadAddresses();
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

    for (const group of activeGroups) {
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

  // ─── Suivant / Retour entre étapes ───────────────────────────────────
  const handleNext = () => {
    if (step === 'address') {
      if (includeDelivery) {
        if (!selectedAddr) {
          Alert.alert('Adresse requise', 'Veuillez sélectionner ou ajouter une adresse de livraison');
          return;
        }
      }
      // Adresse OK (ou livraison désactivée). Passer au récap.
      setStep('review');
      return;
    }
    if (step === 'review') {
      // Bouton "Confirmer et payer" sur l'étape review → déclenche handlePlaceOrder
      handlePlaceOrder();
    }
  };
  const handleBack = () => {
    if (step === 'review') {
      setStep('address');
      return;
    }
    navigation.goBack();
  };

  const handlePlaceOrder = async () => {
    if (activeGroups.length === 0) {
      Alert.alert('Sélection vide', 'Retournez au panier et sélectionnez les articles à commander.');
      return;
    }
    if (activeGroups.length > 1) {
      Alert.alert('Une boutique à la fois', 'Veuillez ne commander que dans une boutique à la fois.');
      return;
    }
    // CAS INVITÉ (y compris mode démo) : connexion obligatoire SEULEMENT au moment de payer.
    // La navigation en mode démo est libre, mais la TRANSACTION exige un vrai compte.
    if (!profile) {
      setPendingReturnTo({ screen: 'Checkout' });
      navigation.navigate('Login', { returnTo: 'Checkout' });
      return;
    }
    const realBuyerId = profile.id;
    void buyerId; // (le buyerId de démo sert uniquement à la navigation, pas à la commande)
    if (includeDelivery && !selectedAddr) {
      Alert.alert('Adresse requise', 'Veuillez sélectionner ou ajouter une adresse de livraison');
      return;
    }
    setLoading(true);
    const orderIds: string[] = [];
    let redeemedOrderId: string | null = null;
    for (const group of activeGroups) {
      let resolvedShop;
      try {
        resolvedShop = group.shop?.owner_id ? group.shop : await getShop(group.shopId);
      } catch (caughtError) {
        Alert.alert('Boutique indisponible', friendlyMessage(caughtError instanceof Error ? caughtError.message : String(caughtError)));
        setLoading(false);
        return;
      }
      if (!resolvedShop?.owner_id) {
        Alert.alert('Boutique indisponible', 'Impossible d’identifier le propriétaire de cette boutique. Rechargez le panier puis réessayez.');
        setLoading(false);
        return;
      }
      const sellerId = resolvedShop.owner_id;
      // Applique la réduction sur le sous-total de la boutique concernée
      const groupDiscount =
        appliedPromo && appliedPromo.shopId === group.shopId
          ? appliedPromo.result.discount_amount
          : 0;
      const groupDeliveryFee = includeDelivery ? 1000 : 0;
      const groupTotal = Math.max(0, group.subtotal - groupDiscount + groupDeliveryFee);
      let orderId: string | null = null;
      let error: string | null = null;
      try {
        ({ orderId, error } = await createOrder({
          buyerId: realBuyerId,
          sellerId,
          items: group.lines.map((l) => ({
            product_id: l.product.id,
            quantity: l.quantity,
            unit_price: l.product.price,
            variant_info: l.variant_info ?? null,
          })),
          totalAmount: groupTotal,
          addressId: includeDelivery ? selectedAddr : null, // null = retrait en boutique
          includeDelivery,
          deliveryFee: groupDeliveryFee,
          note: note || null,
        }));
      } catch (caughtError) {
        Alert.alert('Erreur', friendlyMessage(caughtError instanceof Error ? caughtError.message : String(caughtError)));
        setLoading(false);
        return;
      }
      if (error) {
        Alert.alert('Erreur', friendlyMessage(error));
        setLoading(false);
        return;
      }
      if (!orderId) {
        Alert.alert('Erreur', 'La commande a été créée sans identifiant de paiement. Veuillez réessayer.');
        setLoading(false);
        return;
      }
      orderIds.push(orderId);
      if (groupDiscount > 0 && redeemedOrderId === null) {
        redeemedOrderId = orderId;
      }
    }

    // Consomme le code promo
    if (appliedPromo && redeemedOrderId) {
      await redeemDiscountCode({
        code: appliedPromo.result.discount_code!.code,
        shopId: appliedPromo.shopId,
        orderId: redeemedOrderId,
        buyerId: realBuyerId,
        amount: appliedPromo.result.discount_amount,
      }).catch((e) => console.error('redeemDiscountCode:', e));
    }

    // Retire uniquement les articles de cette commande ; la sélection reste
    // intacte pendant toutes les étapes précédentes du parcours.
    clearSelectedOnly();

    setPendingReturnTo(null); // Consommé
    setLoading(false);
    const firstGroup = activeGroups[0];
    const firstGroupDiscount =
      appliedPromo && appliedPromo.shopId === firstGroup.shopId
        ? appliedPromo.result.discount_amount
        : 0;
    const firstGroupDeliv = includeDelivery ? 1000 : 0;
    navigation.navigate('Payment', {
      orderId: orderIds[0],
      amount: firstGroup
        ? Math.max(0, firstGroup.subtotal - firstGroupDiscount + firstGroupDeliv)
        : undefined,
      shopId: firstGroup?.shopId,
    });
  };

  const sellerCount = activeGroups.length;
  const deliveryFee = includeDelivery ? sellerCount * 1000 : 0;
  const itemCount = activeGroups.reduce((s, g) => s + g.lines.reduce((n, l) => n + l.quantity, 0), 0);
  const grandTotal = Math.max(0, activeSubtotal + deliveryFee - discountAmount);
  const invalidSelectionMessage = activeGroups.length === 0
    ? 'Aucun article sélectionné. Retournez au panier pour choisir les articles à commander.'
    : activeGroups.length > 1
      ? 'Votre sélection contient plusieurs boutiques. Retournez au panier et ne conservez qu’une boutique.'
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={isNarrow ? 22 : 24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Commande</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Bannière invité friendly : pas besoin de compte pour voir le panier !
          Login demandé SEULEMENT au clic sur "Payer". */}
      {!buyerId ? (
        <View style={styles.guestBanner}>
          <View style={styles.guestIcon}>
            <Feather name="user-plus" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.guestTitle}>Pas de compte ? Aucun souci ✨</Text>
            <Text style={styles.guestDesc}>
              Tu peux préparer ta commande tranquillement. La connexion ne sera
              demandée qu'au moment de payer (en 10 secondes).
            </Text>
          </View>
          <Pressable
            style={styles.guestCta}
            onPress={() => {
              setPendingReturnTo({ screen: 'Checkout' });
              navigation.navigate('Login', { returnTo: 'Checkout' });
            }}
          >
            <Text style={styles.guestCtaText}>Se connecter</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Stepper 4 étapes : Panier → Adresse → Récap → Paiement */}
      <CheckoutStepper
        current={step}
        onStepPress={(s) => {
          if (s === 'cart') navigation.goBack();
          if (s === 'address') setStep('address');
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {invalidSelectionMessage ? (
          <Card style={styles.selectionErrorCard}>
            <Feather name="alert-circle" size={22} color={colors.danger} />
            <Text style={styles.selectionErrorText}>{invalidSelectionMessage}</Text>
          </Card>
        ) : null}
        {step === 'address' ? (
          <>
            {/* ─── Livraison O/N — toggle avant adresse (si pas livraison, pas besoin d'adresse) ─── */}
            <Card style={styles.deliveryToggleCard}>
              <Pressable style={styles.deliveryToggleRow} onPress={() => setIncludeDelivery(!includeDelivery)}>
                <View style={styles.deliveryToggleLeft}>
                  <View style={[styles.deliveryIcon, { backgroundColor: includeDelivery ? colors.secondaryDeep + '18' : colors.surfaceAlt }]}>
                    <MaterialCommunityIcons name={includeDelivery ? 'truck-fast' : 'handshake-outline'} size={20} color={includeDelivery ? colors.secondaryDeep : colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.deliveryTitle}>
                      {includeDelivery ? 'Livraison à domicile' : 'Retrait chez le vendeur'}
                    </Text>
                    <Text style={styles.deliverySub}>
                      {includeDelivery
                        ? `1 000 FCFA par vendeur · paiement au livreur`
                        : `Rendez-vous en main propre · sans frais`}
                    </Text>
                  </View>
                </View>
                <SwitchToggle value={includeDelivery} onValueChange={setIncludeDelivery} />
              </Pressable>
            </Card>

            {includeDelivery && (
              <>
                {/* Adresse de livraison */}
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
                    <Text style={styles.fieldLabel}>Ville</Text>
                    <ChoiceChips options={CITY_LIST} value={newAddr.city} onChange={(city) => setNewAddr({ ...newAddr, city, zoneId: '' })} />
                    <Text style={styles.fieldLabel}>Zone *</Text>
                    <ChoiceChips options={getZonesForCity(newAddr.city).map((zone) => ({ id: zone.id, label: zone.name }))} value={newAddr.zoneId} onChange={(zoneId) => setNewAddr({ ...newAddr, zoneId })} />
                    <Input label="Repère *" value={newAddr.landmark} onChangeText={(v) => setNewAddr({ ...newAddr, landmark: v })} placeholder="Ex: portail bleu près de la pharmacie" icon="map-pin" />
                    <Input label="Quartier (compatibilité)" value={newAddr.district} onChangeText={(v) => setNewAddr({ ...newAddr, district: v })} placeholder="Renseigné depuis la zone si vide" icon="home" />
                    <Input label="Indications" value={newAddr.instructions} onChangeText={(v) => setNewAddr({ ...newAddr, instructions: v })} placeholder="Instructions complémentaires" multiline numberOfLines={2} />
                    <Pressable style={styles.locationButton} onPress={useCurrentLocation}><Feather name="crosshair" size={16} color={colors.primary} /><Text style={styles.locationButtonText}>{newAddr.latitude != null ? 'Position GPS enregistrée' : 'Utiliser ma position'}</Text></Pressable>
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
            )}
          </>
        ) : null}

        {step === 'review' ? (
          <>
            {/* ─── Étape RÉCAP ─── */}
            <Card style={styles.recapHeaderCard}>
              <View style={styles.recapHeaderRow}>
                <View style={styles.recapHeaderIcon}>
                  <Feather name={includeDelivery ? 'truck' : 'shopping-bag'} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapHeaderTitle}>
                    {includeDelivery ? 'Livraison à domicile' : 'Retrait chez le vendeur'}
                  </Text>
                  <Text style={styles.recapHeaderSub}>
                    {includeDelivery
                      ? (() => {
                          const a = addresses.find(x => x.id === selectedAddr);
                          return a ? `${a.city} · ${a.district} · ${a.contact_phone}` : 'Adresse choisie';
                        })()
                      : `Vous rencontrerez directement le vendeur`}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}

        {/* Récap par vendeur (visible dans les deux étapes) */}
        <Text style={styles.sectionTitle}>Articles{step === 'review' ? ` (${itemCount})` : ''}</Text>
        {activeGroups.map((group) => (
          <Card key={group.sellerId} style={styles.recapCard}>
            <Text style={styles.recapShop}>{group.shop?.name}</Text>
            {group.lines.map((line, idx) => (
              <View key={line.product.id + '-' + idx} style={styles.recapLine}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapItem} numberOfLines={1}>{line.quantity}× {line.product.name}</Text>
                  {(line.variant_info?.model || line.variant_info?.color) ? (
                    <Text style={styles.recapVariant}>
                      {[line.variant_info.model && `Modèle: ${line.variant_info.model}`, line.variant_info.color && `Couleur: ${line.variant_info.color}`].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.recapPrice}>{formatFCFA(line.product.price * line.quantity)}</Text>
              </View>
            ))}
            <View style={styles.recapSub}>
              <Text style={styles.recapSubLabel}>Sous-total boutique</Text>
              <Text style={styles.recapSubAmount}>{formatFCFA(group.subtotal)}</Text>
            </View>
            {includeDelivery ? (
              <View style={styles.recapSub}>
                <Text style={styles.recapSubLabel}>Livraison</Text>
                <Text style={styles.recapSubAmount}>{formatFCFA(1000)}</Text>
              </View>
            ) : null}
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
        <Card style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{formatFCFA(activeSubtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison{includeDelivery ? ` (${sellerCount} vendeur${sellerCount > 1 ? 's' : ''})` : ' (désactivée)'}</Text>
            <Text style={[styles.totalValue, !includeDelivery && { color: colors.textMuted }]}>{includeDelivery ? formatFCFA(deliveryFee) : '—'}</Text>
          </View>
          {discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.discountLabel}>Réduction</Text>
              <Text style={styles.discountValue}>−{formatFCFA(discountAmount)}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.grandTotalLabel}>Total à payer</Text><Text style={styles.grandTotal}>{formatFCFA(grandTotal)}</Text></View>
        </Card>
      </ScrollView>

      <View style={styles.bottomBar}>
        {/* Bouton Retour contextuel (selon step) */}
        <Pressable onPress={handleBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={colors.text} />
          <Text style={styles.backText}>
            {step === 'review' ? 'Étape précédente' : 'Retour'}
          </Text>
        </Pressable>
        <Button
          label={step === 'review' ? 'Confirmer et payer' : 'Continuer'}
          onPress={handleNext}
          loading={loading}
          style={{ flex: 1, marginLeft: spacing.md }}
          disabled={Boolean(invalidSelectionMessage) || (step === 'address' && includeDelivery && !selectedAddr)}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Switch Toggle ───
function SwitchToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      style={[switchStyles.track, value && switchStyles.trackOn]}
    >
      <View style={[switchStyles.thumb, value && switchStyles.thumbOn]} />
    </Pressable>
  );
}

const switchStyles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.borderLight, padding: 2, justifyContent: 'center' },
  trackOn: { backgroundColor: colors.secondaryDeep },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  thumbOn: { transform: [{ translateX: 18 }] },
});

function ChoiceChips({ options, value, onChange }: { options: readonly (string | { id: string; label: string })[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.choiceGrid}>{options.map((option) => {
    const id = typeof option === 'string' ? option : option.id;
    const label = typeof option === 'string' ? option : option.label;
    return <Pressable key={id} style={[styles.choiceChip, value === id && styles.choiceChipActive]} onPress={() => onChange(id)}><Text style={[styles.choiceText, value === id && styles.choiceTextActive]}>{label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: isNarrow ? spacing.md : spacing.lg, paddingHorizontal: isNarrow ? spacing.md : spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: isNarrow ? typography.sizes.title : typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  /* Bannière invité */
  guestBanner: {
    marginHorizontal: isNarrow ? spacing.md : spacing.lg,
    padding: isNarrow ? spacing.sm : spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  guestIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  guestDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  guestCta: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
  guestCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  scroll: { padding: isNarrow ? spacing.md : spacing.lg, paddingTop: 0, paddingBottom: isNarrow ? 100 : 120 },
  selectionErrorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.danger, marginTop: spacing.md },
  selectionErrorText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.danger, lineHeight: 20 },
  sectionTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, marginTop: isNarrow ? spacing.md : spacing.lg, marginBottom: isNarrow ? spacing.sm : spacing.md },
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
  fieldLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.xs },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  choiceChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  choiceChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  choiceTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, marginBottom: spacing.md },
  locationButtonText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.primary, fontWeight: typography.weights.semibold },
  formActions: { flexDirection: 'row', marginTop: spacing.sm },
  addAddrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.lg, marginBottom: spacing.md },
  addAddrText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.primary, fontWeight: typography.weights.semibold },
  recapCard: { marginBottom: spacing.md },
  recapShop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.secondary, marginBottom: spacing.sm },
  recapLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  recapItem: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text, marginRight: spacing.sm },
  recapVariant: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, marginTop: 2 },
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
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: isNarrow ? spacing.md : spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: isNarrow ? spacing.lg : spacing.xxl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  backText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text },
  bottomLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  bottomAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.primary },
  deliveryToggleCard: { marginTop: spacing.md, marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
  deliveryToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deliveryToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deliveryIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  deliveryTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  deliverySub: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginTop: 2 },
  recapHeaderCard: { marginTop: spacing.md, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.primary + '12', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary + '30' },
  recapHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recapHeaderIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  recapHeaderTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primaryDeep },
  recapHeaderSub: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.text, marginTop: 2, lineHeight: 18 },
  totalCard: { marginTop: spacing.sm, padding: isNarrow ? spacing.md : spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border },
});
