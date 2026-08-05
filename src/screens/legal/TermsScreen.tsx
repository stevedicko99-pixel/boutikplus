// ============================================================
// Écran « Conditions d'utilisation » (CGU/CGV) Boutikplus
// Protection juridique de la plateforme — v1.0
// Doit être accepté à l'inscription (RegisterScreen),
// et consultable a posteriori dans Settings → Conditions.
// ============================================================
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';

interface TermsScreenProps {
  navigation: { goBack: () => void };
}

const LAST_UPDATED = '3 août 2026';
const PLATEFORME = 'Boutikplus';
const PAYS = 'Burkina Faso';
const OPERATEUR = 'Boutikplus SARL (en cours d\'immatriculation)';

export function TermsScreen({ navigation }: TermsScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Conditions d'utilisation</Text>
          <StampBadge label="Légal" color={colors.primaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.updateDate}>Dernière mise à jour : {LAST_UPDATED}</Text>
          <Text style={styles.intro}>
            Bienvenue sur {PLATEFORME}. En accédant ou en utilisant nos services, vous acceptez
            sans réserve les présentes Conditions Générales d'Utilisation (CGU) et Conditions Générales
            de Vente (CGV). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la
            plateforme.
          </Text>
        </View>

        <Section title="1. Objet & éditeur">
          <P>{PLATEFORME} est une place de marché digitale dédiée au Burkina Faso qui met en relation des vendeurs, des acheteurs et des livreurs indépendants. Les services sont opérés par {OPERATEUR} domicilié au {PAYS}.</P>
        </Section>

        <Section title="2. Compte utilisateur & rôles">
          <P>Vous devez créer un compte pour accéder aux fonctionnalités avancées (vendre, commander, livrer). Un même compte peut cumuler plusieurs rôles : Acheteur, Vendeur, Livreur. Vous êtes responsable de la confidentialité de vos identifiants.</P>
          <P>Les inscriptions sont individuelles ; les comptes partagés ou robots sont interdits. {PLATEFORME} se réserve le droit de suspendre tout compte en cas d'usage frauduleux.</P>
        </Section>

        <Section title="3. Obligations des vendeurs">
          <P>Les vendeurs déclarent l'exactitude des fiches produits (prix, disponibilité, description, photos). Toute contrebande, produit contrefait, dangereux ou interdit par la législation burkinabè est passible de radiation immédiate et de poursuites.</P>
          <P>{PLATEFORME} facture aux vendeurs une commission sur chaque vente, clairement affichée au moment du dépôt. Les montants sont versés au vendeur après confirmation de livraison et délai de rétractation.</P>
        </Section>

        <Section title="4. Obligations des acheteurs & paiements">
          <P>Les prix sont indiqués en Franc CFA (XOF). Le paiement est effectué par transfert Mobile Money (Orange Money, Moov Money) aux coordonnées du VENDEUR affichées à l'écran de paiement. {PLATEFORME} n'est pas un établissement de paiement et ne détient pas de fonds — le transfert est direct entre l'acheteur et le vendeur.</P>
          <P>L'acheteur doit impérativement téléverser la capture d'écran (preuve) du transfert Mobile Money. Sans preuve, la commande reste en attente et n'est pas honorée.</P>
          <P>La validation du paiement est INTERACTIVE : le VENDEUR confirme manuellement avoir reçu les fonds. {PLATEFORME} ne valide pas automatiquement les paiements.</P>
        </Section>

        <Section title="5. Livraison — option séparée">
          <P>La livraison est une OPTION SÉPARÉE et n'est JAMAIS incluse par défaut dans le prix du produit. Les frais de livraison sont calculés séparément, payés directement au livreur indépendant désigné via la plateforme, et affichés clairement avant validation de la commande.</P>
          <P>Les délais de livraison donnés sont indicatifs. {PLATEFORME} n'est pas responsable des retards dus au livreur, aux intempéries ou à l'indisponibilité de l'acheteur.</P>
        </Section>

        <Section title="6. Livreurs indépendants">
          <P>Les livreurs sont des prestataires indépendants et non des salariés de {PLATEFORME}. Ils déclarent justifier d'une assurance responsabilité civile et d'un moyen de transport conforme. {PLATEFORME} ne couvre pas les dommages corporels, matériels ou les pertes de marchandise.</P>
          <P>Un livreur doit soumettre une pièce d'identité recto/verso avant d'être activé sur la plateforme (voir formulaire d'inscription livreur).</P>
        </Section>

        <Section title="7. Propriété intellectuelle">
          <P>Vous conservez vos droits sur le contenu que vous déposez (photos, textes), mais accordez à {PLATEFORME} une licence mondiale, non exclusive et gratuite pour afficher, diffuser et promouvoir ce contenu dans le cadre du fonctionnement de la marketplace.</P>
          <P>Les marques, logos, noms « {PLATEFORME} » et « Fil de Faso » sont protégés.</P>
        </Section>

        <Section title="8. Limitation de responsabilité">
          <P>{PLATEFORME} fournit un service « tel quel » sans garantie expresse ou implicite. La plateforme s'engage à des moyens raisonnables de disponibilité mais ne peut être tenue pour responsable des interruptions, pannes, pertes de données ou indirectes (chiffre d'affaires manqué, préjudice commercial).</P>
          <P>{PLATEFORME} intervient en tant qu'intermédiaire technique. En cas de litige entre vendeur et acheteur, la médiation est gratuite et facultative ; le recours aux juridictions compétentes du Burkina Faso reste ouvert.</P>
        </Section>

        <Section title="9. Résiliation & suspension">
          <P>Vous pouvez supprimer votre compte à tout moment depuis Paramètres. {PLATEFORME} peut suspendre ou résilier un compte sans préavis en cas de violation des présentes CGU, de fraude, ou de plainte multiple confirmée.</P>
        </Section>

        <Section title="10. Modifications & droit applicable">
          <P>Les CGU peuvent être modifiées à tout moment ; la nouvelle version est notifiée par email et appliquée 7 jours après publication. Le droit applicable est celui du {PAYS}. Tout litige relève de la compétence exclusive des juridictions de Ouagadougou.</P>
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
