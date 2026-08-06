import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

type EmptyStateVariant = 'page' | 'section' | 'compact';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  hintLabel?: string;
  hintColor?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: EmptyStateVariant;
}

export function EmptyState({ icon = 'inbox', title, message, hintLabel, hintColor = colors.primaryDark, action, style, variant = 'page' }: EmptyStateProps) {
  const compact = variant === 'compact';
  return (
    <View accessibilityRole="summary" style={[styles.container, styles[variant], style]}>
      {hintLabel ? <View style={[styles.hintBadge, { borderColor: hintColor }]}><Text style={[styles.hintText, { color: hintColor }]}>{hintLabel}</Text></View> : null}
      <View style={[styles.iconWrap, compact && styles.iconCompact]}>
        <Feather name={icon} size={compact ? 20 : variant === 'section' ? 26 : 30} color={colors.primaryDeep} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {message ? <Text style={[styles.message, compact && styles.messageCompact]}>{message}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, minHeight: 320, padding: spacing.xxxl },
  section: { minHeight: 220, padding: spacing.xxl, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  compact: { minHeight: 112, padding: spacing.lg },
  hintBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, marginBottom: spacing.lg, backgroundColor: colors.surfaceElevated },
  hintText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, letterSpacing: typography.letterSpacings.wide },
  iconWrap: { width: 68, height: 68, borderRadius: radius.circle, backgroundColor: colors.surfaceDeep, borderWidth: 1, borderColor: colors.stitch, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  iconCompact: { width: 44, height: 44, marginBottom: spacing.sm },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, lineHeight: typography.lineHeightPx.title, fontWeight: typography.weights.semibold, color: colors.ink, textAlign: 'center' },
  titleCompact: { fontSize: typography.sizes.subtitle, lineHeight: typography.lineHeightPx.subtitle },
  message: { maxWidth: 480, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: typography.lineHeightPx.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  messageCompact: { fontSize: typography.sizes.small, lineHeight: typography.lineHeightPx.small },
  action: { marginTop: spacing.xl },
});
