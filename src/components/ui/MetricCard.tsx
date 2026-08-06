import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { breakpoints, colors, spacing, typography } from '@/theme';
import { Card } from './Card';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: keyof typeof Feather.glyphMap;
  tone?: Tone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const tones = {
  neutral: { surface: colors.surfaceAlt, text: colors.primaryDeep }, success: { surface: colors.successSurface, text: colors.successText }, warning: { surface: colors.warningSurface, text: colors.warningText }, danger: { surface: colors.dangerSurface, text: colors.dangerText }, info: { surface: colors.infoSurface, text: colors.infoText },
};

export function MetricCard({ label, value, detail, trend, trendDirection = 'neutral', icon, tone = 'neutral', onPress, style }: MetricCardProps) {
  const palette = tones[tone];
  return <Card variant={onPress ? 'interactive' : 'outlined'} onPress={onPress} accessibilityLabel={`${label} : ${value}`} style={style}>
    <View style={styles.top}><Text style={styles.label}>{label}</Text>{icon ? <View style={[styles.icon, { backgroundColor: palette.surface }]}><Feather name={icon} size={18} color={palette.text} /></View> : null}</View>
    <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
    {(detail || trend) ? <View style={styles.footer}>{trend ? <Text style={[styles.trend, { color: trendDirection === 'down' ? colors.dangerText : trendDirection === 'up' ? colors.successText : colors.textMuted }]}>{trendDirection === 'up' ? '↑ ' : trendDirection === 'down' ? '↓ ' : ''}{trend}</Text> : null}{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View> : null}
  </Card>;
}

export function MetricGrid({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const columns = width >= breakpoints.wide ? 4 : width >= breakpoints.medium ? 2 : 1;
  return <View style={[styles.grid, style]}>{Array.isArray(children) ? children.map((child, index) => <View key={index} style={{ width: `${100 / columns}%`, paddingHorizontal: spacing.sm }}>{child}</View>) : <View style={{ width: `${100 / columns}%`, paddingHorizontal: spacing.sm }}>{children}</View>}</View>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, label: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.small, lineHeight: typography.lineHeightPx.small, color: colors.textMuted, fontWeight: typography.weights.medium }, icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, value: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, lineHeight: typography.lineHeightPx.hero, fontWeight: typography.weights.bold, letterSpacing: typography.letterSpacings.tight, color: colors.ink, marginTop: spacing.md }, footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }, trend: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold }, detail: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm, rowGap: spacing.lg },
});
