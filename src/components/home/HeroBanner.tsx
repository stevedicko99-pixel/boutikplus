// HeroBanner — bannière hero animée en haut de la HomeScreen.
// Rétention visiteur : message rotatif, gradient signature, CTA contextuel.
// Optimisé low-end : 1 seule Animated.loop + 1 Animated.sequence par blob.
import { useEffect, useRef, useState, memo } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, motion } from '@/theme';

interface HeroBannerProps {
  isAuthenticated: boolean;
  userName?: string;
  onPrimaryCta: () => void;
  onSecondaryCta: () => void;
  headerRight?: React.ReactNode;
}

// Messages rotatifs (invité). Pour utilisateur connecté : message fige personnalisé.
// Messaging d'opportunité : "1 vendeur pour l'instant, soyez le prochain à gagner 10x plus".
const GUEST_MESSAGES = [
  { title: '1 vendeur pour l\'instant', sub: 'Soyez le prochain à gagner 10x plus.' },
  { title: 'Opportunité à saisir maintenant', sub: 'Rejoignez la marketplace du Faso en premier.' },
  { title: 'Photos, vidéos, paiements, livraison', sub: 'Tout réuni dans une seule app.' },
];

function HeroBannerComponent({ isAuthenticated, userName, onPrimaryCta, onSecondaryCta, headerRight }: HeroBannerProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  // Auto-rotation des messages (invité uniquement). 4,5s par message.
  useEffect(() => {
    if (isAuthenticated) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GUEST_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Deux blobs flottants : animation native légère (useNativeDriver).
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(blobA, { toValue: 1, duration: motion.durations.slow * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobA, { toValue: 0, duration: motion.durations.slow * 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(blobB, { toValue: 1, duration: motion.durations.slow * 2.4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobB, { toValue: 0, duration: motion.durations.slow * 2.4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, [blobA, blobB]);

  const blobATranslate = blobA.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const blobBTranslate = blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  const message = isAuthenticated
    ? { title: `Bonjour ${userName ?? ''}`.trim(), sub: 'Prêt à découvrir de nouveaux produits ?' }
    : GUEST_MESSAGES[msgIndex];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={colors.brandGradientDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Blobs décoratifs */}
        <Animated.View
          style={[styles.blob, styles.blobA, { transform: [{ translateY: blobATranslate }, { translateX: 4 }] }]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.blob, styles.blobB, { transform: [{ translateY: blobBTranslate }, { translateX: -6 }] }]}
          pointerEvents="none"
        />

        {/* Petit badge marque en haut */}
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>B+</Text>
          </View>
          <Text style={styles.brandName}>Boutikplus</Text>
          <View style={styles.brandRowRight}>
            {headerRight ? headerRight : null}
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Titre + sous-titre */}
        <Text key={`title-${msgIndex}-${isAuthenticated}`} style={styles.title}>{message.title}</Text>
        <Text style={styles.sub}>{message.sub}</Text>

        {/* Boutons CTA */}
        <View style={styles.ctaRow}>
          <Pressable
            style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            onPress={onPrimaryCta}
            accessibilityRole="button"
            accessibilityLabel={isAuthenticated ? 'Explorer les produits' : 'Créer ma boutique gratuitement'}
          >
            <Feather name={isAuthenticated ? 'compass' : 'briefcase'} size={16} color={colors.primaryDeep} />
            <Text style={styles.primaryCtaText}>{isAuthenticated ? 'Explorer' : 'Créer ma boutique'}</Text>
          </Pressable>
          {!isAuthenticated ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
              onPress={onSecondaryCta}
              accessibilityRole="button"
              accessibilityLabel="Voir les produits disponibles"
            >
              <LinearGradient
                colors={colors.accentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.secondaryCtaText}>Voir les produits</Text>
              <Feather name="arrow-right" size={14} color={colors.textInverse} />
            </Pressable>
          ) : null}
        </View>

        {/* Indicateurs de pagination (invité seulement) */}
        {!isAuthenticated ? (
          <View style={styles.dots} accessibilityLabel={`Message ${msgIndex + 1} sur ${GUEST_MESSAGES.length}`}>
            {GUEST_MESSAGES.map((_, i) => (
              <View key={i} style={[styles.dot, i === msgIndex && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

export const HeroBanner = memo(HeroBannerComponent);

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  hero: {
    position: 'relative',
    borderRadius: radius.xxl,
    padding: spacing.lg + 2,
    overflow: 'hidden',
    ...shadows.hero,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  blobA: {
    width: 160, height: 160, top: -50, right: -40,
    backgroundColor: colors.primaryLight,
  },
  blobB: {
    width: 120, height: 120, bottom: -40, left: -30,
    backgroundColor: colors.goldLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  brandBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.textInverse,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 14, fontWeight: typography.weights.extrabold,
    color: colors.primaryDeep,
  },
  brandName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    letterSpacing: typography.letterSpacings.tight,
  },
  brandRowRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveDotInner: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#7BE495',
  },
  liveText: {
    fontFamily: typography.fontFamily,
    fontSize: 9, fontWeight: typography.weights.bold,
    color: colors.textInverse,
    letterSpacing: typography.letterSpacings.ultra,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
    lineHeight: 36,
    letterSpacing: typography.letterSpacings.tight,
    marginBottom: spacing.xs,
    zIndex: 1,
    ...Platform.select({ web: { animationDuration: '520ms', animationName: 'boutikFadeInUp' as any } as any }),
  },
  sub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, zIndex: 1 },
  primaryCta: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.textInverse,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    minHeight: 44,
    ...shadows.fani,
  },
  primaryCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.primaryDeep,
  },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  secondaryCtaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  dots: { flexDirection: 'row', gap: 4, marginTop: spacing.md, zIndex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.32)' },
  dotActive: { width: 20, borderRadius: 4, backgroundColor: colors.accentLight },
  pressed: { opacity: 0.86, transform: [{ scale: 0.97 }] },
});
