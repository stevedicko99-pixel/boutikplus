import { memo } from 'react';
import { Alert, Platform, StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AdaptiveImage } from '@/components/ui/AdaptiveImage';
import { colors, typography, radius, spacing, shadows } from '@/theme';
import { formatFCFA } from '@/lib/format';
import { useFavorites } from '@/context/FavoriteContext';
import { useAuth } from '@/context/AuthContext';
import type { ProductWithImages } from '@/types/models';

interface ProductCardProps {
  product: ProductWithImages;
  onPress: () => void;
  compact?: boolean;
  homeSingleColumn?: boolean;
}

function ProductCardComponent({ product, onPress, compact = false, homeSingleColumn = false }: ProductCardProps) {
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
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        Platform.OS === 'web' && styles.cardWeb,
        homeSingleColumn && styles.homeSingleColumnCard,
      ]}
    >
      <View style={[styles.imageWrap, homeSingleColumn && styles.homeSingleColumnImageWrap]}>
        {imageUri ? (
          <AdaptiveImage
            uri={imageUri}
            role="card"
            displayWidth={360}
            style={styles.image}
            contentFit="cover"
            transition={120}
            recyclingKey={`${product.id}-thumb`}
            accessibilityLabel={`Photo de ${product.name}`}
            fallback={(
              <View style={[styles.image, styles.placeholder]}>
                <Feather name="image" size={28} color={colors.textMuted} />
              </View>
            )}
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
      <View style={[styles.info, homeSingleColumn && styles.homeSingleColumnInfo]}>
        <Text style={[styles.name, homeSingleColumn && styles.homeSingleColumnName]} numberOfLines={2}>{product.name}</Text>
        {!compact && product.shop ? <Text style={[styles.shop, homeSingleColumn && styles.homeSingleColumnShop]} numberOfLines={1}>{product.shop.name}</Text> : null}
        <View style={styles.priceRow}>
          <Text style={[styles.price, homeSingleColumn && styles.homeSingleColumnPrice]}>{formatFCFA(product.price)} <Text style={styles.currency}>FCFA</Text></Text>
          {isOutOfStock ? <Text style={styles.outText}>Hors stock</Text> : null}
        </View>
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
    prev.homeSingleColumn === next.homeSingleColumn &&
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
  cardWeb: { transitionDuration: '240ms', transitionProperty: 'transform, box-shadow' },
  cardFocused: { borderColor: colors.stitchDeep, borderWidth: 2 },
  homeSingleColumnCard: { width: '100%' },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surfaceAlt },
  homeSingleColumnImageWrap: { aspectRatio: 16 / 10 },
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
  homeSingleColumnInfo: { padding: spacing.lg, minHeight: 124 },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.ink, marginBottom: 3, lineHeight: 19 },
  homeSingleColumnName: { fontSize: typography.sizes.body, lineHeight: 23, marginBottom: spacing.xs },
  shop: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.xs },
  homeSingleColumnShop: { fontSize: typography.sizes.small, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginTop: 'auto' },
  price: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.extrabold, color: colors.primaryDeep, letterSpacing: typography.letterSpacings.tight },
  homeSingleColumnPrice: { fontSize: typography.sizes.subtitle },
  currency: { fontSize: typography.sizes.caption, letterSpacing: typography.letterSpacings.wide },
  outText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.semibold, color: colors.danger },
});
