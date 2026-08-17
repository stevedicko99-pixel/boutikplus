// BrandLoader — animation de chargement légère et performante.
// Optimisé pour les appareils low-end : seulement 2 animations (orbe + wordmark).
// Previously 6 concurrent loops → now 2, eliminating jank on low-end devices.
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@/theme';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: boolean;
  fullPage?: boolean;
}

const ORB_SIZE = { sm: 36, md: 48, lg: 64 };

function BrandLoader({ size = 'md', label = true, fullPage = false }: BrandLoaderProps) {
  const orbScale = useRef(new Animated.Value(1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          useNativeDriver: true,
        }),
      ]),
    );

    const wordmarkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkOpacity, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    orbLoop.start();
    wordmarkLoop.start();

    return () => {
      orbLoop.stop();
      wordmarkLoop.stop();
    };
  }, [orbScale, wordmarkOpacity]);

  const orbSize = ORB_SIZE[size];

  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      <Animated.View
        style={[
          styles.orbWrap,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            transform: [{ scale: orbScale }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFB089', '#FF8A5C', '#E66A3A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.orbShine, { width: orbSize * 0.3, height: orbSize * 0.3, borderRadius: orbSize * 0.15, top: orbSize * 0.18, left: orbSize * 0.2 }]} />
      </Animated.View>

      {label ? (
        <Animated.View style={{ opacity: wordmarkOpacity }}>
          <Text style={styles.wordmark}>Boutikplus</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullPage: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbWrap: {
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#FF8A5C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: { boxShadow: '0 6px 16px -4px rgba(255,138,92,0.4)' },
    }),
  },
  orbShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  wordmark: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
    textAlign: 'center',
  },
});

export { BrandLoader };
