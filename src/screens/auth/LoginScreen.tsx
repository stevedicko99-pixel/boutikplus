import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorGuide } from '@/components/ui/ErrorGuide';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { UserRole } from '@/types/models';
import {
  validateEmail,
  validatePassword,
  normalizeText,
} from '@/lib/validators';
import { logger } from '@/lib/logger';

// APK Android hébergé sur le site (Vercel) sous un nom de fichier fixe
// « BoutikPlus.apk ». Avantage vs. URL EAS : lien permanent + nom stable.
const APK_DOWNLOAD_URL = '/download/BoutikPlus.apk';
const APK_DOWNLOAD_FILENAME = 'BoutikPlus.apk';

interface LoginScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; replace?: (screen: string, params?: any) => void; goBack?: () => void };
  route?: any;
}

/**
 * Déclenche le téléchargement de l'APK avec le bon nom de fichier.
 * - Web : utilise un <a download> (force le nom « Boutikplus+.apk »).
 * - Natif : ouvre l'URL dans le navigateur système.
 */
function downloadApk() {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = APK_DOWNLOAD_URL;
    a.download = APK_DOWNLOAD_FILENAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  Linking.openURL(APK_DOWNLOAD_URL).catch(() => {});
}

export function LoginScreen({ navigation, route }: LoginScreenProps) {
  const {
    signIn,
    profile,
    loading: authLoading,
    switchPrimaryRole,
    pendingReturnTo,
    setPendingReturnTo,
  } = useAuth();
  const { mergeAnonymousCart } = useCart();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // returnTo peut arriver :
  // 1) via route.params (appel explicite ex: Checkout → Login)
  // 2) via pendingReturnTo dans AuthContext (positionné par CheckoutScreen avant navigate)
  const paramReturnTo = (route?.params as any)?.returnTo as string | undefined;
  const paramReturnParams = (route?.params as any)?.returnParams as any;
  const activeReturnTo = paramReturnTo ?? pendingReturnTo?.screen;
  const activeReturnParams = paramReturnParams ?? pendingReturnTo?.params;

  // --- Gestion multi-rôles après connexion
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null);

  // Détecte : après login réussie (justLoggedIn), attendre chargement profil, puis :
  // - si 1 rôle : on ne fait rien (nav)
  // - si >= 2 rôles : ouvre le sélecteur de rôle actif
  // - si un returnTo est positionné (Checkout forcé), revenir dessus APRÈS le choix du rôle
  //   (ou immédiatement s'il n'y a qu'un seul rôle).
  const [returnToConsumed, setReturnToConsumed] = useState(false);
  useEffect(() => {
    if (!justLoggedIn) return;
    if (authLoading) return;
    if (!profile) return;

    const roles: UserRole[] = Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : [profile.primary_role || profile.role];

    // dédoublonner et filtrer admin/super_admin sont prioritaires
    const seen = new Set<UserRole>();
    const unique: UserRole[] = [];
    for (const r of roles) { if (!seen.has(r)) { seen.add(r); unique.push(r); } }

    setAvailableRoles(unique);

    if (unique.length > 1) {
      setShowRolePicker(true);
    }
    setJustLoggedIn(false);
  }, [profile, authLoading, justLoggedIn]);

  // Effet séparé pour la redirection returnTo :
  // - profile chargé + juste connecté + role picker fermé + returnTo présent → on navigue.
  useEffect(() => {
    if (!profile) return;
    if (returnToConsumed) return;
    if (!activeReturnTo) return;
    // Le sélecteur de rôle est-il ouvert ? Attendre sa fermeture.
    if (showRolePicker) return;
    setReturnToConsumed(true);
    // Consommer : supprimer le pending de AuthContext
    if (pendingReturnTo) setPendingReturnTo(null);
    // Rediriger
    try {
      if (navigation.replace) {
        navigation.replace(activeReturnTo, activeReturnParams);
      } else {
        navigation.navigate(activeReturnTo, activeReturnParams);
      }
    } catch (e) {
      logger.warn('[LoginScreen] navigation returnTo failed', { error: String(e) });
    }
  }, [
    profile,
    activeReturnTo,
    activeReturnParams,
    showRolePicker,
    returnToConsumed,
    pendingReturnTo,
    setPendingReturnTo,
    navigation,
  ]);

  const handleLogin = async () => {
    const emailClean = normalizeText(email, 254).toLowerCase();
    const emailErr = validateEmail(emailClean);
    if (!emailErr.ok) {
      setError(emailErr.message);
      return;
    }
    const pwdErr = validatePassword(password);
    if (!pwdErr.ok) {
      setError(pwdErr.message);
      return;
    }
    setLoading(true);
    setError(null);
    setJustLoggedIn(true); // déclenchera useEffect pour le sélecteur rôle + redirection returnTo
    const { error: err } = await signIn(emailClean, password);
    setLoading(false);
    if (err) {
      setError(err);
      setJustLoggedIn(false);
      return;
    }
    // Conserve le panier anonyme (ajouté en invité) : fusionne puis nettoie.
    try {
      await mergeAnonymousCart();
    } catch (e) {
      logger.warn('[LoginScreen] mergeAnonymousCart failed', { error: String(e) });
    }
  };

  const choisirRoleActif = async (role: UserRole) => {
    setSwitchingRole(role);
    try {
      const { error } = await switchPrimaryRole(role);
      if (error) {
        // Fallback : on continue quand même (le profile aura son ancien rôle, c'est pas bloquant)
        console.warn('[Login] switchPrimaryRole a échoué mais on continue :', error);
      }
    } finally {
      setSwitchingRole(null);
      setShowRolePicker(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B+</Text>
          </View>
          <Text style={styles.appName}>Boutikplus</Text>
          <Text style={styles.tagline}>La marketplace des jeunes du Faso</Text>
          {/* Fil de Faso — couture signature sous la marque */}
          <ThreadDivider color={colors.stitch} style={styles.brandThread} />
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            icon="lock"
            secureTextEntry
          />
          <Button label="Se connecter" onPress={handleLogin} loading={loading} fullWidth />
          <ErrorGuide
            error={error}
            onRetry={handleLogin}
            onHelp={() => navigation.navigate('HelpCenter')}
          />
        </View>

        <Pressable style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>
            Pas encore de compte ? <Text style={styles.registerBold}>Créer un compte</Text>
          </Text>
        </Pressable>

        {Platform.OS === 'web' && (
          <View style={styles.downloadCard}>
            <View style={styles.downloadIcon}>
              <Feather name="download" size={22} color={colors.textInverse} />
            </View>
            <View style={styles.downloadTextWrap}>
              <Text style={styles.downloadTitle}>Boutikplus sur Android</Text>
              <Text style={styles.downloadSub}>
                Installez l'app sur votre téléphone pour vendre et acheter partout.
              </Text>
            </View>
            <Pressable
              style={styles.downloadBtn}
              onPress={downloadApk}
              accessibilityRole="link"
              accessibilityLabel="Télécharger l'application Boutikplus pour Android"
            >
              <Feather name="arrow-down-circle" size={18} color={colors.primary} />
              <Text style={styles.downloadBtnText}>Télécharger</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 🧭 MODAL : Choisir le RÔLE ACTIF (si l'utilisateur cumule plusieurs rôles) */}
      <Modal
        visible={showRolePicker}
        onRequestClose={() => setShowRolePicker(false)}
        transparent
        animationType="fade"
      >
        <View style={styles.rolePickerBackdrop}>
          <View style={styles.rolePickerSheet}>
            <View style={styles.rolePickerHandle} />
            <Text style={styles.rolePickerTitle}>Continuer en tant que...</Text>
            <Text style={styles.rolePickerSubtitle}>
              Tu as plusieurs rôles sur Boutikplus. Choisis celui que tu veux utiliser MAINTENANT
              (tu pourras changer plus tard depuis ton profil).
            </Text>

            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {availableRoles.map((r) => {
                const meta = ROLE_META[r] ?? {
                  icon: 'user', label: r, desc: '', color: colors.text, emoji: '✨',
                };
                const busy = switchingRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => !busy && choisirRoleActif(r)}
                    style={[
                      styles.roleOption,
                      { borderColor: meta.color + '80' },
                      busy && { opacity: 0.6 },
                    ]}
                    disabled={busy}
                  >
                    <View style={[styles.roleOptionIcon, { backgroundColor: meta.color }]}>
                      <Feather name={meta.icon as any} size={22} color={colors.surface} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[styles.roleOptionLabel, { color: meta.color }]}>
                        {meta.emoji} {meta.label}
                      </Text>
                      <Text style={styles.roleOptionDesc}>{meta.desc}</Text>
                    </View>
                    <Feather
                      name={busy ? 'loader' : 'chevron-right'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Button
              label="Continuer sans changer"
              variant="secondary"
              fullWidth
              onPress={() => setShowRolePicker(false)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Métadonnées d'affichage des rôles
const ROLE_META: Record<UserRole, { icon: string; label: string; desc: string; color: string; emoji: string }> = {
  buyer:       { icon: 'shopping-bag', label: 'Acheteur',      desc: 'Découvrir et acheter des produits',              color: '#2563eb', emoji: '🛍️' },
  seller:      { icon: 'briefcase',   label: 'Vendeur',       desc: 'Gérer ma boutique et mes commandes',             color: '#db2777', emoji: '🏪' },
  driver:      { icon: 'truck',       label: 'Livreur',       desc: "Gagner de l'argent avec des livraisons 💰",       color: '#16a34a', emoji: '🚚' },
  admin:       { icon: 'shield',      label: 'Administrateur',desc: 'Gérer la plateforme et modérer',                 color: '#7c3aed', emoji: '🛡️' },
  super_admin: { icon: 'lock',        label: 'Super Admin',   desc: 'Tous les pouvoirs (configuration système)',      color: '#0f172a', emoji: '👑' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  logoWrap: { alignItems: 'center', marginTop: spacing.xxxl, marginBottom: spacing.xxxl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { fontSize: 30, fontWeight: '800', color: colors.textInverse },
  appName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  tagline: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  brandThread: { marginTop: spacing.md },
  form: { marginBottom: spacing.xl },
  registerLink: { alignItems: 'center', marginTop: spacing.xxl },
  registerText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
  },
  registerBold: { color: colors.primary, fontWeight: typography.weights.semibold },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  downloadIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadTextWrap: { flex: 1 },
  downloadTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  downloadSub: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  downloadBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },

  /* Modal role picker */
  rolePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 40, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  rolePickerSheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  rolePickerHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  rolePickerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  rolePickerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  roleOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  roleOptionDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
