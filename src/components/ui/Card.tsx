import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive' | 'hero';

interface CardProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  variant?: CardVariant;
}

export function Card({ children, style, padded = true, variant = 'default', onPress, disabled, ...pressableProps }: CardProps) {
  const isInteractive = Boolean(onPress) || variant === 'interactive';
  const cardStyle = [styles.card, styles[variant], padded && styles.padded, style];

  if (!isInteractive) return <View style={cardStyle}>{children}</View>;

  return (
    <Pressable
      {...pressableProps}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || !onPress }}
      style={({ pressed }) => [
        cardStyle,
        pressed && onPress && styles.pressed,
        (disabled || !onPress) && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  default: { borderColor: colors.borderLight, ...shadows.subtle },
  elevated: { backgroundColor: colors.surfaceElevated, ...shadows.fani },
  outlined: { borderColor: colors.border, backgroundColor: colors.surface },
  interactive: { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated, ...shadows.subtle },
  hero: { backgroundColor: colors.surfaceElevated, borderRadius: radius.xl, borderColor: colors.borderLight, ...shadows.hero },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  focused: { borderColor: colors.focusRing, ...shadows.focus },
  disabled: { opacity: 0.55 },
});
