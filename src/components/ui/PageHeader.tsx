import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { breakpoints, colors, spacing, typography } from '@/theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PageHeader({ title, subtitle, eyebrow, actions, leading, style }: PageHeaderProps) {
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.medium;
  return (
    <View style={[styles.container, wide && styles.containerWide, style]}>
      <View style={styles.main}>
        {leading}
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" aria-level={1} style={[styles.title, wide && styles.titleWide]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actions ? <View accessibilityRole="toolbar" style={[styles.actions, !wide && styles.actionsCompact]}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingVertical: spacing.xl },
  containerWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, maxWidth: 760 },
  eyebrow: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, lineHeight: typography.lineHeightPx.caption, fontWeight: typography.weights.bold, letterSpacing: typography.letterSpacings.ultra, textTransform: 'uppercase', color: colors.primaryDeep, marginBottom: spacing.xs },
  title: { fontFamily: typography.fontFamily, fontSize: typography.responsiveSizes.heading.compact, lineHeight: typography.lineHeightPx.heading, fontWeight: typography.weights.bold, letterSpacing: typography.letterSpacings.tight, color: colors.ink },
  titleWide: { fontSize: typography.responsiveSizes.heading.wide, lineHeight: 39 },
  subtitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, lineHeight: typography.lineHeightPx.body, color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  actionsCompact: { alignSelf: 'stretch' },
});
