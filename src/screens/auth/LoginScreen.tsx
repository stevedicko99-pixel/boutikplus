import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import {
  validateEmail,
  validatePassword,
  normalizeText,
} from '@/lib/validators';

interface LoginScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
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
            error={error}
          />
          <Button label="Se connecter" onPress={handleLogin} loading={loading} fullWidth />
        </View>

        <Pressable style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerText}>
            Pas encore de compte ? <Text style={styles.registerBold}>Créer un compte</Text>
          </Text>
        </Pressable>
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
});
