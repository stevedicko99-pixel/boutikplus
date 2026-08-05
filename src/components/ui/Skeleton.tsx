import { useEffect, useRef, memo } from 'react';
import { StyleSheet, View, Animated, Easing, Platform } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  /** Désactiver l'animation shimmer (utile pour les tests ou mode faible perf). */
  noShimmer?: boolean;
}

/**
 * Bloc squelette animé (indicateur de chargement par bloc visuel).
 * - Léger : pas de dépendance lourde (SVG/MaskedView).
 * - Approche compatible web + natif : shimmer via Animated.View translatée.
 *   Sur web, on utilise aussi un dégradé background CSS via RN styles pour rester
 *   compatible RN Web sans modules supplémentaires.
 */
function SkeletonComponent({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
  noShimmer = false,
}: SkeletonProps) {
  const anim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (noShimmer) return undefined;
    // Loop doux : x: -1 → 1 sur ~1.6s puis enchaînement.
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, noShimmer]);

  const translateX = anim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-100, 100],
  });

  return (
    <View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      {noShimmer ? null : (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

export const Skeleton = memo(SkeletonComponent);

/**
 * Grille de 6 cartes produit en squelette.
 */
export function SkeletonProductGrid({ count = 6, numColumns = 2 }: { count?: number; numColumns?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap' }, styles.productGrid]}>
      {items.map((i) => (
        <View
          key={i}
          style={[
            styles.productCard,
            { width: `${100 / numColumns}%` },
            (i % 2 === 0) ? { paddingRight: spacing.md / 2 } : { paddingLeft: spacing.md / 2 },
          ]}
        >
          <Skeleton width="100%" height={160} borderRadius={radius.lg} />
          <View style={{ height: spacing.sm }} />
          <Skeleton width="75%" height={12} />
          <View style={{ height: spacing.xs }} />
          <Skeleton width="50%" height={10} />
          <View style={{ height: spacing.xs }} />
          <Skeleton width="40%" height={14} borderRadius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

/**
 * Carousel de boutiques squelettes.
 */
export function SkeletonShopRow({ count = 4 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      {items.map((i) => (
        <View key={i} style={styles.shopCard}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <View style={{ height: spacing.xs }} />
          <Skeleton width={80} height={12} />
          <View style={{ height: 2 }} />
          <Skeleton width={60} height={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  shimmer: {
    height: '100%',
    width: '60%',
    backgroundColor:
      Platform.OS === 'web' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.35)',
    // Crée un dégradé sur le shimmer même sur web :
    opacity: 0.85,
  },
  productGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  productCard: {
    marginBottom: spacing.md,
  },
  shopCard: {
    width: 130,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
