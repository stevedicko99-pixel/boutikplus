import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { PACKAGE_SIZE_BUCKETS, type PackageSizeBucket } from '@/constants/delivery';

interface PackageSizePickerProps {
  selected: PackageSizeBucket['id'] | null;
  onSelect: (bucket: PackageSizeBucket) => void;
}

/** Sélecteur de taille de colis prédéfinie (petit / moyen / grand) */
export function PackageSizePicker({ selected, onSelect }: PackageSizePickerProps) {
  return (
    <View style={styles.container}>
      {PACKAGE_SIZE_BUCKETS.map((bucket) => {
        const isSelected = selected === bucket.id;
        return (
          <Pressable
            key={bucket.id}
            onPress={() => onSelect(bucket)}
            style={[
              styles.bucket,
              isSelected && { borderColor: bucket.color, backgroundColor: bucket.color + '10' },
            ]}
          >
            <View
              style={[
                styles.sizeIcon,
                {
                  backgroundColor: bucket.color + '20',
                  borderColor: bucket.color,
                },
                getSizeIconStyle(bucket.id),
              ]}
            >
              <Feather name="package" size={18} color={bucket.color} />
            </View>
            <Text
              style={[
                styles.label,
                isSelected && { color: bucket.color, fontWeight: typography.weights.semibold },
              ]}
            >
              {bucket.label}
            </Text>
            <Text style={styles.detail}>{bucket.weightKg} kg</Text>
            <Text style={styles.dimensions}>
              {bucket.lengthCm}×{bucket.widthCm}×{bucket.heightCm} cm
            </Text>
            {isSelected && (
              <View style={styles.checkBadge}>
                <Feather name="check" size={12} color={colors.textInverse} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function getSizeIconStyle(id: PackageSizeBucket['id']) {
  switch (id) {
    case 'small':
      return { width: 32, height: 32 };
    case 'medium':
      return { width: 38, height: 38 };
    case 'large':
      return { width: 44, height: 44 };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bucket: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  sizeIcon: {
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 2,
  },
  detail: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  dimensions: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
