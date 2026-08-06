import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';

interface SkeletonProps { width?: DimensionValue; height?: number; borderRadius?: number; style?: StyleProp<ViewStyle>; noShimmer?: boolean }

function SkeletonComponent({ width = '100%', height = 16, borderRadius = radius.sm, style, noShimmer = false }: SkeletonProps) {
  const anim = useRef(new Animated.Value(-1)).current;
  const reducedMotion = useReducedMotion();
  const staticMode = noShimmer || reducedMotion;

  useEffect(() => {
    if (staticMode) return undefined;
    const loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [anim, staticMode]);

  const translateX = anim.interpolate({ inputRange: [-1, 1], outputRange: [-140, 140] });
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.base, { width, height, borderRadius }, style]}>
      {staticMode ? null : <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX }] }]} />}
    </View>
  );
}

export const Skeleton = memo(SkeletonComponent);

export function SkeletonProductGrid({ count = 6, numColumns = 2 }: { count?: number; numColumns?: number }) {
  return <View style={styles.productGrid}>{Array.from({ length: count }, (_, i) => <View key={i} style={[styles.productCard, { width: `${100 / numColumns}%`, paddingLeft: i % numColumns === 0 ? 0 : spacing.sm, paddingRight: i % numColumns === numColumns - 1 ? 0 : spacing.sm }]}><Skeleton height={160} borderRadius={radius.lg} /><View style={styles.gapSm} /><Skeleton width="75%" height={12} /><View style={styles.gapXs} /><Skeleton width="50%" height={10} /><View style={styles.gapXs} /><Skeleton width="40%" height={14} /></View>)}</View>;
}

export function SkeletonShopRow({ count = 4 }: { count?: number }) {
  return <View style={styles.shopRow}>{Array.from({ length: count }, (_, i) => <View key={i} style={styles.shopCard}><Skeleton width={64} height={64} borderRadius={32} /><View style={styles.gapXs} /><Skeleton width={80} height={12} /><View style={styles.gapTiny} /><Skeleton width={60} height={10} /></View>)}</View>;
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceDeep, overflow: 'hidden' },
  shimmer: { height: '100%', width: '55%', backgroundColor: 'rgba(255,255,255,0.48)', opacity: 0.8 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  productCard: { marginBottom: spacing.md },
  shopRow: { flexDirection: 'row', gap: spacing.md },
  shopCard: { width: 130, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  gapSm: { height: spacing.sm }, gapXs: { height: spacing.xs }, gapTiny: { height: spacing.xxs },
});
