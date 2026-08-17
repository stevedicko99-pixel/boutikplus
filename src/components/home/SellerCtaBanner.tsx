// SellerCtaBanner — bannière de rétention "Deviens vendeur aujourd'hui".
// Placée en bas du flux Home, pour les visiteurs non connectés uniquement.
import { memo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface SellerCtaBannerProps {
  onPress: () => void;
}

function SellerCtaBannerComponent({ onPress }: SellerCtaBannerProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.surfaceElevated, colors.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.body}>
          <View style={styles.iconWrap}>
            <Feather name="briefcase" size={22} color={colors.textInverse} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>Soyez le prochain vendeur</Text>
            <Text style={styles.sub}>1 vendeur pour l'instant. Rejoignez WILLARIS PRIME BF et gagnez 10x plus. Gratuit, en 2 minutes.</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Créer ma boutique maintenant"
        >
          <Text style={styles.ctaText}>Créer ma boutique</Text>
          <Feather name="arrow-right" size={14} color={colors.primaryDeep} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

export const SellerCtaBanner = memo(SellerCtaBannerComponent);

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg, marginTop: spacing.xs },
  card: {
    position: 'relative',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.fani,
  },
  accentBar: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: 4,
    backgroundColor: colors.accent,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.fani,
  },
  textWrap: { flex: 1 },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
    marginBottom: 2,
  },
  sub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.textInverse,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    minHeight: 44,
    ...shadows.subtle,
  },
  ctaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.primaryDeep,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
