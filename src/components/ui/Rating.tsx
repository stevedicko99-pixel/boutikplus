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
}

export function Rating({
  value,
  size = 16,
  showValue = false,
  count,
  interactive = false,
  onRate,
}: RatingProps) {
  if (interactive) {
    return (
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => onRate?.(star)} hitSlop={6}>
            <MaterialCommunityIcons
              name={star <= Math.round(value) ? 'star' : 'star-outline'}
              size={size + 6}
              color={star <= Math.round(value) ? colors.warning : colors.border}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={star <= Math.round(value) ? colors.warning : colors.border}
        />
      ))}
      {showValue ? (
        <Text style={styles.value}>{value.toFixed(1)}</Text>
      ) : null}
      {count != null ? (
        <Text style={styles.count}>({count})</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
