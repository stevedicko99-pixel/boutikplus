import { memo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AdaptiveImage } from '@/components/ui/AdaptiveImage';
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
  const logoSrc = shop.logo_url || shop.banner_url;
  const initial = (shop.name || 'B').trim().charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Boutique ${shop.name}, ${shop.city}`}
      style={({ pressed }) => [horizontal ? styles.cardH : styles.cardV, pressed && styles.pressed]}
    >
      <View style={styles.logoWrap}>
        <AdaptiveImage
          uri={logoSrc}
          role="avatar"
          displayWidth={76}
          style={styles.logo}
          contentFit="cover"
          transition={120}
          recyclingKey={`${shop.id}-logo`}
          accessibilityLabel={`Logo de ${shop.name}`}
          fallback={(
            <View style={[styles.logo, styles.monogram]}>
              <Text style={styles.monogramText}>{initial}</Text>
            </View>
          )}
        />
        {shop.is_verified ? (
          <View style={styles.verifiedDot}>
            <Feather name="check" size={10} color={colors.textInverse} />
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          {shop.is_verified ? <Feather name="shield" size={12} color={colors.gold} /> : null}
        </View>
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
    prev.shop.is_verified === next.shop.is_verified &&
    prev.rating === next.rating && prev.reviewCount === next.reviewCount && prev.horizontal === next.horizontal && prev.onPress === next.onPress,
);

const styles = StyleSheet.create({
  cardV: {
    flex: 1, minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.fani,
  },
  cardH: {
    width: 272, minHeight: 118, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.fani,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  focused: { borderColor: colors.stitchDeep, borderWidth: 2 },
  logoWrap: { position: 'relative' },
  logo: {
    width: 76, height: 76, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5, borderColor: colors.stitch,
  },
  monogram: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDeep, borderColor: colors.stitchDeep },
  monogramText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.extrabold, color: colors.primaryDeep },
  verifiedDot: {
    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  name: { flexShrink: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  city: { flexShrink: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  localLabel: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.semibold, color: colors.success, textTransform: 'uppercase', letterSpacing: typography.letterSpacings.wide },
  arrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});

