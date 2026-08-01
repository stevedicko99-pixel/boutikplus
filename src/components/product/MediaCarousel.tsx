// Carrousel média unifié — Boutikplus
// Fusionne images et vidéos d'un produit en un carrousel horizontal paginé.
// Remplace ImageCarousel dans ProductDetailScreen pour présenter photos ET vidéos
// dans un même flux, triés par position. Dots indicateurs conservés.

import { useState } from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
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
  height = 340,
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Fusionne images + vidéos, triées par position.
  const media: MediaItem[] = [
    ...images.map((uri, i) => ({ kind: 'image' as const, uri, position: i })),
    ...(videos ?? []).map((v) => ({ kind: 'video' as const, video: v, position: v.position })),
  ].sort((a, b) => a.position - b.position);

  if (!media.length) {
    return (
      <View style={[styles.placeholder, { height }]} />
    );
  }

  return (
    <View>
      <ScrollView
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
      >
        {media.map((item, i) => (
          <View key={i} style={{ width: '100%', height }}>
            {item.kind === 'image' ? (
              <Image
                source={{ uri: item.uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.videoPage}>
                <ProductVideoCard video={item.video} compact />
              </View>
            )}
            {item.kind === 'video' ? (
              <View style={styles.videoTag}>
                <Feather name="play-circle" size={11} color={colors.textInverse} />
                <Text style={styles.videoTagText}>Vidéo</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {media.length > 1 ? (
        <View style={styles.dots}>
          {media.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Text importé en haut de fichier avec les autres primitives react-native.

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    width: '100%',
    borderRadius: radius.lg,
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
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 20 },
});
