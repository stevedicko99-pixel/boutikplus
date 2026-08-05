import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useAuth } from '@/context/AuthContext';
import {
  getDriverByUser,
  getPendingDeliveriesForDriver,
  getDriverActiveDeliveries,
  getDriverDeliveryHistory,
  getDriverStats,
  setDriverAvailability,
  acceptDeliveryWithPrice,
  formatFCFA,
  type DriverStats,
} from '@/lib/deliveryService';
import { DeliveryCard } from '@/components/delivery';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import type { DriverProfile, DeliveryRequest } from '@/types/models';

interface DriverDashboardScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
}

type Tab = 'available' | 'active' | 'history';

export function DriverDashboardScreen({ navigation }: DriverDashboardScreenProps) {
  const { profile } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [available, setAvailable] = useState<DeliveryRequest[]>([]);
  const [active, setActive] = useState<DeliveryRequest[]>([]);
  const [history, setHistory] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('available');
  const [toggling, setToggling] = useState(false);

  // 💰 Modal "Fixer mon prix" : c'est le LIVREUR qui détermine son tarif à l'acceptation
  const [priceModal, setPriceModal] = useState<{
    visible: boolean;
    delivery: DeliveryRequest | null;
    priceInput: string;
    submitting: boolean;
  }>({ visible: false, delivery: null, priceInput: '', submitting: false });

  const userId = profile?.id ?? 'demo-seller';

  const load = useCallback(async () => {
    const [d, s, avail, act, hist] = await Promise.all([
      getDriverByUser(userId),
      getDriverStats(userId),
      getPendingDeliveriesForDriver(userId),
      getDriverActiveDeliveries(userId),
      getDriverDeliveryHistory(userId),
    ]);
    setDriver(d);
    setStats(s);
    setAvailable(avail);
    setActive(act);
    setHistory(hist);
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleToggleAvailability = async () => {
    if (!driver) return;
    setToggling(true);
    const { error } = await setDriverAvailability(driver.id, !driver.is_available);
    setToggling(false);
    if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
    setDriver({ ...driver, is_available: !driver.is_available });
  };

  // 💰 Ouvre la modal pour que le LIVREUR fixe SON prix avant d'accepter
  const handleAccept = (delivery: DeliveryRequest) => {
    // Pré-remplir avec l'estimation vendeur comme suggestion de départ
    setPriceModal({
      visible: true,
      delivery,
      priceInput: String(delivery.price ?? 0),
      submitting: false,
    });
  };

  const closePriceModal = () => {
    if (priceModal.submitting) return; // ne pas fermer pendant l'envoi
    setPriceModal((m) => ({ ...m, visible: false, delivery: null, priceInput: '' }));
  };

  const confirmAcceptWithPrice = async () => {
    const delivery = priceModal.delivery;
    if (!delivery) return;
    const driverPrice = parseInt(priceModal.priceInput.replace(/\D/g, ''), 10);
    if (!driverPrice || driverPrice <= 0) {
      Alert.alert('Prix invalide', 'Saisis un montant en FCFA supérieur à 0.');
      return;
    }
    setPriceModal((m) => ({ ...m, submitting: true }));
    const { error } = await acceptDeliveryWithPrice(delivery.id, userId, driverPrice);
    setPriceModal((m) => ({ ...m, submitting: false }));
    if (error) {
      Alert.alert('Erreur', friendlyMessage(error));
      return;
    }
    setPriceModal({ visible: false, delivery: null, priceInput: '', submitting: false });
    Alert.alert(
      'Livraison acceptée 🎉',
      `Tu as fixé ton tarif à ${formatFCFA(driverPrice)} pour cette course.\nLe vendeur a été notifié. Récupère le colis puis démarre la livraison.`,
      [{ text: 'OK', onPress: () => load() }],
    );
  };

  const handleOpen = (deliveryId: string) => {
    navigation.navigate('DeliveryTracking', { deliveryId });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  // Si pas encore livreur, proposer l'inscription
  if (!driver) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Espace livreur</Text>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon="navigation"
          title="Vous n'êtes pas encore livreur"
          message="Inscrivez-vous comme livreur pour gagner de l'argent en livrant les commandes des vendeurs près de chez vous."
          action={
            <Button
              label="Devenir livreur"
              onPress={() => navigation.navigate('DriverRegistration')}
              style={{ marginTop: spacing.lg }}
              icon={<Feather name="plus" size={18} color={colors.textInverse} />}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const currentList = tab === 'available' ? available : tab === 'active' ? active : history;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Espace livreur</Text>
          <StampBadge label="Livreur" color={colors.primaryDeep} size="sm" />
        </View>
        <Pressable onPress={() => navigation.navigate('DriverRegistration')} hitSlop={10}>
          <Feather name="settings" size={22} color={colors.primary} />
        </Pressable>
      </View>
      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Carte profil + disponibilité */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.profileAvatar}>
                  <Feather name="user" size={26} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{driver.profile?.full_name ?? profile?.full_name}</Text>
                  <Text style={styles.profileMeta}>
                    ★ {driver.rating.toFixed(1)} · {driver.total_deliveries} livraisons · {driver.city}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.availToggle,
                    driver.is_available ? styles.availOn : styles.availOff,
                  ]}
                  onPress={handleToggleAvailability}
                  disabled={toggling}
                >
                  <View style={[styles.availDot, { backgroundColor: driver.is_available ? colors.success : colors.textMuted }]} />
                  <Text style={[styles.availText, driver.is_available ? styles.availTextOn : styles.availTextOff]}>
                    {driver.is_available ? 'Disponible' : 'Indisponible'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Statistiques */}
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.activeDeliveries}</Text>
                  <Text style={styles.statLabel}>En cours</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.completedDeliveries}</Text>
                  <Text style={styles.statLabel}>Terminées</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.thisMonthEarnings > 0 ? formatFCFA(stats.thisMonthEarnings) : '0'}</Text>
                  <Text style={styles.statLabel}>Ce mois</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalEarnings > 0 ? formatFCFA(stats.totalEarnings) : '0'}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            )}

            {/* Onglets */}
            <View style={styles.tabsRow}>
              <TabButton
                label="Disponibles"
                count={available.length}
                active={tab === 'available'}
                onPress={() => setTab('available')}
                color={colors.primary}
              />
              <TabButton
                label="En cours"
                count={active.length}
                active={tab === 'active'}
                onPress={() => setTab('active')}
                color={colors.info}
              />
              <TabButton
                label="Historique"
                count={history.length}
                active={tab === 'history'}
                onPress={() => setTab('history')}
                color={colors.textMuted}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'available' ? 'inbox' : tab === 'active' ? 'navigation' : 'archive'}
            title={
              tab === 'available'
                ? 'Aucune livraison disponible'
                : tab === 'active'
                  ? 'Aucune livraison en cours'
                  : 'Aucun historique'
            }
            message={
              tab === 'available'
                ? driver.is_available
                  ? 'Les nouvelles demandes apparaîtront ici. Tirez vers le bas pour rafraîchir.'
                  : 'Activez votre disponibilité pour recevoir des demandes de livraison.'
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <View>
            <DeliveryCard delivery={item} onPress={() => handleOpen(item.id)} />
            {tab === 'available' && (
              <View>
                {/* 💰 Note pour le livreur : c'est LUI qui fixe son prix */}
                <View style={styles.priceHintBanner}>
                  <Feather name="info" size={14} color={colors.primary} />
                  <Text style={styles.priceHintText}>
                    C'est TOI qui fixes ton prix à l'acceptation 💪
                  </Text>
                </View>
                <Button
                  label="Accepter et fixer mon prix"
                  onPress={() => handleAccept(item)}
                  style={{ marginBottom: spacing.md }}
                  icon={<Feather name="dollar-sign" size={18} color={colors.textInverse} />}
                />
              </View>
            )}
          </View>
        )}
      />

      {/* ============================================================ */}
      {/* 💰 MODAL : Le livreur fixe SON prix à l'acceptation          */}
      {/* ============================================================ */}
      <Modal
        visible={priceModal.visible}
        onRequestClose={closePriceModal}
        transparent
        animationType="fade"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.priceModalBackdrop} onPress={closePriceModal}>
            <Pressable
              style={styles.priceModalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.priceModalHandle} />
              <View style={styles.priceModalIconWrap}>
                <Feather name="dollar-sign" size={28} color={colors.surface} />
              </View>
              <Text style={styles.priceModalTitle}>Fixe TON prix 💪</Text>
              <Text style={styles.priceModalSubtitle}>
                C'est toi le livreur, c'est toi qui décides ton tarif ! Évalue
                la distance, le colis et propose ton prix.
              </Text>

              {priceModal.delivery && (
                <View style={styles.priceModalTripCard}>
                  <View style={styles.priceModalTripRow}>
                    <Feather name="map-pin" size={14} color={colors.primary} />
                    <Text style={styles.priceModalTripText} numberOfLines={1}>
                      {priceModal.delivery.pickup_city} → {priceModal.delivery.destination_city}
                    </Text>
                  </View>
                  <View style={styles.priceModalTripRow}>
                    <Feather name="navigation" size={14} color={colors.textMuted} />
                    <Text style={styles.priceModalTripText}>
                      {priceModal.delivery.distance_km} km · {priceModal.delivery.package_weight} kg
                    </Text>
                  </View>
                  <View style={styles.priceModalTripRow}>
                    <Feather name="tag" size={14} color={colors.textMuted} />
                    <Text style={styles.priceModalTripHint}>
                      Estimation vendeur : {formatFCFA(priceModal.delivery.price)}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.priceModalLabel}>Ton prix (FCFA)</Text>
              <View style={styles.priceModalInputWrap}>
                <TextInput
                  style={styles.priceModalInput}
                  value={priceModal.priceInput}
                  onChangeText={(v) =>
                    setPriceModal((m) => ({ ...m, priceInput: v.replace(/[^\d]/g, '') }))
                  }
                  placeholder="ex: 3000"
                  keyboardType="numeric"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmAcceptWithPrice}
                />
                <Text style={styles.priceModalCurrency}>FCFA</Text>
              </View>

              {/* 💡 Suggestions rapides */}
              <View style={styles.priceSuggestionsRow}>
                {[1000, 2000, 3000, 5000].map((sugg) => {
                  const active = priceModal.priceInput === String(sugg);
                  return (
                    <Pressable
                      key={sugg}
                      style={[styles.priceSuggestionChip, active && styles.priceSuggestionChipActive]}
                      onPress={() =>
                        setPriceModal((m) => ({ ...m, priceInput: String(sugg) }))
                      }
                    >
                      <Text
                        style={[
                          styles.priceSuggestionText,
                          active && styles.priceSuggestionTextActive,
                        ]}
                      >
                        {sugg.toLocaleString('fr-FR')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.priceModalActions}>
                <Button
                  label="Annuler"
                  variant="secondary"
                  onPress={closePriceModal}
                  disabled={priceModal.submitting}
                  style={{ flex: 1 }}
                />
                <Button
                  label={priceModal.submitting ? 'Envoi...' : 'Accepter à ce prix'}
                  onPress={confirmAcceptWithPrice}
                  loading={priceModal.submitting}
                  disabled={priceModal.submitting}
                  style={{ flex: 1.4 }}
                  icon={<Feather name="check" size={18} color={colors.textInverse} />}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 2.5 }]}
      onPress={onPress}
    >
      <Text style={[styles.tabLabel, active && { color, fontWeight: typography.weights.semibold }]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.tabCount, { backgroundColor: active ? color : colors.surfaceAlt }]}>
          <Text style={[styles.tabCountText, { color: active ? colors.textInverse : colors.text }]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  list: { padding: spacing.lg, paddingTop: 0 },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  profileMeta: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  availToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  availOn: { backgroundColor: '#E6F7EE', borderColor: colors.success },
  availOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  availTextOn: { color: colors.success },
  availTextOff: { color: colors.textMuted },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  // ─── Bannière d'info : "c'est toi qui fixes ton prix" ───
  priceHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '12',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  priceHintText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  // ─── Modal "Fixer mon prix" ───
  priceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  priceModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  priceModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  priceModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  priceModalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    textAlign: 'center',
  },
  priceModalSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  priceModalTripCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  priceModalTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceModalTripText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  priceModalTripHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  priceModalLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  priceModalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  priceModalInput: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  priceModalCurrency: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  priceSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  priceSuggestionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  priceSuggestionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priceSuggestionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  priceSuggestionTextActive: {
    color: colors.textInverse,
  },
  priceModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
