// ============================================================
// Écran Vérification de propriété — ACCÈS PROTÉGÉ PAR MOT DE PASSE
// ============================================================
// Seul le propriétaire légitime (DICKO Christ Steve) ou les
// autorités compétentes disposant du mot de passe peuvent
// accéder à cet écran. Il affiche :
//   - La clé de vérification du propriétaire
//   - Le rapport complet d'ownership
//   - Les marqueurs stéganographiques dispersés
//   - Un bouton pour générer un certificat de propriété
//   - Un bouton pour ACTIVER LES DROITS ADMIN du compte connecté
// ============================================================
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  OWNER_IDENTITY,
  OWNER_IDENTITY_HASH,
  APP_SIGNATURE_HASH,
  FINGERPRINTS,
  OWNER_VERIFICATION_KEY,
  STEG_MARKERS,
  getOwnershipReport,
  verifyAccessPassword,
  OWNERSHIP_SOURCES,
} from '@/lib/ownership';

interface OwnershipVerificationScreenProps {
  navigation: { goBack: () => void };
}

export function OwnershipVerificationScreen({ navigation }: OwnershipVerificationScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const report = getOwnershipReport();

  useEffect(() => {
    if (isVerified) {
      // Rafraîchir le profil à l'ouverture de l'écran vérifié
      refreshProfile().catch(() => {});
    }
  }, [isVerified]);

  const handleVerify = async () => {
    if (!password.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir le mot de passe d\'accès propriétaire.');
      return;
    }
    setIsChecking(true);
    const ok = await verifyAccessPassword(password.trim());
    setIsChecking(false);
    if (ok) {
      setIsVerified(true);
    } else {
      Alert.alert(
        'Accès refusé',
        'Mot de passe incorrect. En cas d\'oubli, contactez le support WhatsApp : ' +
        OWNER_IDENTITY.primaryContact.number,
      );
    }
  };

  const copy = async (label: string, text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copié', `${label} copié.`);
  };

  const handlePromoteAdmin = async () => {
    if (!profile) {
      Alert.alert('Erreur', 'Aucun profil connecté. Veuillez d\'abord vous connecter.');
      return;
    }
    setIsPromoting(true);
    try {
      const { data, error } = await supabase.rpc('promote_self_to_admin', {
        p_verification_key: OWNER_VERIFICATION_KEY,
      });
      if (error) {
        Alert.alert(
          'Fonction indisponible',
          'La RPC promote_self_to_admin n\'est pas encore déployée sur Supabase.\n\n' +
          '👉 Veuillez exécuter le fichier supabase/rpc.sql dans l\'éditeur SQL Supabase Dashboard.\n\n' +
          'Détails: ' + error.message,
        );
        return;
      }
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.success) {
        await refreshProfile();
        Alert.alert(
          '✅ Droits administrateur activés',
          result.message + '\n\n👉 Allez dans l\'onglet Profil — le bouton « Panneau d\'administration » est maintenant visible.',
        );
      } else {
        Alert.alert('Échec', result?.message || 'Clé de vérification invalide.');
      }
    } catch (e: any) {
      Alert.alert('Erreur RPC', e?.message || String(e));
    } finally {
      setIsPromoting(false);
    }
  };

  // ------------ Écran de connexion ------------
  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Vérification propriétaire</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.lockScroll}>
          <View style={styles.lockIconWrap}>
            <Feather name="lock" size={48} color={colors.secondary} />
          </View>
          <Text style={styles.lockTitle}>Accès réservé</Text>
          <Text style={styles.lockSub}>
            Cette section contient les preuves sensibles de propriété de Boutikplus.{'\n'}
            Elle est accessible uniquement à :{'\n'}
            {'\u2022 '}DICKO Christ Steve (propriétaire légitime){'\n'}
            {'\u2022 '}Les autorités compétentes (justice, huissiers)
          </Text>
          <Text style={styles.fieldLabel}>Mot de passe de vérification</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleVerify}
          />
          <Pressable
            style={({ pressed }) => [
              styles.verifyBtn,
              isChecking && { opacity: 0.6 },
              pressed && !isChecking && { opacity: 0.8 },
            ]}
            onPress={handleVerify}
            disabled={isChecking}
          >
            <Feather name="shield" size={18} color={colors.textInverse} />
            <Text style={styles.verifyText}>
              {isChecking ? 'Vérification…' : 'Vérifier l\'accès'}
            </Text>
          </Pressable>
          <Text style={styles.footnote}>
            Mot de passe perdu ?{'\n'}Contactez : {OWNER_IDENTITY.primaryContact.number}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ------------ Écran vérifié ------------
  const { checks } = report;
  const allOk = checks.identityHash && checks.appSignature && checks.crossFp.all;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Rapport de propriété</Text>
        <Pressable onPress={() => setIsVerified(false)} hitSlop={10}>
          <Feather name="lock" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Statut global */}
        <View style={[
          styles.summaryCard,
          { backgroundColor: allOk ? '#E6F4EA' : '#FDECEA' }
        ]}>
          <Feather
            name={allOk ? 'award' : 'alert-octagon'}
            size={28}
            color={allOk ? colors.success : colors.danger}
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={[
              styles.summaryTitle,
              { color: allOk ? colors.success : colors.danger }
            ]}>
              {allOk ? 'Propriété 100% vérifiée' : 'Preuves d\'ownership incohérentes'}
            </Text>
            <Text style={[
              styles.summarySub,
              { color: allOk ? colors.success : colors.danger }
            ]}>
              Rapport généré le {new Date(report.generatedAt).toLocaleString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Clé de vérification propriétaire (SENSIBLE) */}
        <View style={[styles.card, { borderColor: colors.secondary, borderWidth: 1.5 }]}>
          <View style={styles.dangerHeader}>
            <Feather name="eye-off" size={20} color={colors.secondary} />
            <Text style={styles.dangerTitle}>Clé de vérification privée (CONFIDENTIELLE)</Text>
          </View>
          <Text style={styles.warnText}>
            Cette clé prouve irréfutablement la propriété. Ne la communiquez JAMAIS à un tiers.
          </Text>
          <View style={styles.keyBox}>
            <Text style={styles.keyText} selectable>{OWNER_VERIFICATION_KEY}</Text>
          </View>
          <Pressable
            style={styles.copyRow}
            onPress={() => copy('Clé de vérification', OWNER_VERIFICATION_KEY)}
          >
            <Feather name="copy" size={14} color={colors.secondary} />
            <Text style={[styles.copyRowText, { color: colors.secondary }]}>
              Copier la clé
            </Text>
          </Pressable>
        </View>

        {/* ======== ACTIVATION DES DROITS ADMINISTRATEUR ======== */}
        <View style={[
          styles.card,
          {
            borderWidth: 2,
            borderColor: profile?.role === 'admin' ? colors.success : colors.primary,
            backgroundColor: profile?.role === 'admin' ? '#E6F4EA' : colors.primary + '10',
          }
        ]}>
          <View style={styles.dangerHeader}>
            <Feather
              name={profile?.role === 'admin' ? 'shield' : 'unlock'}
              size={20}
              color={profile?.role === 'admin' ? colors.success : colors.primary}
            />
            <Text style={[
              styles.dangerTitle,
              { color: profile?.role === 'admin' ? colors.success : colors.primary }
            ]}>
              Droits administrateur Boutikplus
            </Text>
          </View>

          <View style={styles.roleStatusRow}>
            <Text style={styles.roleStatusLabel}>Statut actuel du compte :</Text>
            <View style={[
              styles.roleBadge,
              { backgroundColor: (
                profile?.role === 'admin' ? colors.success :
                profile?.role === 'seller' ? colors.secondary : colors.textMuted
              ) }
            ]}>
              <Text style={styles.roleBadgeText}>
                { !profile ? 'Non connecté' :
                  profile.role === 'admin' ? '👑 ADMINISTRATEUR' :
                  profile.role === 'seller' ? '💼 VENDEUR' : '🛒 ACHETEUR' }
              </Text>
            </View>
          </View>

          { profile?.role !== 'admin' ? (
            <>
              <Text style={styles.adminDesc}>
                En tant que propriétaire légitime vérifié (DICKO Christ Steve),
                vous pouvez activer les droits administrateur pour ce compte
                EN UN CLIC. La clé de vérification ci-dessus est utilisée
                automatiquement pour authentifier la requête.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.promoteBtn,
                  isPromoting && { opacity: 0.6 },
                  pressed && !isPromoting && { opacity: 0.85 },
                ]}
                onPress={handlePromoteAdmin}
                disabled={isPromoting}
              >
                <Feather name="award" size={20} color={colors.textInverse} />
                <Text style={styles.promoteText}>
                  { isPromoting
                    ? 'Activation en cours…'
                    : '🚀 Activer mes droits administrateur Boutikplus' }
                </Text>
              </Pressable>
              <Text style={styles.adminHint}>
                Après activation, rendez-vous dans l'onglet <Text style={{ fontWeight: '700' }}>👤 Profil</Text> —
                un bouton « Panneau d'administration » apparaîtra automatiquement.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.adminDesc, { color: colors.success }]}>
                ✅ Félicitations {profile?.full_name || ''} ! Vos droits administrateur sont actifs.
                Vous pouvez gérer la plateforme entière via le Panneau d'administration.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.adminGoBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  // Naviguer direct vers AdminDashboard. La navigation est un type any,
                  // donc on contourne via navigation dispatch ou string route name.
                  const nav: any = navigation;
                  if (nav && typeof nav.navigate === 'function') {
                    nav.navigate('AdminDashboard');
                  } else {
                    Alert.alert(
                      'Admin prêt',
                      'Retournez sur l\'onglet Profil → Panneau d\'administration.',
                    );
                  }
                }}
              >
                <Feather name="layout" size={18} color={colors.textInverse} />
                <Text style={styles.promoteText}>Ouvrir le Panneau d'administration →</Text>
              </Pressable>
            </>
          ) }
        </View>
        {/* ======== FIN ACTIVATION ADMIN ======== */}

        {/* Rapport d'identité */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Identité complète</Text>
          <ReportLine label="Nom complet" value={OWNER_IDENTITY.fullName} />
          <ReportLine label="Contact vérifié" value={OWNER_IDENTITY.primaryContact.number} />
          <ReportLine label="Pays légal" value={OWNER_IDENTITY.legalCountry} />
          <ReportLine label="Application" value={OWNER_IDENTITY.appName} />
          <ReportLine label="Date de création" value={OWNER_IDENTITY.appCreationDate} />
        </View>

        {/* Vérifications techniques */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vérifications cryptographiques</Text>
          <CheckRow
            label="Hash identité SHA-256"
            ok={checks.identityHash}
            value={OWNER_IDENTITY_HASH}
            onCopy={() => copy('Hash identité', OWNER_IDENTITY_HASH)}
          />
          <CheckRow
            label="Signature application SHA-256"
            ok={checks.appSignature}
            value={APP_SIGNATURE_HASH}
            onCopy={() => copy('Signature app', APP_SIGNATURE_HASH)}
          />
          <CheckRow
            label="Empreinte croisée FP1"
            ok={checks.crossFp.fp1}
            value={FINGERPRINTS.fp1}
            onCopy={() => copy('FP1', FINGERPRINTS.fp1)}
          />
          <CheckRow
            label="Empreinte croisée FP2"
            ok={checks.crossFp.fp2}
            value={FINGERPRINTS.fp2}
            onCopy={() => copy('FP2', FINGERPRINTS.fp2)}
          />
          <CheckRow
            label="Empreinte croisée FP3 (MD5)"
            ok={checks.crossFp.fp3}
            value={FINGERPRINTS.fp3}
            onCopy={() => copy('FP3', FINGERPRINTS.fp3)}
          />
        </View>

        {/* Marqueurs stéganographiques */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Marqueurs stéganographiques dispersés</Text>
          <Text style={styles.warnText}>
            Ces marqueurs sont répartis dans des fichiers clés du code source.
            Si le fichier ownership.ts est supprimé, ils permettent quand-même de
            prouver la propriété par comparaison.
          </Text>
          {STEG_MARKERS.map((m, i) => (
            <View key={i} style={styles.stegRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stegLoc}>{m.location}</Text>
                <Text style={styles.stegMark}>{m.marker}</Text>
                <Text style={styles.stegValue}>{m.value}</Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => copy(`Marqueur ${m.marker}`, m.value)}
              >
                <Feather name="copy" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Sources des dépôts officiels */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Traces distantes vérifiables</Text>
          <SourceLine label="GitHub (code source)" value={OWNERSHIP_SOURCES.githubRepo} />
          <SourceLine label="Compte GitHub propriétaire" value={OWNERSHIP_SOURCES.ownerGitHubAccount} />
          <SourceLine label="Compte Expo propriétaire" value={OWNERSHIP_SOURCES.ownerExpoAccount} />
          <SourceLine label="Expo projet" value="@chriss1137s-team / boutikplus" />
          <SourceLine label="Vercel (web)" value={OWNERSHIP_SOURCES.vercelProject} />
          <SourceLine label="Supabase ID" value={OWNERSHIP_SOURCES.supabaseProject} />
          <SourceLine label="Support vérifiable" value={OWNERSHIP_SOURCES.primarySupport} />
        </View>

        {/* Certificat */}
        <Pressable
          style={styles.certBtn}
          onPress={() => {
            const lines = [
              `=== CERTIFICAT DE PROPRIÉTÉ BOUTIKPLUS ===`,
              `Généré le: ${report.generatedAt}`,
              ``,
              `PROPRIÉTAIRE: ${OWNER_IDENTITY.fullName}`,
              `CONTACT: ${OWNER_IDENTITY.primaryContact.number}`,
              `PAYS: ${OWNER_IDENTITY.legalCountry}`,
              `APP: ${OWNER_IDENTITY.appName} (créée ${OWNER_IDENTITY.appCreationDate})`,
              ``,
              `PREUVES:`,
              `  * OWNER_IDENTITY_HASH = ${OWNER_IDENTITY_HASH}`,
              `  * APP_SIGNATURE_HASH = ${APP_SIGNATURE_HASH}`,
              `  * FP1 = ${FINGERPRINTS.fp1}`,
              `  * FP2 = ${FINGERPRINTS.fp2}`,
              `  * FP3 = ${FINGERPRINTS.fp3}`,
              `  * OWNER_VERIFICATION_KEY = ${OWNER_VERIFICATION_KEY}`,
              ``,
              `STATUT VERIFICATIONS: ${allOk ? 'VÉRIFIÉ' : 'ERREUR'}`,
              `  identityHash: ${checks.identityHash}`,
              `  appSignature: ${checks.appSignature}`,
              `  crossFp.fp1: ${checks.crossFp.fp1}`,
              `  crossFp.fp2: ${checks.crossFp.fp2}`,
              `  crossFp.fp3: ${checks.crossFp.fp3}`,
              ``,
              `Ce document constitue une preuve électronique de propriété.`,
            ].join('\n');
            copy('Certificat de propriété', lines);
          }}
        >
          <Feather name="file-text" size={18} color={colors.textInverse} />
          <Text style={styles.certText}>Générer le certificat de propriété</Text>
        </Pressable>

        <Text style={styles.footerNote}>
          En cas de litige, présentez ce rapport avec la clé de vérification
          et une capture de cet écran aux autorités compétentes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Composants helpers ---
function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportLine}>
      <Text style={styles.reportLabel}>{label}</Text>
      <Text style={styles.reportValue}>{value}</Text>
    </View>
  );
}

function CheckRow({ label, ok, value, onCopy }: {
  label: string; ok: boolean; value: string; onCopy: () => void;
}) {
  return (
    <View style={styles.checkRow}>
      <Feather
        name={ok ? 'check-circle' : 'x-circle'}
        size={18}
        color={ok ? colors.success : colors.danger}
      />
      <View style={{ flex: 1, marginLeft: spacing.sm, minWidth: 0 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        <Text style={styles.checkValue} numberOfLines={1} ellipsizeMode="middle">
          {value.slice(0, 8)}…{value.slice(-8)}
        </Text>
      </View>
      <Pressable hitSlop={8} onPress={onCopy}>
        <Feather name="copy" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function SourceLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sourceLine}>
      <Text style={styles.sourceLabel}>{label}</Text>
      <Text style={styles.sourceValue} selectable>{value}</Text>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: { padding: spacing.lg, paddingTop: 0 },

  // Lock screen
  lockScroll: { padding: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' },
  lockIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.secondary + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  lockTitle: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm,
  },
  lockSub: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
  },
  fieldLabel: {
    alignSelf: 'stretch', fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small, fontWeight: typography.weights.bold,
    color: colors.text, marginBottom: spacing.sm,
  },
  input: {
    alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body, color: colors.text, marginBottom: spacing.lg,
  },
  verifyBtn: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.secondary, paddingVertical: spacing.md,
    borderRadius: radius.lg, marginBottom: spacing.lg,
  },
  verifyText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold, color: colors.textInverse,
  },
  footnote: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
    textAlign: 'center', lineHeight: 18,
  },

  // Verified screen
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  summaryTitle: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
  },
  summarySub: {
    fontFamily: typography.fontFamily, fontSize: 12, marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderLight,
  },
  dangerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm,
  },
  dangerTitle: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold, color: colors.secondary,
  },
  warnText: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
    lineHeight: 18, marginBottom: spacing.md,
  },
  keyBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  keyText: {
    fontFamily: 'Courier New', fontSize: typography.sizes.small,
    fontWeight: '700', color: colors.secondary, textAlign: 'center',
    letterSpacing: 1,
  },
  copyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingTop: spacing.sm,
  },
  copyRowText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  cardTitle: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.md,
  },
  reportLine: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  reportLabel: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted,
  },
  reportValue: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold, color: colors.text,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.sm,
  },
  checkLabel: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
  },
  checkValue: {
    fontFamily: 'Courier New', fontSize: 12, color: colors.text, fontWeight: '600',
  },
  stegRow: {
    flexDirection: 'row', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.sm,
  },
  stegLoc: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
  },
  stegMark: {
    fontFamily: 'Courier New', fontSize: 12, color: colors.secondary, marginTop: 2,
  },
  stegValue: {
    fontFamily: 'Courier New', fontSize: 12, color: colors.text, marginTop: 2,
  },
  sourceLine: {
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  sourceLabel: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
  },
  sourceValue: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold, color: colors.text, marginTop: 2,
  },
  certBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.lg,
    marginTop: spacing.sm, marginBottom: spacing.sm,
  },
  certText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold, color: colors.textInverse,
  },
  footerNote: {
    textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.xxl,
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted, lineHeight: 18,
  },

  // Admin activation card
  roleStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.sm,
  },
  roleStatusLabel: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold, color: colors.text,
  },
  roleBadge: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  roleBadgeText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold, color: colors.textInverse,
  },
  adminDesc: {
    fontFamily: typography.fontFamily, fontSize: 13, color: colors.textMuted,
    lineHeight: 20, marginBottom: spacing.md,
  },
  adminHint: {
    fontFamily: typography.fontFamily, fontSize: 12, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.sm, lineHeight: 18,
  },
  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, borderRadius: radius.lg,
  },
  adminGoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success, paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, borderRadius: radius.lg,
  },
  promoteText: {
    fontFamily: typography.fontFamily, fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold, color: colors.textInverse,
  },
});
