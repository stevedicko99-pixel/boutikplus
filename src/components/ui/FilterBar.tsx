import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

export interface FilterOption { key: string; label: string; count?: number; disabled?: boolean }
interface FilterBarProps { options: FilterOption[]; selectedKey: string; onSelect: (key: string) => void; label?: string; trailing?: React.ReactNode; style?: StyleProp<ViewStyle> }

export function FilterBar({ options, selectedKey, onSelect, label = 'Filtres', trailing, style }: FilterBarProps) {
  return (
    <View accessibilityRole="toolbar" accessibilityLabel={label} style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {options.map((option) => {
          const selected = option.key === selectedKey;
          return <Pressable key={option.key} onPress={() => onSelect(option.key)} disabled={option.disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled: option.disabled }} accessibilityLabel={option.count == null ? option.label : `${option.label}, ${option.count}`} style={({ pressed }) => [styles.filter, selected && styles.selected, pressed && styles.pressed, option.disabled && styles.disabled]}>
            <Text style={[styles.text, selected && styles.selectedText]}>{option.label}</Text>
            {option.count != null ? <View style={[styles.count, selected && styles.selectedCount]}><Text style={[styles.countText, selected && styles.selectedCountText]}>{option.count}</Text></View> : null}
          </Pressable>;
        })}
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' }, content: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs }, filter: { minHeight: layout.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated }, selected: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep }, pressed: { opacity: 0.82 }, focused: { borderColor: colors.focusRing, ...shadows.focus }, disabled: { opacity: 0.42 }, text: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text }, selectedText: { color: colors.textInverse }, count: { minWidth: 24, height: 24, paddingHorizontal: spacing.xs, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDeep }, selectedCount: { backgroundColor: 'rgba(255,255,255,0.18)' }, countText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textMuted }, selectedCountText: { color: colors.textInverse }, trailing: { marginLeft: spacing.sm },
});
