import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { CITY_LIST } from '@/constants/cities';
import type { UserRole } from '@/types/models';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateCity,
  normalizeText,
  normalizePhone,
} from '@/lib/validators';

interface RegisterScreenProps {
  navigation: { goBack: () => void };
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState(CITY_LIST[0]);
  const [role, setRole] = useState<UserRole>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const fullNameClean = normalizeText(fullName, 80);
    const nameErr = validateName(fullNameClean, 'Nom complet');
    if (!nameErr.ok) { setError(nameErr.message); return; }

    const phoneClean = normalizePhone(phone);
    const phoneErr = validatePhone(phoneClean);
    if (!phoneErr.ok) { setError(phoneErr.message); return; }

    const emailClean = normalizeText(email, 254).toLowerCase();
    const emailErr = validateEmail(emailClean);
    if (!emailErr.ok) { setError(emailErr.message); return; }

    const pwdErr = validatePassword(password);
    if (!pwdErr.ok) { setError(pwdErr.message); return; }

    const cityErr = validateCity(city);
    if (!cityErr.ok) { setError(cityErr.message); return; }

    setLoading(true);
    setError(null);
    const { error: err } = await signUp({
      email: emailClean,
      password,
      fullName: fullNameClean,
      phone: phoneClean,
      city,
      role,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      Alert.alert(
        'Compte créé !',
        "Un email de confirmation vous a été envoyé. Confirmez votre adresse avant de vous connecter.",
        [{ text: 'OK', onPress: navigation.goBack }],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={navigation.goBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Rejoignez la communauté Boutikplus en moins de 2 minutes
        </Text>

        <View style={styles.form}>
          <Input label="Nom complet *" value={fullName} onChangeText={setFullName} placeholder="Ex: Awa Compaoré" icon="user" autoCapitalize="words" />
          <Input label="Téléphone *" value={phone} onChangeText={setPhone} placeholder="Ex: 70 12 34 56" icon="phone" keyboardType="phone-pad" autoCorrect={false} />
          <Input label="Email *" value={email} onChangeText={setEmail} placeholder="votre@email.com" icon="mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Input label="Mot de passe *" value={password} onChangeText={setPassword} placeholder="8 caractères minimum" icon="lock" secureTextEntry error={error} />

          <Text style={styles.label}>Je suis :</Text>
          <View style={styles.roleRow}>
            <RoleChip icon="shopping-bag" label="Acheteur" desc="J'achète des produits" active={role === 'buyer'} onPress={() => setRole('buyer')} color={colors.primary} />
            <RoleChip icon="briefcase" label="Vendeur" desc="Je vends mes produits" active={role === 'seller'} onPress={() => setRole('seller')} color={colors.secondary} />
          </View>

          <Text style={styles.label}>Ville</Text>
          <View style={styles.cityGrid}>
            {CITY_LIST.slice(0, 8).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCity(c)}
                style={[styles.cityChip, city === c && styles.cityChipActive]}
              >
                <Text style={[styles.cityText, city === c && styles.cityTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>

          <Button label="Créer mon compte" onPress={handleRegister} loading={loading} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleChip({ icon, label, desc, active, onPress, color }: { icon: string; label: string; desc: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleChip, active && { borderColor: color, backgroundColor: color + '12' }]}
    >
      <Feather name={icon as any} size={22} color={active ? color : colors.textMuted} />
      <Text style={[styles.roleLabel, active && { color }]}>{label}</Text>
      <Text style={styles.roleDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  backBtn: { marginBottom: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  subtitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  form: {},
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleChip: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  roleLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  roleDesc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, textAlign: 'center' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cityChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cityText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  cityTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
});
