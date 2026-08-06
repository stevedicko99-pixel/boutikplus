import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const variantColors = {
  primary: { background: colors.primaryDark, text: colors.textInverse, border: colors.primaryDark },
  secondary: { background: colors.secondaryDeep, text: colors.textInverse, border: colors.secondaryDeep },
  outline: { background: 'transparent', text: colors.primaryDeep, border: colors.primaryDark },
  ghost: { background: 'transparent', text: colors.primaryDeep, border: 'transparent' },
  danger: { background: colors.danger, text: colors.textInverse, border: colors.danger },
} as const;

function ButtonComponent({ label, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, icon, style, fullWidth = false, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantColors[variant];
  const fontSize = { sm: typography.sizes.small, md: typography.sizes.body, lg: typography.sizes.subtitle }[size];
  const horizontalPadding = { sm: spacing.md, md: spacing.lg, lg: spacing.xxl }[size];
  const solid = variant === 'primary' || variant === 'secondary' || variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border, paddingHorizontal: horizontalPadding },
        solid && !isDisabled && styles.shadowed,
        size === 'lg' && styles.large,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.text} size="small" /> : <>{icon}<Text style={[styles.label, { color: palette.text, fontSize }]}>{label}</Text></>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, minHeight: layout.minTouchTarget, paddingVertical: spacing.sm },
  large: { minHeight: 52 },
  shadowed: { ...shadows.subtle },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }] },
  focused: { borderColor: colors.focusRing, ...shadows.focus },
  disabled: { opacity: 0.48 },
  fullWidth: { width: '100%' },
  label: { fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold, letterSpacing: typography.letterSpacings.normal, lineHeight: typography.lineHeightPx.body },
});

export const Button = memo(ButtonComponent);
