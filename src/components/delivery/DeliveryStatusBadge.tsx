import { StyleSheet, View, Text } from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';
import { getDeliveryStatusInfo } from '@/lib/deliveryStatus';
import type { DeliveryStatus } from '@/types/models';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  size?: 'sm' | 'md';
}

/** Badge de statut de livraison — clone du pattern OrderStatusBadge */
export function DeliveryStatusBadge({ status, size = 'sm' }: DeliveryStatusBadgeProps) {
  const info = getDeliveryStatusInfo(status);
  const fontSize = size === 'sm' ? typography.sizes.caption : typography.sizes.small;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: info.bgColor },
        size === 'md' && styles.md,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.label, { color: info.color, fontSize }]}>
        {info.shortLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  md: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
  },
});
