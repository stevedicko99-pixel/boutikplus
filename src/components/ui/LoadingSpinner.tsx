import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';

interface LoadingSpinnerProps {
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingSpinner({ size = 28, label = 'Chargement en cours', style }: LoadingSpinnerProps) {
  const reducedMotion = useReducedMotion();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={[styles.container, style]}>
      <ActivityIndicator animating={!reducedMotion} size={size <= 28 ? 'small' : 'large'} color={colors.primaryDark} />
      {reducedMotion ? <View style={[styles.staticIndicator, { width: size, height: size }]} /> : null}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  staticIndicator: { borderRadius: 999, borderWidth: 3, borderColor: colors.border, borderTopColor: colors.primaryDark, position: 'absolute' },
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
});
