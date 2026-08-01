import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorGuide } from '@/components/ui/ErrorGuide';
import { useAuth } from '@/context/AuthContext';
import {
  validateEmail,
  validatePassword,
  normalizeText,
} from '@/lib/validators';

// APK Android hébergé sur le site (Vercel) sous un nom de fichier fixe
// « Boutikplus+.apk ». Avantage vs. URL EAS : lien permanent + nom stable.
const APK_DOWNLOAD_URL = '/download/Boutikplus+.apk';
const APK_DOWNLOAD_FILENAME = 'Boutikplus+.apk';

interface LoginScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
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

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const { error: err } = await signIn(emailClean, password);
    setLoading(false);
    if (err) setError(err);
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
    </SafeAreaView>
  );
}

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
});
