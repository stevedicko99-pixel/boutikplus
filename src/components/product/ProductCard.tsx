import { memo } from 'react';
import { Alert, StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing, shadows } from '@/theme';
import { formatFCFA } from '@/lib/format';
import { useFavorites } from '@/context/FavoriteContext';
import { useAuth } from '@/context/AuthContext';
import type { ProductWithImages } from '@/types/models';

interface ProductCardProps {
  product: ProductWithImages;
  onPress: () => void;
  compact?: boolean;
}

function ProductCardComponent({ product, onPress, compact = false }: ProductCardProps) {
  const imageUri = product.images?.[0]?.image_url;
  const isOutOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const hasVideo = (product.videos?.length ?? 0) > 0;
  const { isFav, toggleFavorite } = useFavorites();
  const { profile } = useAuth();
  const favorited = isFav(product.id);

  const handleToggleFav = () => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connecte-toi pour ajouter aux favoris');
      return;
    }
    toggleFavorite(product.id);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatFCFA(product.price)} FCFA${isOutOfStock ? ', rupture de stock' : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={120}
            cachePolicy="memory-disk"
            recyclingKey={`${product.id}-thumb`}
            accessibilityLabel={`Photo de ${product.name}`}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Feather name="image" size={28} color={colors.textMuted} />
          </View>
        )}
        {hasVideo ? (
          <View style={styles.videoBadge}>
            <Feather name="play-circle" size={11} color={colors.textInverse} />
            <Text style={styles.videoBadgeText}>Vidéo</Text>
          </View>
        ) : null}
        {isOutOfStock ? <View style={styles.stockBadge}><Text style={styles.stockText}>Rupture</Text></View> : null}
        <Pressable
          style={({ pressed }) => [styles.favBtn, pressed && styles.controlPressed]}
          onPress={(event) => {
            event.stopPropagation();
            handleToggleFav();
          }}
          accessibilityRole="button"
          accessibilityLabel={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          accessibilityState={{ selected: favorited }}
          hitSlop={4}
        >
          <Feather name="heart" size={18} color={favorited ? colors.danger : colors.textInverse} fill={favorited ? colors.danger : 'rgba(0,0,0,0.12)'} />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        {!compact && product.shop ? <Text style={styles.shop} numberOfLines={1}>{product.shop.name}</Text> : null}
        <Text style={styles.price}>{formatFCFA(product.price)} <Text style={styles.currency}>FCFA</Text></Text>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(
  ProductCardComponent,
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.product.name === next.product.name &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.status === next.product.status &&
    prev.product.images?.[0]?.image_url === next.product.images?.[0]?.image_url &&
    (prev.product.videos?.length ?? 0) === (next.product.videos?.length ?? 0) &&
    prev.compact === next.compact &&
    prev.onPress === next.onPress,
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.fani,
  },
  cardPressed: { opacity: 0.92 },
  cardFocused: { borderColor: colors.stitchDeep, borderWidth: 2 },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surfaceAlt },
  image: { width: '100%', height: '100%', backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  stockBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, backgroundColor: colors.ink, paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.pill },
  stockText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.bold, color: colors.textInverse },
  videoBadge: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(31,24,40,0.76)', paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.pill },
  videoBadgeText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.bold, color: colors.textInverse },
  favBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(31,24,40,0.58)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  controlPressed: { opacity: 0.72 },
  controlFocused: { borderColor: colors.stitch, borderWidth: 2 },
  info: { padding: spacing.md, minHeight: 104 },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: 3, lineHeight: 19 },
  shop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.xs },
  price: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.extrabold, color: colors.primaryDeep, letterSpacing: typography.letterSpacings.tight, marginTop: 'auto' },
  currency: { fontSize: typography.sizes.caption, letterSpacing: typography.letterSpacings.wide },
});
