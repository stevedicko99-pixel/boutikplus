// ============================================================
// Écran « À propos » — Identité officielle Boutikplus
// Affiche les informations de propriétaire vérifiables
// (infos publiques uniquement — pas de données sensibles)
// ============================================================
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';
import {
  OWNER_IDENTITY,
  OWNER_IDENTITY_HASH,
  APP_SIGNATURE_HASH,
  FINGERPRINTS,
  verifyCrossFingerprints,
  OWNERSHIP_SOURCES,
} from '@/lib/ownership';

interface AboutScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export function AboutScreen({ navigation }: AboutScreenProps) {
  const crossFp = verifyCrossFingerprints();
  const isOfficial = crossFp.all;

  const copyText = async (label: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié', `${label} copié dans le presse-papier.`);
  };

  const openWhatsApp = () => {
    const url = `https://wa.me/${OWNER_IDENTITY.primaryContact.numberDigits}` +
      `?text=${encodeURIComponent("Bonjour, j'ai une question concernant la propriété de Boutikplus.")}`;
    // Lien sécurisé via allow-list (déjà contrôlé par safeLinking)
    window?.open?.(url, '_blank');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>À propos de Boutikplus</Text>
          <StampBadge label="À propos" color={colors.primaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>
      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Badge officiel / non officiel */}
        <View style={[styles.officialBadge, { backgroundColor: isOfficial ? '#E6F4EA' : '#FDECEA' }]}>
          <Feather
            name={isOfficial ? 'shield' : 'alert-triangle'}
            size={20}
            color={isOfficial ? colors.success : colors.danger}
          />
          <Text style={[styles.officialText, { color: isOfficial ? colors.success : colors.danger }]}>
            {isOfficial ? 'Instance officielle Boutikplus' : 'Source de propriété non vérifiée'}
          </Text>
        </View>

        {/* Propriétaire légitime */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="user" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Propriétaire légitime</Text>
              <Text style={styles.cardValue}>{OWNER_IDENTITY.fullName}</Text>
              <Text style={styles.cardSub}>
                {OWNER_IDENTITY.legalCountry} · Depuis {OWNER_IDENTITY.appCreationDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact vérifiable */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact officiel vérifiable</Text>
          <Pressable
            style={styles.contactRow}
            onPress={openWhatsApp}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#25D366' + '20' }]}>
              <Feather name="message-circle" size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>WhatsApp propriétaire</Text>
              <Text style={styles.contactValue}>{OWNER_IDENTITY.primaryContact.number}</Text>
              <Text style={styles.contactHint}>Appuyez pour contacter</Text>
            </View>
            <Feather name="external-link" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.copyLink}
            onPress={() => copyText('Numéro WhatsApp', OWNER_IDENTITY.primaryContact.number)}
          >
            <Feather name="copy" size={14} color={colors.primary} />
            <Text style={styles.copyText}>Copier le numéro</Text>
          </Pressable>
        </View>

        {/* Identifiants de vérification publiques */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identifiants de propriété (publics)</Text>

          <FingerprintRow
            label="Identité SHA-256"
            value={OWNER_IDENTITY_HASH}
            short={true}
            onCopy={() => copyText('Hash d\'identité', OWNER_IDENTITY_HASH)}
          />
          <FingerprintRow
            label="Signature app SHA-256"
            value={APP_SIGNATURE_HASH}
            short={true}
            onCopy={() => copyText('Signature app', APP_SIGNATURE_HASH)}
          />
          <FingerprintRow
            label="Empreinte croisée FP1"
            value={FINGERPRINTS.fp1}
            status={crossFp.fp1}
            onCopy={() => copyText('FP1', FINGERPRINTS.fp1)}
          />
          <FingerprintRow
            label="Empreinte croisée FP2"
            value={FINGERPRINTS.fp2}
            status={crossFp.fp2}
            onCopy={() => copyText('FP2', FINGERPRINTS.fp2)}
          />
          <FingerprintRow
            label="Empreinte MD5 (FP3)"
            value={FINGERPRINTS.fp3}
            status={crossFp.fp3}
            onCopy={() => copyText('FP3', FINGERPRINTS.fp3)}
          />
        </View>

        {/* Accès vérification propriétaire */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Administration</Text>
          <Pressable
            style={({ pressed }) => [styles.adminRow, pressed && { opacity: 0.6 }]}
            onPress={() => navigation.navigate('OwnershipVerification')}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary + '18' }]}>
              <Feather name="lock" size={20} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminTitle}>Vérification de propriété</Text>
              <Text style={styles.adminSub}>Accès réservé au propriétaire ou autorités</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Sources / infos légales */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dépôts officiels</Text>
          <Text style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>GitHub : </Text>
            <Text style={styles.sourceValue}>
              {OWNERSHIP_SOURCES.githubRepo.replace('https://', '')}
            </Text>
          </Text>
          <Text style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Expo projet : </Text>
            <Text style={styles.sourceValue}>@chriss1137s-team / boutikplus</Text>
          </Text>
          <Text style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Supabase : </Text>
            <Text style={styles.sourceValue}>{OWNERSHIP_SOURCES.supabaseProject} ({OWNERSHIP_SOURCES.supabaseRegion})</Text>
          </Text>
          <Text style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>Vercel : </Text>
            <Text style={styles.sourceValue}>{OWNERSHIP_SOURCES.vercelProject}</Text>
          </Text>
        </View>

        <Text style={styles.copyright}>
          © 2026 Boutikplus. Application créée par {OWNER_IDENTITY.fullName}.{'\n'}
          Toute revente ou copie non autorisée est strictement interdite.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FingerprintRow({ label, value, short, status, onCopy }: {
  label: string;
  value: string;
  short?: boolean;
  status?: boolean;
  onCopy?: () => void;
}) {
  const display = short
    ? value.slice(0, 10) + '…' + value.slice(-10)
    : value;
  return (
    <View style={styles.fpRow}>
      <View style={styles.fpLabels}>
        <Text style={styles.fpLabel}>{label}</Text>
        <Text style={styles.fpValue} numberOfLines={1} ellipsizeMode="middle">{display}</Text>
      </View>
      <View style={styles.fpActions}>
        {typeof status === 'boolean' && (
          <Feather
            name={status ? 'check-circle' : 'x-circle'}
            size={16}
            color={status ? colors.success : colors.danger}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <Pressable hitSlop={8} onPress={onCopy}>
          <Feather name="copy" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
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
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  officialText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  cardValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  cardSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  contactLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  contactValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  contactHint: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  copyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  copyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  fpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  fpLabels: { flex: 1, minWidth: 0 },
  fpLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
  },
  fpValue: {
    fontFamily: 'Courier New',
    fontSize: typography.sizes.small,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  fpActions: { flexDirection: 'row', alignItems: 'center' },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  adminTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  adminSub: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sourceRow: {
    paddingVertical: spacing.xs,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
  },
  sourceLabel: { color: colors.textMuted },
  sourceValue: { color: colors.text, fontWeight: typography.weights.semibold },
  copyright: {
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
