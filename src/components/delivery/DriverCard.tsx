import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { getVehicle } from '@/constants/delivery';
import { formatFCFA, canDriverHandle } from '@/lib/deliveryService';
import type { DriverProfile } from '@/types/models';

interface DriverCardProps {
  driver: DriverProfile;
  packageWeight?: number;
  pickupCity?: string;
  distanceKm?: number;
  selected?: boolean;
  onPress?: () => void;
  showEstimate?: boolean;
}

/** Carte d'affichage d'un livreur dans la liste de recherche */
export function DriverCard({
  driver,
  packageWeight,
  pickupCity,
  distanceKm,
  selected = false,
  onPress,
  showEstimate = true,
}: DriverCardProps) {
  const vehicle = getVehicle(driver.vehicle_type);
  const capability =
    packageWeight != null
      ? canDriverHandle(driver, packageWeight, pickupCity)
      : { ok: true };
  const estimate =
    distanceKm != null
      ? formatFCFA(
          Math.max(
            driver.base_rate,
            driver.base_rate + driver.per_km_rate * Math.max(0, distanceKm),
          ),
        )
      : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!capability.ok}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        !capability.ok && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: vehicle.color + '20' }]}>
          <Feather name={vehicle.icon as any} size={22} color={vehicle.color} />
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {driver.profile?.full_name ?? 'Livreur'}
            </Text>
            {driver.is_available ? (
              <View style={styles.availableBadge}>
                <View style={styles.availableDot} />
                <Text style={styles.availableText}>Disponible</Text>
              </View>
            ) : (
              <Text style={styles.unavailableText}>Indisponible</Text>
            )}
          </View>
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{driver.city}</Text>
            <Feather
              name={vehicle.icon as any}
              size={12}
              color={vehicle.color}
              style={styles.metaIcon}
            />
            <Text style={[styles.metaText, { color: vehicle.color }]}>
              {vehicle.label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="star" size={13} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{driver.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>note</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="package" size={13} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{driver.total_deliveries}</Text>
          <Text style={styles.statLabel}>livraisons</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="trending-up" size={13} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{driver.max_weight}kg</Text>
          <Text style={styles.statLabel}>max</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>Tarif de base</Text>
          <Text style={styles.priceValue}>{formatFCFA(driver.base_rate)}</Text>
          <Text style={styles.priceSub}>
            + {formatFCFA(driver.per_km_rate)}/km
          </Text>
        </View>
        {showEstimate && estimate && capability.ok && (
          <View style={styles.estimateCol}>
            <Text style={styles.estimateLabel}>Estimé</Text>
            <Text style={styles.estimateValue}>{estimate}</Text>
          </View>
        )}
      </View>

      {!capability.ok && capability.reason ? (
        <View style={styles.warningRow}>
          <Feather name="alert-triangle" size={13} color={colors.warning} />
          <Text style={styles.warningText}>{capability.reason}</Text>
        </View>
      ) : null}

      {selected && (
        <View style={styles.selectedIndicator}>
          <Feather name="check-circle" size={20} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFF8F2',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    flex: 1,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7EE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  availableText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  unavailableText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { marginLeft: spacing.sm },
  metaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceCol: { flex: 1 },
  priceLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  priceSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  estimateCol: {
    alignItems: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  estimateLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textInverse,
    opacity: 0.85,
  },
  estimateValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  warningText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.warning,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
});
