import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { formatFCFA } from '@/lib/format';
import type { ProductWithImages } from '@/types/models';

interface ProductCardProps {
  product: ProductWithImages;
  onPress: () => void;
  compact?: boolean;
}

export function ProductCard({ product, onPress, compact = false }: ProductCardProps) {
  const imageUri = product.images?.[0]?.image_url;
  const isOutOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const hasVideo = (product.videos?.length ?? 0) > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Feather name="image" size={28} color={colors.textMuted} />
          </View>
        )}
        {hasVideo ? (
          <View style={styles.videoBadge}>
            <Feather name="play-circle" size={10} color={colors.textInverse} />
            <Text style={styles.videoBadgeText}>Vidéo</Text>
          </View>
        ) : null}
        {isOutOfStock ? (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Rupture</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {!compact && product.shop ? (
          <Text style={styles.shop} numberOfLines={1}>
            {product.shop.name}
          </Text>
        ) : null}
        <Text style={styles.price}>{formatFCFA(product.price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surfaceAlt,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.danger,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  stockText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  videoBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  info: { padding: spacing.sm },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  shop: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  price: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
