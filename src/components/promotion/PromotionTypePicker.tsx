import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import type { PromotionType } from '@/types/models';

interface PromotionTypeOption {
  value: PromotionType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const OPTIONS: PromotionTypeOption[] = [
  {
    value: 'announcement',
    label: 'Annonce',
    description: 'Message accueil',
    icon: 'bell',
    color: colors.warning,
  },
  {
    value: 'special_offer',
    label: 'Offre spéciale',
    description: 'Prix barré produit',
    icon: 'tag',
    color: colors.primary,
  },
  {
    value: 'discount_code',
    label: 'Code promo',
    description: 'Réduction checkout',
    icon: 'percent',
    color: colors.secondary,
  },
];

interface PromotionTypePickerProps {
  value: PromotionType;
  onChange: (type: PromotionType) => void;
}

export function PromotionTypePicker({
  value,
  onChange,
}: PromotionTypePickerProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.option,
              selected && { borderColor: opt.color, backgroundColor: opt.color + '10' },
            ]}
            onPress={() => onChange(opt.value)}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: selected ? opt.color : opt.color + '20' },
              ]}
            >
              <Feather
                name={opt.icon as any}
                size={20}
                color={selected ? colors.textInverse : opt.color}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: selected ? opt.color : colors.text },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
            <Text style={styles.description} numberOfLines={1}>
              {opt.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { OPTIONS as PROMOTION_TYPE_OPTIONS };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
