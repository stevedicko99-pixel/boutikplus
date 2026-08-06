import { memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing, shadows } from '@/theme';
import { Rating } from '@/components/ui/Rating';
import type { Shop } from '@/types/models';

interface ShopCardProps {
  shop: Shop;
  rating?: number;
  reviewCount?: number;
  onPress: () => void;
  horizontal?: boolean;
}

function ShopCardComponent({ shop, rating = 0, reviewCount, onPress, horizontal = false }: ShopCardProps) {
  const logoSrc = shop.logo_url || shop.banner_url || 'https://dummyimage.com/200x200/FF6B00/FFFFFF&text=B';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Boutique ${shop.name}, ${shop.city}`}
      style={({ pressed }) => [horizontal ? styles.cardH : styles.cardV, pressed && styles.pressed]}
    >
      <Image
        source={{ uri: logoSrc }}
        style={styles.logo}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
        recyclingKey={`${shop.id}-logo`}
        accessibilityLabel={`Logo de ${shop.name}`}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.meta}>
          <Feather name="map-pin" size={12} color={colors.primaryDeep} />
          <Text style={styles.city} numberOfLines={1}>{shop.city}</Text>
        </View>
        {rating > 0 ? <Rating value={rating} size={12} count={reviewCount} /> : <Text style={styles.localLabel}>Commerce local</Text>}
      </View>
      <View style={styles.arrow}><Feather name="arrow-up-right" size={16} color={colors.primaryDeep} /></View>
    </Pressable>
  );
}

export const ShopCard = memo(
  ShopCardComponent,
  (prev, next) =>
    prev.shop.id === next.shop.id && prev.shop.name === next.shop.name && prev.shop.city === next.shop.city &&
    prev.shop.logo_url === next.shop.logo_url && prev.shop.banner_url === next.shop.banner_url &&
    prev.rating === next.rating && prev.reviewCount === next.reviewCount && prev.horizontal === next.horizontal && prev.onPress === next.onPress,
);

const styles = StyleSheet.create({
  cardV: { flex: 1, minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, ...shadows.fani },
  cardH: { width: 260, minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, ...shadows.fani },
  pressed: { opacity: 0.9 },
  focused: { borderColor: colors.stitchDeep, borderWidth: 2 },
  logo: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.stitch },
  content: { flex: 1, minWidth: 0 },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.ink, marginBottom: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  city: { flexShrink: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  localLabel: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.semibold, color: colors.success, textTransform: 'uppercase', letterSpacing: typography.letterSpacings.wide },
  arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
