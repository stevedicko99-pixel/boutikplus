// HowItWorks — 3 étapes "Comment ça marche" pour les visiteurs non connectés.
// Rétention : déculpe la friction de démarrage ("c'est trop dur pour moi").
import { memo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface Step {
  num: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  { num: '1', icon: 'user-plus', title: 'Crée ton compte', desc: 'Numéro WhatsApp, c\'est tout. Aucun KYC lourd.' },
  { num: '2', icon: 'plus-square', title: 'Ajoute tes produits', desc: 'Photo, vidéo, prix. La boutique est prête en 2 min.' },
  { num: '3', icon: 'trending-up', title: 'Vends & développe', desc: 'Reçois tes paiements localement, partage sur les réseaux.' },
];

interface HowItWorksProps {
  onStart: () => void;
}

function HowItWorksComponent({ onStart }: HowItWorksProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
      <Text style={styles.sectionSub}>3 étapes, c'est tout.</Text>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{s.num}</Text>
              </View>
              {i < STEPS.length - 1 ? <View style={styles.stepConnector} /> : null}
            </View>
            <View style={styles.stepBody}>
              <View style={styles.stepHeader}>
                <Feather name={s.icon} size={16} color={colors.primary} />
                <Text style={styles.stepTitle}>{s.title}</Text>
              </View>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA final "Comment ça marche" */}
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="Commencer gratuitement maintenant"
      >
        <LinearGradient
          colors={colors.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.ctaGradient]}
        />
        <Text style={styles.ctaText}>Commencer gratuitement</Text>
        <Feather name="arrow-right" size={16} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

export const HowItWorks = memo(HowItWorksComponent);

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    letterSpacing: typography.letterSpacings.tight,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  steps: { gap: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md },
  stepLeft: { alignItems: 'center', width: 28, paddingTop: 2 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.fani,
  },
  stepNumText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
  },
  stepConnector: { flex: 1, width: 2, backgroundColor: colors.surfaceDeep, marginTop: 4 },
  stepBody: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  stepTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  stepDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    minHeight: 52,
    ...shadows.fani,
  },
  ctaGradient: { borderRadius: radius.md },
  ctaText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    letterSpacing: typography.letterSpacings.tight,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
});
