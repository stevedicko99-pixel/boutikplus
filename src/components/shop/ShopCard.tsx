import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { Rating } from '@/components/ui/Rating';
import type { Shop } from '@/types/models';

interface ShopCardProps {
  shop: Shop;
  rating?: number;
  reviewCount?: number;
  onPress: () => void;
  horizontal?: boolean;
}

export function ShopCard({
  shop,
  rating = 0,
  reviewCount,
  onPress,
  horizontal = false,
}: ShopCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        horizontal ? styles.cardH : styles.cardV,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={{
          uri: shop.logo_url || shop.banner_url || 'https://placehold.co/200x200/FF6B00/FFFFFF?text=B',
        }}
        style={horizontal ? styles.logoH : styles.logoV}
        contentFit="cover"
        transition={120}
      />
      <Text style={styles.name} numberOfLines={1}>
        {shop.name}
      </Text>
      <View style={styles.meta}>
        <Feather name="map-pin" size={11} color={colors.textMuted} />
        <Text style={styles.city}>{shop.city}</Text>
      </View>
      {rating > 0 ? (
        <Rating value={rating} size={12} count={reviewCount} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardV: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardH: {
    width: 130,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  logoV: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  logoH: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  city: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
