import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { formatFCFA } from '@/lib/deliveryService';
import { estimateDistanceKm } from '@/constants/delivery';
import type { DeliveryRequest } from '@/types/models';

interface DeliveryCardProps {
  delivery: DeliveryRequest;
  onPress?: () => void;
}

/** Carte de résumé d'une livraison pour les listes (vendeur ou livreur) */
export function DeliveryCard({ delivery, onPress }: DeliveryCardProps) {
  const isSameCity = delivery.pickup_city === delivery.destination_city;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <DeliveryStatusBadge status={delivery.status} size="md" />
        <Text style={styles.price}>{formatFCFA(delivery.price)}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, styles.dotStart]} />
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>De</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {delivery.pickup_address}
            </Text>
            <Text style={styles.routeCity}>{delivery.pickup_city}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.dot, styles.dotEnd]} />
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>Vers</Text>
            <Text style={styles.routeText} numberOfLines={1}>
              {delivery.destination_address}
            </Text>
            <Text style={styles.routeCity}>{delivery.destination_city}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.metaItem}>
          <Feather name="package" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{delivery.package_weight} kg</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="map" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {isSameCity
              ? 'Intra-ville'
              : `${delivery.distance_km || estimateDistanceKm(delivery.pickup_city, delivery.destination_city)} km`}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={13} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {formatDateShort(delivery.preferred_date)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={13} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {delivery.preferred_time}
          </Text>
        </View>
      </View>

      {delivery.driver?.profile?.full_name ? (
        <View style={styles.driverRow}>
          <Feather name="user" size={13} color={colors.primary} />
          <Text style={styles.driverName} numberOfLines={1}>
            {delivery.driver.profile.full_name}
          </Text>
        </View>
      ) : delivery.status === 'pending' ? (
        <View style={[styles.driverRow, { backgroundColor: '#FFF8E1' }]}>
          <Feather name="clock" size={13} color={colors.warning} />
          <Text style={[styles.driverName, { color: colors.warning }]}>
            En attente d'un livreur
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  price: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  route: {
    marginBottom: spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  dotStart: { backgroundColor: colors.primary },
  dotEnd: { backgroundColor: colors.success },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  routeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  routeCity: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  driverName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
});
