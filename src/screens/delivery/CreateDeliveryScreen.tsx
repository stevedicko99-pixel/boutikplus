import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  createDeliveryRequest,
  getDriverById,
  estimateDeliveryPrice,
  canDriverHandle,
  formatFCFA,
} from '@/lib/deliveryService';
import { estimateDistanceKm, CITY_LIST, TIME_SLOTS, PACKAGE_SIZE_BUCKETS, getVehicle, type PackageSizeBucket } from '@/constants/delivery';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PackageSizePicker, FeeEstimate } from '@/components/delivery';
import type { DriverProfile, VehicleType } from '@/types/models';

interface CreateDeliveryScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params?: {
      driverId?: string;
      packageWeight?: number;
      pickupCity?: string;
    };
  };
}

export function CreateDeliveryScreen({ navigation, route }: CreateDeliveryScreenProps) {
  const { profile } = useAuth();
  const { refresh: refreshNotifs } = useNotifications();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    pickupAddress: '',
    pickupCity: route.params?.pickupCity ?? profile?.city ?? 'Ouagadougou',
    destinationAddress: '',
    destinationCity: 'Ouagadougou',
    packageWeight: route.params?.packageWeight?.toString() ?? '2',
    packageLength: '20',
    packageWidth: '15',
    packageHeight: '10',
    preferredDate: today,
    preferredTime: TIME_SLOTS[0],
    description: '',
  });
  const [sizeBucket, setSizeBucket] = useState<PackageSizeBucket['id'] | null>('small');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger le livreur pré-sélectionné
  const loadDriver = useCallback(async () => {
    if (!route.params?.driverId) return;
    const d = await getDriverById(route.params.driverId);
    setDriver(d);
  }, [route.params?.driverId]);

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  // Quand on choisit une taille prédéfinie, on pré-remplit les dimensions
  const applySizeBucket = (bucket: PackageSizeBucket) => {
    setSizeBucket(bucket.id);
    setForm((f) => ({
      ...f,
      packageWeight: bucket.weightKg.toString(),
      packageLength: bucket.lengthCm.toString(),
      packageWidth: bucket.widthCm.toString(),
      packageHeight: bucket.heightCm.toString(),
    }));
  };

  const distanceKm = estimateDistanceKm(form.pickupCity, form.destinationCity);
  const weight = parseFloat(form.packageWeight) || 0;
  const length = parseFloat(form.packageLength) || 0;
  const width = parseFloat(form.packageWidth) || 0;
  const height = parseFloat(form.packageHeight) || 0;

  const price = driver
    ? estimateDeliveryPrice(driver, distanceKm)
    : Math.max(500, 500 + 150 * distanceKm);

  const canDriverTakePackage = driver
    ? canDriverHandle(driver, weight, form.pickupCity)
    : { ok: true };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.pickupAddress.trim()) e.pickupAddress = 'Adresse de prise en charge requise';
    if (!form.pickupCity.trim()) e.pickupCity = 'Ville de prise en charge requise';
    if (!form.destinationAddress.trim()) e.destinationAddress = 'Adresse de destination requise';
    if (!form.destinationCity.trim()) e.destinationCity = 'Ville de destination requise';
    if (weight <= 0) e.packageWeight = 'Le poids doit être positif';
    if (weight > 1500) e.packageWeight = 'Poids max 1500 kg';
    if (length <= 0 || width <= 0 || height <= 0) e.dimensions = 'Dimensions invalides';
    if (!form.preferredDate) e.preferredDate = 'Date requise';
    if (!form.preferredTime) e.preferredTime = 'Créneau requis';
    if (!canDriverTakePackage.ok && driver) e.driver = canDriverTakePackage.reason ?? 'Livreur incompatible';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!profile?.id) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }
    if (!validate()) {
      Alert.alert('Vérifiez le formulaire', 'Certains champs sont invalides.');
      return;
    }
    setSubmitting(true);
    const { deliveryId, error } = await createDeliveryRequest({
      sellerId: profile.id,
      pickupAddress: form.pickupAddress.trim(),
      pickupCity: form.pickupCity,
      destinationAddress: form.destinationAddress.trim(),
      destinationCity: form.destinationCity,
      packageWeight: weight,
      packageLength: length,
      packageWidth: width,
      packageHeight: height,
      preferredDate: form.preferredDate,
      preferredTime: form.preferredTime,
      description: form.description.trim() || null,
      price,
      distanceKm,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Erreur', error);
      return;
    }
    await refreshNotifs();
    Alert.alert(
      'Demande envoyée 🎉',
      driver
        ? `Votre demande a été envoyée. Le livreur ${driver.profile?.full_name} recevra une notification.`
        : 'Votre demande a été publiée. Les livreurs disponibles seront notifiés.',
      [{ text: 'Suivre la livraison', onPress: () => navigation.navigate('DeliveryTracking', { deliveryId }) }],
    );
  };

  const openDriverSearch = () => {
    navigation.navigate('DriverSearch', {
      packageWeight: weight,
      pickupCity: form.pickupCity,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Nouvelle livraison</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Étape 1 : Livreur */}
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepTitle}>Choisir un livreur</Text>
          </View>
          {driver ? (
            <Card style={styles.driverCard}>
              <View style={styles.driverRow}>
                <View style={[styles.driverAvatar, { backgroundColor: getVehicle(driver.vehicle_type).color + '20' }]}>
                  <Feather name={getVehicle(driver.vehicle_type).icon as any} size={20} color={getVehicle(driver.vehicle_type).color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.profile?.full_name}</Text>
                  <Text style={styles.driverMeta}>
                    {getVehicle(driver.vehicle_type).label} · {driver.city} · ★ {driver.rating.toFixed(1)}
                  </Text>
                </View>
                <Pressable onPress={openDriverSearch}>
                  <Text style={styles.changeLink}>Changer</Text>
                </Pressable>
              </View>
              {errors.driver ? (
                <Text style={styles.errorText}>{errors.driver}</Text>
              ) : null}
            </Card>
          ) : (
            <Pressable style={styles.driverPicker} onPress={openDriverSearch}>
              <Feather name="search" size={20} color={colors.primary} />
              <Text style={styles.driverPickerText}>Rechercher un livreur disponible</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Étape 2 : Itinéraire */}
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepTitle}>Itinéraire</Text>
          </View>
          <Card>
            <Text style={styles.fieldLabel}>Prise en charge</Text>
            <Input
              value={form.pickupAddress}
              onChangeText={(v) => setForm({ ...form, pickupAddress: v })}
              placeholder="Ex: Quartier Gounghin, près de la pharmacie"
              icon="map-pin"
              error={errors.pickupAddress}
            />
            <Text style={styles.fieldLabel}>Ville de prise en charge</Text>
            <CityPicker
              value={form.pickupCity}
              onChange={(city) => setForm({ ...form, pickupCity: city })}
            />
            <View style={styles.routeDivider} />
            <Text style={styles.fieldLabel}>Destination</Text>
            <Input
              value={form.destinationAddress}
              onChangeText={(v) => setForm({ ...form, destinationAddress: v })}
              placeholder="Ex: Quartier Wemtenga, rue 15.12"
              icon="map-pin"
              error={errors.destinationAddress}
            />
            <Text style={styles.fieldLabel}>Ville de destination</Text>
            <CityPicker
              value={form.destinationCity}
              onChange={(city) => setForm({ ...form, destinationCity: city })}
            />
            <View style={styles.distanceRow}>
              <Feather name="map" size={14} color={colors.primary} />
              <Text style={styles.distanceText}>
                Distance estimée : <Text style={styles.distanceBold}>{distanceKm} km</Text>
              </Text>
            </View>
          </Card>

          {/* Étape 3 : Colis */}
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepTitle}>Détails du colis</Text>
          </View>
          <Card>
            <Text style={styles.fieldLabel}>Taille du colis (raccourci)</Text>
            <PackageSizePicker selected={sizeBucket} onSelect={applySizeBucket} />
            <View style={styles.dimGrid}>
              <View style={styles.dimItem}>
                <Input
                  label="Poids (kg)"
                  value={form.packageWeight}
                  onChangeText={(v) => { setForm({ ...form, packageWeight: v }); setSizeBucket(null); }}
                  keyboardType="numeric"
                  icon="package"
                  error={errors.packageWeight}
                />
              </View>
              <View style={styles.dimItem}>
                <Input
                  label="Longueur (cm)"
                  value={form.packageLength}
                  onChangeText={(v) => { setForm({ ...form, packageLength: v }); setSizeBucket(null); }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.dimItem}>
                <Input
                  label="Largeur (cm)"
                  value={form.packageWidth}
                  onChangeText={(v) => { setForm({ ...form, packageWidth: v }); setSizeBucket(null); }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.dimItem}>
                <Input
                  label="Hauteur (cm)"
                  value={form.packageHeight}
                  onChangeText={(v) => { setForm({ ...form, packageHeight: v }); setSizeBucket(null); }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {errors.dimensions ? <Text style={styles.errorText}>{errors.dimensions}</Text> : null}
            <Input
              label="Description (optionnel)"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="Ex: Robe wax soigneusement emballée"
              multiline
              numberOfLines={2}
            />
          </Card>

          {/* Étape 4 : Date et heure */}
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
            <Text style={styles.stepTitle}>Date et heure</Text>
          </View>
          <Card>
            <Text style={styles.fieldLabel}>Date préférée</Text>
            <DateChips
              value={form.preferredDate}
              onChange={(date) => setForm({ ...form, preferredDate: date })}
            />
            <Text style={styles.fieldLabel}>Créneau horaire</Text>
            <View style={styles.slotRow}>
              {TIME_SLOTS.map((slot) => {
                const active = form.preferredTime === slot;
                return (
                  <Pressable
                    key={slot}
                    style={[styles.slot, active && styles.slotActive]}
                    onPress={() => setForm({ ...form, preferredTime: slot })}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Étape 5 : Estimation */}
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
            <Text style={styles.stepTitle}>Estimation</Text>
          </View>
          <FeeEstimate
            baseRate={driver?.base_rate ?? 500}
            perKmRate={driver?.per_km_rate ?? 150}
            distanceKm={distanceKm}
            total={price}
          />

          <View style={{ height: spacing.xl }} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={submitting ? 'Envoi...' : 'Confirmer la demande'}
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            icon={<Feather name="check" size={18} color={colors.textInverse} />}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Sous-composants UI ---

function CityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.cityGrid}>
      {CITY_LIST.slice(0, 6).map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            style={[styles.cityChip, active && styles.cityChipActive]}
            onPress={() => onChange(c)}
          >
            <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DateChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
    };
  });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
      <View style={styles.dateRow}>
        {dates.map((d) => {
          const active = value === d.iso;
          return (
            <Pressable
              key={d.iso}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => onChange(d.iso)}
            >
              <Text style={[styles.dateLabel, active && styles.dateLabelActive]}>
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
  scrollContent: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  stepTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  driverCard: { marginBottom: 0 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  driverMeta: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  changeLink: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  driverPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  driverPickerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  routeDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  distanceText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  distanceBold: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  dimGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  dimItem: {
    width: '50%',
    paddingHorizontal: spacing.xs,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cityChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cityChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  cityChipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  dateChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    textTransform: 'capitalize',
  },
  dateLabelActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  slotTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
