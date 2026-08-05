// Button — CTA signature « Fil de Faso ».
// Coins pincés légers, letter-spacing tight, ombre teintée sur primary/secondary,
// accent primaryDeep pour ancrer le premium. Pressé → translateY + opacity (web)
// pour un feedback tactile doux (pas de rebord dur).
import { memo } from 'react';
import {
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Platform,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, typography, radius, spacing, shadows } from '@/theme';

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
}

function ButtonComponent({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bgColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];
  const textColor = {
    primary: colors.textInverse,
    secondary: colors.textInverse,
    outline: colors.primaryDeep,
    ghost: colors.primaryDeep,
    danger: colors.textInverse,
  }[variant];
  const borderColor = {
    primary: 'transparent',
    secondary: 'transparent',
    outline: colors.primary,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  const padding = { sm: spacing.sm, md: spacing.md, lg: spacing.lg }[size];
  const fontSize = { sm: typography.sizes.small, md: typography.sizes.body, lg: typography.sizes.subtitle }[size];

  // Ombre teintée seulement sur variantes pleines (évoque la carte Fani)
  const withShadow = variant === 'primary' || variant === 'secondary' || variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgColor,
          borderColor,
          paddingVertical: padding,
          opacity: isDisabled ? 0.5 : 1,
        },
        withShadow && !isDisabled && styles.shadowed,
        fullWidth && styles.fullWidth,
        Platform.OS === 'web' && pressed && !isDisabled && styles.pressedWeb,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    // Coins pincés légers
    borderTopLeftRadius: radius.md + 4,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md + 4,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
  },
  shadowed: {
    ...shadows.fani,
  },
  pressedWeb: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  fullWidth: { width: '100%' },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacings.tight,
  },
});

export const Button = memo(ButtonComponent);
