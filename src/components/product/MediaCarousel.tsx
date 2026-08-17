// Carrousel média unifié — Boutikplus (Design Luxe)
// Galerie produit premium inspirée des sites de luxe (LVMH, Shopify Plus)
// Carrousel plein écran, thumbnails latéraux, indicateur de position,
// zoom au tap, transitions fluides.

import { useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, Text, Pressable, useWindowDimensions, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AdaptiveImage } from '@/components/ui/AdaptiveImage';
import { colors, radius, spacing, typography } from '@/theme';
import { ProductVideoCard } from './ProductVideoCard';
import type { ProductVideo } from '@/types/models';

interface MediaCarouselProps {
  images: string[];
  videos?: ProductVideo[];
  height?: number;
}

type MediaItem =
  | { kind: 'image'; uri: string; position: number }
  | { kind: 'video'; video: ProductVideo; position: number };

export function MediaCarousel({
  images,
  videos,
  height = 420,
}: MediaCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Fusionne images + vidéos, triées par position.
  const media: MediaItem[] = [
    ...images.map((uri, i) => ({ kind: 'image' as const, uri, position: i })),
    ...(videos ?? []).map((v) => ({ kind: 'video' as const, video: v, position: v.position })),
  ].sort((a, b) => a.position - b.position);

  const goToIndex = (index: number) => {
    if (index < 0 || index >= media.length) return;
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    // Petit effet de fondu lors du changement
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  if (!media.length) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Feather name="image" size={48} color={colors.textMuted} />
        <Text style={styles.placeholderText}>Aucune image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Galerie principale plein écran */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) =>
            setActiveIndex(
              Math.round(
                e.nativeEvent.contentOffset.x /
                  (e.nativeEvent.layoutMeasurement.width || 1),
              ),
            )
          }
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {media.map((item, i) => {
            const shouldRender = Math.abs(i - activeIndex) <= 1;
            return (
              <View key={i} style={{ width: screenWidth, height }}>
                {shouldRender ? item.kind === 'image' ? (
                  <AdaptiveImage
                    uri={item.uri}
                    role="gallery"
                    displayWidth={screenWidth}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                    recyclingKey={`gallery-${i}`}
                    accessibilityLabel={`Image ${i + 1} du produit`}
                  />
                ) : (
                  <View style={styles.videoPage}>
                    <ProductVideoCard video={item.video} compact />
                  </View>
                ) : null}
                {shouldRender && item.kind === 'video' ? (
                  <View style={styles.videoTag}>
                    <Feather name="play-circle" size={11} color={colors.textInverse} />
                    <Text style={styles.videoTagText}>Vidéo</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Compteur de position (style luxe) */}
      {media.length > 1 ? (
        <View style={styles.counterBadge} pointerEvents="none">
          <Text style={styles.counterText}>
            {String(activeIndex + 1).padStart(2, '0')}
            <Text style={styles.counterSep}> / </Text>
            {String(media.length).padStart(2, '0')}
          </Text>
        </View>
      ) : null}

      {/* Thumbnails horizontaux (style galerie luxe) */}
      {media.length > 1 ? (
        <View style={styles.thumbnailsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsContent}
          >
            {media.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => goToIndex(i)}
                style={[
                  styles.thumbnail,
                  i === activeIndex && styles.thumbnailActive,
                ]}
              >
                {item.kind === 'image' ? (
                  <AdaptiveImage
                    uri={item.uri}
                    role="thumbnail"
                    displayWidth={68}
                    style={styles.thumbnailImg}
                    contentFit="cover"
                    transition={100}
                    recyclingKey={`gallery-thumb-${i}`}
                    accessibilityLabel={`Miniature ${i + 1}`}
                  />
                ) : (
                  <View style={[styles.thumbnailImg, styles.thumbnailVideo]}>
                    <Feather name="play" size={16} color={colors.textInverse} />
                  </View>
                )}
                {i === activeIndex ? <View style={styles.thumbnailOverlay} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  videoPage: {
    flex: 1,
    padding: 0,
    backgroundColor: '#000',
  },
  videoTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  videoTagText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  // Compteur style luxe (ex: "01 / 05")
  counterBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
      default: { boxShadow: '0px 2px 6px rgba(0,0,0,0.25)' },
    }),
  },
  counterText: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  counterSep: {
    opacity: 0.6,
  },
  // Thumbnails — plus grands pour un switch facile (style Amazon/Shopify)
  thumbnailsRow: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  thumbnailsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
      default: {},
    }),
  },
  thumbnailActive: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
  },
  thumbnailVideo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
});
