// Badge — pastille douce « Fil de Faso ».
// Palette teintée corail par défaut, coins pincés légers, letter-spacing wide
// pour un rendu label premium. Composant générique ; pour les tags "tamponnés"
// forte signature, utiliser StampBadge à la place.
import { StyleSheet, View, Text, type ViewStyle, type StyleProp } from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color = colors.primaryDeep,
  bgColor = colors.surfaceAlt,
  style,
  size = 'sm',
}: BadgeProps) {
  const fontSize = size === 'sm' ? typography.sizes.caption : typography.sizes.small;
  const padV = size === 'sm' ? 3 : spacing.xs;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor, paddingVertical: padV }, style]}>
      <Text style={[styles.label, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    // Coins pincés légers (echo des cartes Fani)
    borderTopLeftRadius: radius.sm + 2,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm + 2,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacings.wide,
  },
});
