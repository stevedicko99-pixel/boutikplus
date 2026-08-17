import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'glow' | 'accent';
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
  gradient: { background: 'transparent', text: colors.textInverse, border: 'transparent' },
  glow: { background: 'transparent', text: colors.textInverse, border: 'transparent' },
  accent: { background: colors.accent, text: colors.textInverse, border: colors.accent },
} as const;

const gradientVariants = ['gradient', 'glow'] as const;

function ButtonComponent({ label, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, icon, style, fullWidth = false, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantColors[variant];
  const fontSize = { sm: typography.sizes.small, md: typography.sizes.body, lg: typography.sizes.subtitle }[size];
  const horizontalPadding = { sm: spacing.md, md: spacing.lg, lg: spacing.xxl }[size];
  const solid = variant === 'primary' || variant === 'secondary' || variant === 'danger' || variant === 'accent';
  const isGradient = (gradientVariants as readonly string[]).includes(variant);
  const tint = palette.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed: p }) => [
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border, paddingHorizontal: horizontalPadding },
        solid && !isDisabled && styles.shadowed,
        variant === 'glow' && !isDisabled && styles.glow,
        size === 'lg' && styles.large,
        fullWidth && styles.fullWidth,
        p && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isGradient && !isDisabled ? (
        <LinearGradient
          colors={variant === 'glow' ? colors.brandGradient : colors.brandGradientDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={tint} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: tint, fontSize }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, minHeight: layout.minTouchTarget, paddingVertical: spacing.sm },
  large: { minHeight: 52 },
  shadowed: { ...shadows.subtle },
  glow: { ...shadows.fani, shadowOpacity: 0.28 },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }] },
  focused: { borderColor: colors.focusRing, ...shadows.focus },
  disabled: { opacity: 0.48 },
  fullWidth: { width: '100%' },
  gradientFill: { borderRadius: radius.md },
  label: { fontFamily: typography.fontFamily, fontWeight: typography.weights.semibold, letterSpacing: typography.letterSpacings.normal, lineHeight: typography.lineHeightPx.body },
});

// Export explicite pour préserver la signature de Button (compatibilité)
export interface ButtonType extends ButtonProps {}
export const Button = Object.assign(memo(ButtonComponent), {});

