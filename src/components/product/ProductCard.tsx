import { memo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Platform, Animated } from 'react-native';
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

  // Micro-animation : scale 1 → 0.97 au press, rebond spring
  const pressScale = useRef(new Animated.Value(1)).current;
  // État hover web (pour l'élévation)
  const [hovered, setHovered] = useState(false);

  const handleToggleFav = () => {
    if (!profile) {
      Alert.alert('Connexion requise', 'Connecte-toi pour ajouter aux favoris');
      return;
    }
    toggleFavorite(product.id);
  };

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: Platform.OS === 'web' ? 0.99 : 0.97,
      friction: 9,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const hoverStyleActive = Platform.OS === 'web'
    ? ({
        transform: [{ translateY: -4 }],
        transition: 'box-shadow 180ms ease-out, transform 180ms ease-out',
        boxShadow: '0 22px 40px -16px rgba(255,138,92,0.32), 0 4px 10px -3px rgba(42,34,48,0.08)',
        cursor: 'pointer',
        zIndex: 2,
      } as any)
    : null;

  const hoverStyleIdle = Platform.OS === 'web'
    ? ({
        transition: 'box-shadow 150ms ease-in, transform 150ms ease-in',
        cursor: 'pointer',
      } as any)
    : null;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: pressScale }] },
        hovered && Platform.OS === 'web' ? hoverStyleActive : (Platform.OS === 'web' ? hoverStyleIdle : null),
      ] as any}
      {...(Platform.OS === 'web'
        ? ({
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          } as any)
        : {})}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.9 },
          hovered && styles.cardHovered,
        ]}
      >
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={120}
              cachePolicy="memory-disk"
              recyclingKey={product.id + '-thumb'}
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
          <Pressable
            style={({ pressed }) => [styles.favBtn, pressed && { opacity: 0.7 }]}
            onPress={handleToggleFav}
            hitSlop={6}
          >
            <Feather
              name="heart"
              size={16}
              color={favorited ? colors.danger : colors.textInverse}
              fill={favorited ? colors.danger : 'rgba(0,0,0,0.15)'}
            />
          </Pressable>
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
    </Animated.View>
  );
}

/**
 * Évite les re-renders inutiles quand la liste scroll :
 * - Même product.id → même carte affichée.
 * - Même onPress (identique via useCallback parent) → pas de ré-évaluation.
 */
export const ProductCard = memo(
  ProductCardComponent,
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.product.price === next.product.price &&
    prev.product.stock === next.product.stock &&
    prev.product.status === next.product.status &&
    prev.compact === next.compact,
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    // Coins pincés « Fani » : haut-gauche plus rond qu'ailleurs (pli de tissu)
    borderTopLeftRadius: 22,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 0,
    ...shadows.fani,
  },
  cardHovered: {
    ...shadows.faniHover,
  },
  imageWrap: { position: 'relative' },
  image: {
    width: '100%',
    height: 172,
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
    bottom: spacing.sm,
    left: spacing.sm,
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
  favBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(42, 34, 48, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: spacing.md, paddingTop: spacing.sm + 2 },
  name: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
    lineHeight: typography.lineHeights.normal * typography.sizes.small,
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
    fontWeight: typography.weights.extrabold,
    color: colors.primaryDeep,
    letterSpacing: typography.letterSpacings.tight,
    marginTop: 2,
  },
});
