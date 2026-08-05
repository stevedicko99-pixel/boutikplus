import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

export type TrustBadgeType = 'verified' | 'fast_delivery' | 'secure_payment' | 'top_rated' | 'local_business' | 'new';

interface TrustBadgeProps {
  type: TrustBadgeType;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<TrustBadgeType, { label: string; icon: string; color: string; bg: string }> = {
  verified: {
    label: 'Boutique vérifiée',
    icon: 'shield-check',
    color: '#0066B3',
    bg: 'rgba(0, 102, 179, 0.1)',
  },
  fast_delivery: {
    label: 'Livraison rapide',
    icon: 'truck',
    color: '#FF6B00',
    bg: 'rgba(255, 107, 0, 0.1)',
  },
  secure_payment: {
    label: 'Paiement sécurisé',
    icon: 'lock',
    color: '#00A859',
    bg: 'rgba(0, 168, 89, 0.1)',
  },
  top_rated: {
    label: 'Top vendeur',
    icon: 'award',
    color: '#6B2D8E',
    bg: 'rgba(107, 45, 142, 0.1)',
  },
  local_business: {
    label: 'Entreprise locale',
    icon: 'map-pin',
    color: '#E66A3A',
    bg: 'rgba(230, 106, 58, 0.1)',
  },
  new: {
    label: 'Nouveau',
    icon: 'sparkles',
    color: '#FF8A5C',
    bg: 'rgba(255, 138, 92, 0.15)',
  },
};

export function TrustBadge({ type, size = 'md' }: TrustBadgeProps) {
  const config = BADGE_CONFIG[type];
  const isSm = size === 'sm';
  const badgeSize = isSm ? 20 : 24;
  const iconSize = isSm ? 12 : 14;
  const padH = isSm ? spacing.xs : spacing.sm;
  const padV = isSm ? 2 : spacing.xs;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: padH,
          paddingVertical: padV,
          borderRadius: radius.md,
        },
      ]}
    >
      <View style={{ width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: config.color + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={config.icon as any} size={iconSize} color={config.color} />
      </View>
      <Text
        style={[
          styles.label,
          {
            color: config.color,
            fontSize: isSm ? typography.sizes.caption : typography.sizes.small,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

interface TrustBadgeRowProps {
  badges: TrustBadgeType[];
  size?: 'sm' | 'md';
}

export function TrustBadgeRow({ badges, size = 'sm' }: TrustBadgeRowProps) {
  return (
    <View style={styles.row}>
      {badges.map((b) => (
        <TrustBadge key={b} type={b} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
