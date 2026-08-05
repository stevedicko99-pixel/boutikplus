// ============================================================
// Écran « Politique de confidentialité » — Boutikplus
// Conformité RGPD / Loi burkinabè Informatique & Libertés
// ============================================================
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';

interface PrivacyScreenProps {
  navigation: { goBack: () => void };
}

const LAST_UPDATED = '3 août 2026';
const DPO_CONTACT = 'dpo@boutikplus.app (via support WhatsApp)';
const RESP_DATA = 'DICKO Christ Steve, propriétaire / responsable du traitement';

export function PrivacyScreen({ navigation }: PrivacyScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Politique de confidentialité</Text>
          <StampBadge label="RGPD" color={colors.secondaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.updateDate}>Dernière mise à jour : {LAST_UPDATED}</Text>
          <Text style={styles.intro}>
            {RESP_DATA} s'engage à protéger la vie privée des utilisateurs de Boutikplus. Cette
            politique décrit quelles données sont collectées, pourquoi, comment elles sont
            utilisées et vos droits d'accès, de rectification et d'effacement.
          </Text>
        </View>

        <Section title="1. Responsable du traitement">
          <P>{RESP_DATA}. Pour toute question RGPD/Confidentialité : {DPO_CONTACT}.</P>
        </Section>

        <Section title="2. Données collectées">
          <P>• Inscription : nom, prénom, email, numéro de téléphone, ville, mot de passe (haché).{'\n'}
            • Vendeur : nom de boutique, logo, photo de couverture, description, numéros Mobile Money (Orange/Moov), SIRET/IFU (si fournis).{'\n'}
            • Livreur : type de véhicule, plaque, numéros Mobile Money, photo recto/verso pièce d'identité (chiffrée, accès restreint admin).{'\n'}
            • Commande : adresses de livraison, preuves de paiement (captures Mobile Money).{'\n'}
            • Technique : logs anonymisés (navigation, crashs), public ID device, tokens push notification.</P>
        </Section>

        <Section title="3. Finalités">
          <P>Vos données sont utilisées pour : créer et gérer votre compte, publier des fiches produits (vendeurs), lancer des recherches, traiter les commandes et les livraisons, prévenir la fraude (analyse de preuves de paiement), envoyer des notifications push transactionnelles, améliorer le produit via des statistiques agrégées anonymes.</P>
          <P>Aucune donnée personnelle n'est vendue à des tiers.</P>
        </Section>

        <Section title="4. Partage des données">
          <P>Vos données sont hébergées chez SUPABASE INC. (USA/UE, GDPR-compliant via SCCs) et déployées en région eu-central-1. VERCEL INC. héberge la version web (région Paris sin réplicas). EXPO/EAS héberge les builds mobile sans données utilisateur persistantes.</P>
          <P>Le contenu des conversations (« Messages » entre acheteur et vendeur) est stocké uniquement pour garantir l'historique des commandes. Les équipes de modération n'y accèdent qu'en cas de litige signalé.</P>
        </Section>

        <Section title="5. Conservation">
          <P>• Profil utilisateur : pendant toute la durée de vie du compte + 3 ans après suppression.{'\n'}
            • Preuves de paiement : 10 ans (obligation comptable & antifraude).{'\n'}
            • Pièce d'identité livreur : pendant l'activité + 5 ans.{'\n'}
            • Logs anonymisés : 90 jours.</P>
        </Section>

        <Section title="6. Sécurité">
          <P>Authentification par mot de passe haché (argon2 via Supabase), sessions sécurisées (JWT + refresh), pièces d'identité livreur stockées dans un bucket Supabase privé à RLS strict (admin seul), connexion HTTPS/TLS 1.3, preuves de paiement uploadées dans bucket privé.</P>
        </Section>

        <Section title="7. Cookies & tracking">
          <P>La version web Boutikplus utilise uniquement des cookies strictement nécessaires (session). Pas de publicité ciblée, pas de pixel Meta/TikTok à ce jour.</P>
        </Section>

        <Section title="8. Vos droits">
          <P>Conformément à la loi « Informatique et Libertés » et au RGPD : droit d'accès, de rectification, d'effacement (« droit à l'oubli »), de portabilité, d'opposition, de limitation. Pour exercer : écrivez à {DPO_CONTACT} avec une copie de pièce d'identité. Réponse sous 30 jours.</P>
          <P>Vous pouvez supprimer votre compte à tout moment depuis Paramètres → Supprimer mon compte (cette option efface vos données personnelles hors obligations légales de conservation).</P>
        </Section>

        <Section title="9. Enfants / mineurs">
          <P>{PLATEFORME} est interdite aux moins de 16 ans sans autorisation parentale écrite. {RESP_DATA} se réserve le droit de demander une preuve de majorité.</P>
        </Section>

        <Section title="10. Modifications">
          <P>Toute modification substantielle est notifiée par email aux utilisateurs actifs. La version la plus récente est toujours accessible depuis Paramètres → Confidentialité.</P>
        </Section>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const PLATEFORME = 'Boutikplus';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  updateDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  intro: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 22,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 21,
  },
});
