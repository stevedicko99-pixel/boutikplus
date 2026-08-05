import { memo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Animated } from 'react-native';
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

function ShopCardComponent({
  shop,
  rating = 0,
  reviewCount,
  onPress,
  horizontal = false,
}: ShopCardProps) {
  const logoSrc = shop.logo_url || shop.banner_url || 'https://dummyimage.com/200x200/FF6B00/FFFFFF&text=B';
  const pressScale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: Platform.OS === 'web' ? 0.985 : 0.96,
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
        boxShadow: '0 16px 32px -12px rgba(255, 138, 92, 0.22), 0 4px 10px -4px rgba(42, 34, 48, 0.06)',
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
          horizontal ? styles.cardH : styles.cardV,
          pressed && { opacity: 0.9 },
          hovered && styles.cardHovered,
        ]}
      >
        {/* Logo cerclé d'un « fil » : double bord superposé stitch + primaryDeep */}
        <View style={styles.logoHalo}>
          <Image
            source={{ uri: logoSrc }}
            style={styles.logo}
            contentFit="cover"
            transition={120}
            cachePolicy="memory-disk"
            recyclingKey={shop.id + '-logo'}
          />
        </View>
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
    </Animated.View>
  );
}

export const ShopCard = memo(
  ShopCardComponent,
  (prev, next) =>
    prev.shop.id === next.shop.id &&
    prev.shop.name === next.shop.name &&
    prev.shop.city === next.shop.city &&
    prev.rating === next.rating &&
    prev.reviewCount === next.reviewCount &&
    prev.horizontal === next.horizontal,
);

const styles = StyleSheet.create({
  cardV: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 22,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 0,
    ...shadows.fani,
  },
  cardH: {
    width: 136,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 22,
    padding: spacing.lg,
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 0,
    ...shadows.fani,
  },
  cardHovered: {
    ...shadows.faniHover,
  },
  // Halo externe stitch (le "fil" qui dépasse autour du logo)
  logoHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.stitch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image interne avec bord primaryDeep (double impression de fil)
  logo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primaryDeep,
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
