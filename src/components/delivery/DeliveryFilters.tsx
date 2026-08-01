import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import {
  VEHICLE_LIST,
  CITY_LIST,
  type VehicleDef,
} from '@/constants/delivery';
import type { VehicleType } from '@/types/models';

export interface DeliveryFilterState {
  city: string | null;
  vehicleType: VehicleType | null;
  availableOnly: boolean;
  minRating: number;
  sortBy: 'rating' | 'deliveries' | 'price_asc' | 'price_desc';
}

interface DeliveryFiltersProps {
  filters: DeliveryFilterState;
  onChange: (filters: DeliveryFilterState) => void;
  onReset?: () => void;
}

/** Panneau de filtres pour la recherche de livreurs */
export function DeliveryFilters({ filters, onChange, onReset }: DeliveryFiltersProps) {
  const sortOptions: { id: DeliveryFilterState['sortBy']; label: string; icon: string }[] = [
    { id: 'rating', label: 'Mieux notés', icon: 'star' },
    { id: 'deliveries', label: 'Plus actifs', icon: 'package' },
    { id: 'price_asc', label: 'Moins chers', icon: 'trending-down' },
    { id: 'price_desc', label: 'Premium', icon: 'trending-up' },
  ];

  return (
    <View style={styles.container}>
      {/* Disponibilité */}
      <View style={styles.section}>
        <Pressable
          style={[
            styles.toggleChip,
            filters.availableOnly && styles.chipActive,
          ]}
          onPress={() => onChange({ ...filters, availableOnly: !filters.availableOnly })}
        >
          <Feather
            name={filters.availableOnly ? 'check-circle' : 'circle'}
            size={16}
            color={filters.availableOnly ? colors.textInverse : colors.primary}
          />
          <Text
            style={[
              styles.chipLabel,
              filters.availableOnly && styles.chipLabelActive,
            ]}
          >
            Disponibles maintenant
          </Text>
        </Pressable>
      </View>

      {/* Type de véhicule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type de véhicule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              style={[
                styles.chip,
                !filters.vehicleType && styles.chipActive,
              ]}
              onPress={() => onChange({ ...filters, vehicleType: null })}
            >
              <Text style={[styles.chipLabel, !filters.vehicleType && styles.chipLabelActive]}>
                Tous
              </Text>
            </Pressable>
            {VEHICLE_LIST.map((v: VehicleDef) => {
              const active = filters.vehicleType === v.id;
              return (
                <Pressable
                  key={v.id}
                  style={[styles.chip, active && { borderColor: v.color, backgroundColor: v.color + '15' }]}
                  onPress={() => onChange({ ...filters, vehicleType: active ? null : v.id })}
                >
                  <Feather name={v.icon as any} size={14} color={active ? v.color : colors.textMuted} />
                  <Text style={[styles.chipLabel, active && { color: v.color, fontWeight: typography.weights.semibold }]}>
                    {v.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Ville */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ville</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, !filters.city && styles.chipActive]}
              onPress={() => onChange({ ...filters, city: null })}
            >
              <Text style={[styles.chipLabel, !filters.city && styles.chipLabelActive]}>
                Toutes les villes
              </Text>
            </Pressable>
            {CITY_LIST.map((city) => {
              const active = filters.city === city;
              return (
                <Pressable
                  key={city}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onChange({ ...filters, city: active ? null : city })}
                >
                  <Feather name="map-pin" size={13} color={active ? colors.textInverse : colors.textMuted} />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {city}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Note minimum */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Note minimum</Text>
        <View style={styles.chipRow}>
          {[0, 4, 4.5, 4.8].map((r) => {
            const active = filters.minRating === r;
            return (
              <Pressable
                key={r}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange({ ...filters, minRating: r })}
              >
                <Feather name="star" size={13} color={active ? colors.textInverse : colors.warning} />
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {r === 0 ? 'Toutes' : `${r}+`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trier par</Text>
        <View style={styles.chipRow}>
          {sortOptions.map((opt) => {
            const active = filters.sortBy === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange({ ...filters, sortBy: opt.id })}
              >
                <Feather name={opt.icon as any} size={13} color={active ? colors.textInverse : colors.textMuted} />
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {onReset && (
        <Pressable style={styles.resetBtn} onPress={onReset}>
          <Feather name="rotate-ccw" size={14} color={colors.textMuted} />
          <Text style={styles.resetText}>Réinitialiser les filtres</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  chipLabelActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  resetText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
});
