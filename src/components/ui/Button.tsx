import {
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';

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

export function Button({
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
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.textInverse,
  }[variant];
  const borderColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: colors.primary,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant];

  const padding = { sm: spacing.sm, md: spacing.md, lg: spacing.lg }[size];
  const fontSize = { sm: typography.sizes.small, md: typography.sizes.body, lg: typography.sizes.subtitle }[size];

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
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor, fontSize }]}>
            {label}
          </Text>
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
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
  },
  fullWidth: { width: '100%' },
  label: {
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
  },
});
