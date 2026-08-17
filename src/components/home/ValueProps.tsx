// ValueProps — "Pourquoi Boutikplus ?" : 3 cartes à valeur pour visiteurs non connectés.
// Rétention : justifie le "pourquoi rester" au-delà du simple catalogue.
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface ValueProp {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  accent: string;
}

const PROPS: ValueProp[] = [
  {
    icon: 'camera',
    title: 'Studio photo intégré',
    desc: 'Capture et retouche tes produits directement dans l\'app. Pas besoin d\'outils externes.',
    accent: colors.primary,
  },
  {
    icon: 'share-2',
    title: 'Partage sur WhatsApp & TikTok',
    desc: 'Génère un lien boutique en 1 clic. Tes clients commandent depuis leurs réseaux habituels.',
    accent: colors.success,
  },
  {
    icon: 'credit-card',
    title: 'Paiement local sécurisé',
    desc: 'Orange Money, Moov Money, paiement à la livraison. Tout est tracé et protégé.',
    accent: colors.info,
  },
];

function ValuePropsComponent() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pourquoi Boutikplus ?</Text>
      <Text style={styles.sectionSub}>Tout ce qu'il te faut pour vendre, simplement.</Text>
      <View style={styles.grid}>
        {PROPS.map((p, i) => (
          <View key={i} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: p.accent + '1A' }]}>
              <Feather name={p.icon} size={20} color={p.accent} />
            </View>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardDesc}>{p.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const ValueProps = memo(ValuePropsComponent);

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
  grid: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    ...shadows.subtle,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    marginBottom: 2,
  },
  cardDesc: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
