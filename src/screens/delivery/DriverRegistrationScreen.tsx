import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { friendlyMessage } from '@/lib/errorMessages';
import { useAuth } from '@/context/AuthContext';
import {
  createDriverProfile,
  updateDriverProfile,
  getDriverByUser,
} from '@/lib/deliveryService';
import {
  VEHICLE_LIST,
  CITY_LIST,
  getVehicle,
} from '@/constants/delivery';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { VehicleType } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface DriverRegistrationScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    replace: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export function DriverRegistrationScreen({ navigation }: DriverRegistrationScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [existingDriverId, setExistingDriverId] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleType: 'moto' as VehicleType,
    city: profile?.city ?? 'Ouagadougou',
    baseRate: '500',
    perKmRate: '150',
    maxWeight: '20',
    orangeMoneyNumber: profile?.phone?.replace(/\s/g, '') ?? '',
    moovMoneyNumber: '',
    licenseNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Vérifier si l'utilisateur est déjà livreur
  useEffect(() => {
    getDriverByUser(profile?.id ?? 'demo-seller').then((d) => {
      if (d) {
        setExistingDriverId(d.id);
        setForm({
          vehicleType: d.vehicle_type,
          city: d.city,
          baseRate: d.base_rate.toString(),
          perKmRate: d.per_km_rate.toString(),
          maxWeight: d.max_weight.toString(),
          orangeMoneyNumber: d.orange_money_number ?? '',
          moovMoneyNumber: d.moov_money_number ?? '',
          licenseNumber: d.license_number ?? '',
        });
      }
    });
  }, [profile?.id]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.city.trim()) e.city = 'Ville requise';
    const baseRate = parseInt(form.baseRate, 10);
    if (isNaN(baseRate) || baseRate < 0) e.baseRate = 'Tarif invalide';
    const perKmRate = parseInt(form.perKmRate, 10);
    if (isNaN(perKmRate) || perKmRate < 0) e.perKmRate = 'Tarif invalide';
    const maxWeight = parseInt(form.maxWeight, 10);
    if (isNaN(maxWeight) || maxWeight <= 0) e.maxWeight = 'Poids invalide';
    if (!form.orangeMoneyNumber.trim() && !form.moovMoneyNumber.trim()) {
      e.mobileMoney = 'Au moins un numéro Mobile Money est requis';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!profile?.id) {
      showAlert('Erreur', 'Vous devez être connecté');
      return;
    }
    if (!validate()) {
      showAlert('Vérifiez le formulaire', 'Certains champs sont invalides.');
      return;
    }
    setSubmitting(true);
    const params = {
      userId: profile.id,
      vehicleType: form.vehicleType,
      city: form.city,
      baseRate: parseInt(form.baseRate, 10),
      perKmRate: parseInt(form.perKmRate, 10),
      maxWeight: parseInt(form.maxWeight, 10),
      orangeMoneyNumber: form.orangeMoneyNumber.trim() || null,
      moovMoneyNumber: form.moovMoneyNumber.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
    };
    let error: string | null = null;
    if (existingDriverId) {
      ({ error } = await updateDriverProfile(existingDriverId, {
        vehicle_type: params.vehicleType,
        city: params.city,
        base_rate: params.baseRate,
        per_km_rate: params.perKmRate,
        max_weight: params.maxWeight,
        orange_money_number: params.orangeMoneyNumber,
        moov_money_number: params.moovMoneyNumber,
        license_number: params.licenseNumber,
      }));
    } else {
      const result = await createDriverProfile(params);
      error = result.error;
    }
    setSubmitting(false);
    if (error) {
      showAlert('Erreur', friendlyMessage(error));
      return;
    }
    await refreshProfile();
    showAlert(
      existingDriverId ? 'Profil mis à jour ✓' : 'Inscription réussie 🎉',
      existingDriverId
        ? 'Votre profil livreur a été mis à jour.'
        : 'Vous êtes maintenant inscrit comme livreur. Vous pouvez accepter des demandes de livraison !',
      [{ text: 'Voir mon tableau de bord', onPress: () => navigation.replace('DriverDashboard') }],
    );
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
          <Text style={styles.title}>
            {existingDriverId ? 'Modifier mon profil' : 'Devenir livreur'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Bannière d'intro */}
          {!existingDriverId && (
            <View style={styles.introCard}>
              <Feather name="navigation" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>Rejoignez les livreurs Boutikplus</Text>
                <Text style={styles.introText}>
                  Gagnez de l'argent en livrant les commandes des vendeurs près de chez vous. Choisissez vos horaires et vos courses.
                </Text>
              </View>
            </View>
          )}

          {/* Type de véhicule */}
          <Card>
            <Text style={styles.fieldLabel}>Votre véhicule</Text>
            <View style={styles.vehicleGrid}>
              {VEHICLE_LIST.map((v) => {
                const active = form.vehicleType === v.id;
                return (
                  <Pressable
                    key={v.id}
                    style={[
                      styles.vehicleCard,
                      active && { borderColor: v.color, backgroundColor: v.color + '15' },
                    ]}
                    onPress={() => setForm({ ...form, vehicleType: v.id, maxWeight: v.maxWeightKg.toString() })}
                  >
                    <View style={[styles.vehicleIcon, { backgroundColor: v.color + '20' }]}>
                      <Feather name={v.icon as any} size={20} color={v.color} />
                    </View>
                    <Text style={[styles.vehicleLabel, active && { color: v.color, fontWeight: typography.weights.semibold }]}>
                      {v.label}
                    </Text>
                    <Text style={styles.vehicleDetail}>≤ {v.maxWeightKg} kg</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.suggestionRow}>
              <Feather name="info" size={13} color={colors.info} />
              <Text style={styles.suggestionText}>
                Tarifs suggérés : {getVehicle(form.vehicleType).defaultBaseRate} FCFA de base +{' '}
                {getVehicle(form.vehicleType).defaultPerKmRate} FCFA/km
              </Text>
            </View>
          </Card>

          {/* Ville d'opération */}
          <Card>
            <Text style={styles.fieldLabel}>Ville d'opération</Text>
            <View style={styles.cityGrid}>
              {CITY_LIST.slice(0, 6).map((c) => {
                const active = form.city === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.cityChip, active && styles.cityChipActive]}
                    onPress={() => setForm({ ...form, city: c })}
                  >
                    <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </Card>

          {/* Tarifs */}
          <Card>
            <Text style={styles.fieldLabel}>Vos tarifs (FCFA)</Text>
            <View style={styles.tariffRow}>
              <View style={styles.tariffItem}>
                <Input
                  label="Tarif de base"
                  value={form.baseRate}
                  onChangeText={(v) => setForm({ ...form, baseRate: v })}
                  keyboardType="numeric"
                  icon="tag"
                  error={errors.baseRate}
                />
              </View>
              <View style={styles.tariffItem}>
                <Input
                  label="Par km"
                  value={form.perKmRate}
                  onChangeText={(v) => setForm({ ...form, perKmRate: v })}
                  keyboardType="numeric"
                  icon="map"
                  error={errors.perKmRate}
                />
              </View>
            </View>
            <Input
              label="Poids maximum (kg)"
              value={form.maxWeight}
              onChangeText={(v) => setForm({ ...form, maxWeight: v })}
              keyboardType="numeric"
              icon="package"
              error={errors.maxWeight}
            />
          </Card>

          {/* Mobile Money */}
          <Card>
            <Text style={styles.fieldLabel}>Numéros Mobile Money</Text>
            <Text style={styles.fieldHint}>
              Au moins un numéro est requis pour recevoir vos paiements.
            </Text>
            <Input
              label="Orange Money"
              value={form.orangeMoneyNumber}
              onChangeText={(v) => setForm({ ...form, orangeMoneyNumber: v })}
              placeholder="Ex: 70123456"
              keyboardType="phone-pad"
              icon="phone"
            />
            <Input
              label="Moov Money"
              value={form.moovMoneyNumber}
              onChangeText={(v) => setForm({ ...form, moovMoneyNumber: v })}
              placeholder="Ex: 61987654"
              keyboardType="phone-pad"
              icon="phone"
            />
            {errors.mobileMoney ? <Text style={styles.errorText}>{errors.mobileMoney}</Text> : null}
          </Card>

          {/* Permis (optionnel) */}
          <Card>
            <Input
              label="Numéro de permis (optionnel)"
              value={form.licenseNumber}
              onChangeText={(v) => setForm({ ...form, licenseNumber: v })}
              placeholder="Ex: A12345"
              icon="credit-card"
            />
          </Card>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={submitting ? 'Enregistrement...' : existingDriverId ? 'Mettre à jour' : "S'inscrire comme livreur"}
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
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF0E0',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  introTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  introText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  vehicleCard: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  vehicleLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  vehicleDetail: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  suggestionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.info,
    flex: 1,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  tariffRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  tariffItem: { flex: 1, paddingHorizontal: spacing.xs },
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
