// BrandLoader — animation de chargement « Marque animée » signature Fil de Faso.
//
// Composition (centrée, verticale) :
// 1. Orbe respirant : LinearGradient corail dans un cercle (overflow hidden).
//    scale 1→1.08→1 + opacity 0.92→1→0.92 sur 1,4s.
// 2. 3 points fil : chacun une Animated.Value indépendante, opacity 0.2→1→0.2
//    + scale 0.6→1→0.6, décalées de 220 ms. Durée 1,1s.
// 3. Wordmark « Boutikplus » : extrabold, letterSpacing tight, color ink.
//    Overlay shimmer (LinearGradient transparent→blanc→transparent) translaté
//    en translateX -100%→+200% sur 1,6s.
// 4. Fil dessiné : View height 2, scaleX 0→1 (transformOrigin left) sur 1,2s,
//    couleur stitch. Effet « tracé de couture » sous le mot.
//
// Cycle ~2,4s, useNativeDriver: true partout (transform/opacity uniquement).
// Boucles Animated.loop(Animated.sequence([...])) démarrées au mount.
//
// Perf : pas de blur/SVG, que des View peintes. OK Android low-end Burkina.
import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '@/theme';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: boolean;
  fullPage?: boolean;
}

const ORB_SIZE = { sm: 40, md: 56, lg: 72 };
const WORDMARK_WIDTH = { sm: 132, md: 168, lg: 200 };
const THREAD_WIDTH = { sm: 92, md: 120, lg: 150 };

function BrandLoader({ size = 'md', label = true, fullPage = false }: BrandLoaderProps) {
  // 1. Orbe respirant
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.92)).current;

  // 2. 3 points fil
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  // 3. Shimmer wordmark
  const shimmerX = useRef(new Animated.Value(0)).current;

  // 4. Fil dessiné
  const threadScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.08,
            duration: 1400,
            easing: Easing.bezier(0.45, 0, 0.55, 1),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 1,
            duration: 1400,
            easing: Easing.bezier(0.45, 0, 0.55, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1,
            duration: 1400,
            easing: Easing.bezier(0.45, 0, 0.55, 1),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.92,
            duration: 1400,
            easing: Easing.bezier(0.45, 0, 0.55, 1),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const dotAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(val, {
              toValue: 1,
              duration: 550,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(val, {
              toValue: 0.2,
              duration: 550,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

    const dot1Loop = dotAnim(dot1, 0);
    const dot2Loop = dotAnim(dot2, 220);
    const dot3Loop = dotAnim(dot3, 440);

    // Shimmer sweep : translateX de -wordmarkWidth à +wordmarkWidth (200% de déplacement)
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 1600,
        easing: Easing.bezier(0.45, 0, 0.55, 1),
        useNativeDriver: true,
      }),
    );

    const threadLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(threadScale, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(threadScale, {
          toValue: 0,
          duration: 600,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          useNativeDriver: true,
        }),
      ]),
    );

    orbLoop.start();
    dot1Loop.start();
    dot2Loop.start();
    dot3Loop.start();
    shimmerLoop.start();
    threadLoop.start();

    return () => {
      orbLoop.stop();
      dot1Loop.stop();
      dot2Loop.stop();
      dot3Loop.stop();
      shimmerLoop.stop();
      threadLoop.stop();
    };
  }, [orbScale, orbOpacity, dot1, dot2, dot3, shimmerX, threadScale]);

  const orbSize = ORB_SIZE[size];
  const wordmarkW = WORDMARK_WIDTH[size];
  const threadW = THREAD_WIDTH[size];

  // Shimmer interpolation : -wordmarkW → +2*wordmarkW
  const shimmerTranslate = shimmerX.interpolate({
    inputRange: [0, 1],
    outputRange: [-wordmarkW, wordmarkW * 2],
  });

  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      {/* 1. Orbe respirant */}
      <Animated.View
        style={[
          styles.orbWrap,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            opacity: orbOpacity,
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
        {/* Reflet intérieur (effet "perle de karité") */}
        <View style={[styles.orbShine, { width: orbSize * 0.32, height: orbSize * 0.32, borderRadius: orbSize * 0.16, top: orbSize * 0.18, left: orbSize * 0.2 }]} />
      </Animated.View>

      {/* 2. 3 points fil */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: d,
                transform: [
                  {
                    scale: d.interpolate({
                      inputRange: [0.2, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* 3. Wordmark + shimmer */}
      {label ? (
        <View style={[styles.wordmarkWrap, { width: wordmarkW }]}>
          <Text style={styles.wordmark}>Boutikplus</Text>
          <Animated.View
            style={[
              styles.shimmerOverlay,
              { width: wordmarkW * 0.6, transform: [{ translateX: shimmerTranslate }] },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      ) : null}

      {/* 4. Fil dessiné */}
      <View style={[styles.threadWrap, { width: threadW }]}>
        <Animated.View
          style={[
            styles.thread,
            {
              transform: [{ scaleX: threadScale }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullPage: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbWrap: {
    overflow: 'hidden',
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#FF8A5C',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: { boxShadow: '0 8px 20px -6px rgba(255,138,92,0.45)' },
    }),
  },
  orbShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stitchDeep,
  },
  wordmarkWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  wordmark: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
    textAlign: 'center',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  threadWrap: {
    height: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thread: {
    width: '100%',
    height: 2,
    backgroundColor: colors.stitch,
    borderRadius: 1,
  },
});

export { BrandLoader };
