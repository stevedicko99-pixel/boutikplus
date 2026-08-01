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
  color = colors.primary,
  bgColor = '#FFF0E0',
  style,
  size = 'sm',
}: BadgeProps) {
  const fontSize = size === 'sm' ? typography.sizes.caption : typography.sizes.small;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.label, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
  },
});
