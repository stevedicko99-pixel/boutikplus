import { StyleSheet, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/theme';

interface RatingProps {
  value: number;
  size?: number;
  showValue?: boolean;
  count?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  inverse?: boolean;
  accessibilityLabel?: string;
}

export function Rating({
  value,
  size = 16,
  showValue = false,
  count,
  interactive = false,
  onRate,
  inverse = false,
  accessibilityLabel,
}: RatingProps) {
  const roundedValue = Math.round(value);
  const label = accessibilityLabel ?? `${value.toFixed(1)} étoiles sur 5${count != null ? `, ${count} avis` : ''}`;
  if (interactive) {
    return (
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onRate?.(star)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityLabel={`${star} étoile${star > 1 ? 's' : ''}`}
            accessibilityState={{ selected: star === roundedValue }}
            style={styles.starControl}
          >
            <MaterialCommunityIcons
              name={star <= roundedValue ? 'star' : 'star-outline'}
              size={size + 6}
              color={star <= roundedValue ? colors.warning : colors.border}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label} style={styles.row}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.row}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= roundedValue ? 'star' : 'star-outline'}
            size={size}
            color={star <= roundedValue ? colors.warning : inverse ? 'rgba(255,255,255,0.55)' : colors.border}
          />
        ))}
        {showValue ? <Text style={[styles.value, inverse && styles.inverse]}>{value.toFixed(1)}</Text> : null}
        {count != null ? <Text style={[styles.count, inverse && styles.inverse]}>({count})</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  starControl: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  inverse: { color: colors.textInverse },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  count: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
