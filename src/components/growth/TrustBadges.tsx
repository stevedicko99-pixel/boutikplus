import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import type { Review } from '@/types/models';

export interface TrustBadge {
  id: string;
  type: 'verified' | 'fast_delivery' | 'top_seller' | 'excellent_reviews' | 'secure_payment';
  label: string;
  icon: string;
  color: string;
}

/** Calcule les badges de confiance pour une boutique */
export function calculateTrustBadges(params: {
  isVerified: boolean;
  averageRating: number;
  totalReviews: number;
  deliveryDays: number;
  totalOrders: number;
  cancellationRate: number;
}): TrustBadge[] {
  const badges: TrustBadge[] = [];

  if (params.isVerified) {
    badges.push({
      id: 'verified',
      type: 'verified',
      label: 'Vendeur vérifié',
      icon: 'shield',
      color: colors.primary,
    });
  }

  if (params.deliveryDays <= 3) {
    badges.push({
      id: 'fast_delivery',
      type: 'fast_delivery',
      label: 'Livraison rapide',
      icon: 'truck',
      color: colors.info,
    });
  }

  if (params.totalOrders >= 50 && params.cancellationRate < 0.05) {
    badges.push({
      id: 'top_seller',
      type: 'top_seller',
      label: 'Top vendeur',
      icon: 'award',
      color: colors.warning,
    });
  }

  if (params.averageRating >= 4.5 && params.totalReviews >= 10) {
    badges.push({
      id: 'excellent_reviews',
      type: 'excellent_reviews',
      label: 'Excellent avis',
      icon: 'star',
      color: colors.success,
    });
  }

  badges.push({
    id: 'secure_payment',
    type: 'secure_payment',
    label: 'Paiement sécurisé',
    icon: 'lock',
    color: colors.secondary,
  });

  return badges;
}

interface TrustBadgesProps {
  badges: TrustBadge[];
  size?: 'sm' | 'md';
  vertical?: boolean;
}

export function TrustBadges({ badges, size = 'sm', vertical = false }: TrustBadgesProps) {
  const iconSize = size === 'sm' ? 12 : 16;
  const fontSize = size === 'sm' ? typography.sizes.caption : typography.sizes.small;

  return (
    <View style={[styles.container, vertical && styles.vertical]}>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[
            styles.badge,
            {
              backgroundColor: badge.color + '18',
              borderColor: badge.color + '30',
            },
          ]}
        >
          <Feather name={badge.icon as any} size={iconSize} color={badge.color} />
          <Text style={[styles.badgeText, { color: badge.color, fontSize }]}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  vertical: {
    flexDirection: 'column',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
  },
});
