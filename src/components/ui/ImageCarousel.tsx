import { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AdaptiveImage } from './AdaptiveImage';

interface ImageCarouselProps {
  images: string[];
  height?: number;
  borderRadius?: number;
}

export function ImageCarousel({
  images,
  height = 320,
  borderRadius = 0,
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <View
        style={[
          styles.placeholder,
          { height, borderRadius: borderRadius || radius.lg },
        ]}
      />
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) =>
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / (e.nativeEvent.layoutMeasurement.width || 1)))
        }
        scrollEventThrottle={16}
      >
        {images.map((uri, i) => (
          <Pressable key={i} style={{ width: '100%' }}>
            <AdaptiveImage
              uri={uri}
              style={[styles.image, { height, borderRadius }]}
              role="gallery"
              contentFit="cover"
              transition={150}
            />
          </Pressable>
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((_, i) => (
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

const styles = StyleSheet.create({
  image: { width: '100%' },
  placeholder: {
    backgroundColor: colors.surfaceAlt,
    width: '100%',
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
