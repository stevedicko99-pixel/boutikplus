import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorGuide } from '@/components/ui/ErrorGuide';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
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
  SUPPORTED_COUNTRY_CODES,
} from '@/lib/validators';

interface RegisterScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string, params?: any) => void };
}

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  // 🇧🇫 BURKINA FASO (+226) par défaut — public cible principal
  const [countryDial, setCountryDial] = useState<string>('+226');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState(CITY_LIST[0]);
  // Multi-rôles : un utilisateur peut cumuler ACHETEUR + VENDEUR + LIVREUR
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['buyer']);
  // Erreurs par champ (validation inline)
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    password?: string | null;
    city?: string | null;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCountry = SUPPORTED_COUNTRY_CODES.find((c) => c.dial === countryDial)
    ?? SUPPORTED_COUNTRY_CODES[0];

  const toggleRole = (r: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(r)
        ? prev.length === 1
          ? prev // empêcher de tout décocher (garder au moins 1)
          : prev.filter((x) => x !== r)
        : [...prev, r],
    );
  };

  const handleRegister = async () => {
    const fullNameClean = normalizeText(fullName, 80);
    const nameErr = validateName(fullNameClean, 'Nom complet');
    const phoneClean = normalizePhone(phone, countryDial);
    const phoneErr = validatePhone(phone, countryDial);
    const emailClean = normalizeText(email, 254).toLowerCase();
    const emailErr = validateEmail(emailClean);
    const pwdErr = validatePassword(password);
    const cityErr = validateCity(city);

    // Validation inline : on affiche chaque erreur sous son champ.
    const newFieldErrors = {
      fullName: nameErr.ok ? undefined : nameErr.message,
      phone: phoneErr.ok ? undefined : phoneErr.message,
      email: emailErr.ok ? undefined : emailErr.message,
      password: pwdErr.ok ? undefined : pwdErr.message,
      city: cityErr.ok ? undefined : cityErr.message,
    };
    setFieldErrors(newFieldErrors);

    if (!nameErr.ok || !phoneErr.ok || !emailErr.ok || !pwdErr.ok || !cityErr.ok) {
      setError('Veuillez corriger les champs en rouge ci-dessous.');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('Choisissez au moins un rôle (acheteur, vendeur ou livreur).');
      return;
    }

    setLoading(true);
    setError(null);

    // Rôle actif / principal :
    // - si livreur seul → driver
    // - si mixte avec acheteur → acheteur par défaut (on suggère de switcher après login)
    const primaryRole: UserRole =
      selectedRoles.length === 1 ? selectedRoles[0]
        : selectedRoles.includes('buyer') ? 'buyer'
        : selectedRoles[0];

    const { error: err } = await signUp({
      email: emailClean,
      password,
      fullName: fullNameClean,
      phone: phoneClean,
      city,
      roles: selectedRoles,
      primaryRole,
    });
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      Alert.alert(
        'Compte créé ! 🎉',
        selectedRoles.includes('driver')
          ? "Un email de confirmation vous a été envoyé. Après connexion, complétez votre profil LIVREUR (véhicule + tarifs) pour commencer à GAGNER DE L'ARGENT !"
          : "Un email de confirmation vous a été envoyé. Confirmez votre adresse avant de vous connecter.",
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
        {/* Fil de Faso — couture signature sous le titre */}
        <ThreadDivider color={colors.stitch} style={styles.titleThread} />

        <View style={styles.form}>
          <Input
            label="Nom complet *"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            placeholder="Ex: Awa Compaoré"
            icon="user"
            autoCapitalize="words"
            error={fieldErrors.fullName}
          />

          {/* 📞 Téléphone AVEC sélecteur pays (dropdown modal) */}
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.inputLabel}>Téléphone *</Text>
            <View style={styles.phoneRow}>
              {/* Bouton indicatif pays (ouvre le picker) */}
              <Pressable
                onPress={() => setShowCountryPicker(true)}
                style={styles.countryButton}
                accessibilityRole="button"
                accessibilityLabel={`Indicatif pays actuel ${selectedCountry.dial}, appuyez pour changer`}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryDial}>{selectedCountry.dial}</Text>
                <Feather name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>

              {/* Champ numéro — placeholder adapté au pays sélectionné */}
              <View style={{ flex: 1 }}>
                <Input
                  label={null}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  placeholder={selectedCountry.hint}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  hideTopLabel
                  error={fieldErrors.phone}
                />
              </View>
            </View>
          </View>

          <Input
            label="Email *"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="votre@email.com"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email}
          />
          <Input
            label="Mot de passe *"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="8 caractères minimum"
            icon="lock"
            secureTextEntry
            error={fieldErrors.password}
          />

          {/* 🔥 CARTE PROMO LIVREUR : opportunité pour les JEUNES de GAGNER DE L'ARGENT */}
          <Pressable
            onPress={() => {
              // Clic sur la bannière : coche automatiquement "Livreur"
              setSelectedRoles((prev) => (prev.includes('driver') ? prev : [...prev, 'driver']));
            }}
            style={[
              styles.driverPromoCard,
              selectedRoles.includes('driver') && { borderColor: colors.success, backgroundColor: colors.success + '10' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Devenir livreur et gagner de l'argent"
          >
            <View style={styles.driverPromoIcon}>
              <Feather name="truck" size={28} color={colors.surface} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.driverPromoTitle}>🚚 GAGNE DE L'ARGENT : Deviens LIVREUR</Text>
              <Text style={styles.driverPromoSubtitle}>
                💵 Revenus flexibles à chaque livraison que tu effectues
              </Text>
              <Text style={styles.driverPromoSubtitle}>
                ⏰ Horaires LIBRES — parfait pour les jeunes / étudiants
              </Text>
              <Text style={styles.driverPromoSubtitle}>
                💳 Paiement Mobile Money (Orange / Moov) chaque semaine
              </Text>
            </View>
            <Feather
              name={selectedRoles.includes('driver') ? 'check-square' : 'square'}
              size={24}
              color={selectedRoles.includes('driver') ? colors.success : colors.textMuted}
            />
          </Pressable>

          <Text style={styles.label}>Je suis (vous pouvez cumuler plusieurs rôles) :</Text>
          <View style={styles.roleGrid}>
            <RoleToggleCard
              icon="shopping-bag"
              label="Acheteur"
              desc="Je découvre et j'achète"
              active={selectedRoles.includes('buyer')}
              onPress={() => toggleRole('buyer')}
              color={colors.primary}
              emoji="🛍️"
            />
            <RoleToggleCard
              icon="briefcase"
              label="Vendeur"
              desc="Je vends mes produits"
              active={selectedRoles.includes('seller')}
              onPress={() => toggleRole('seller')}
              color={colors.secondary}
              emoji="🏪"
            />
            <RoleToggleCard
              icon="truck"
              label="Livreur"
              desc="Je livre et je GAGNE 💰"
              active={selectedRoles.includes('driver')}
              onPress={() => toggleRole('driver')}
              color={colors.success}
              emoji="🚚"
              highlight
            />
          </View>

          {selectedRoles.includes('driver') && (
            <View style={styles.driverInfoBox}>
              <Feather name="info" size={18} color={colors.success} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.driverInfoText}>
                  <Text style={{ fontWeight: typography.weights.bold, color: colors.success }}>
                    Super choix !{' '}
                  </Text>
                  Après inscription, tu compléteras ton profil livreur (type de véhicule, tarifs, numéro Mobile Money)
                  pour commencer à recevoir des missions. Tu peux être{' '}
                  <Text style={{ fontWeight: typography.weights.bold }}>
                    à la fois ACHETEUR, VENDEUR et LIVREUR — 1 compte, 3 façons d'utiliser la plateforme !
                  </Text>
                </Text>
              </View>
            </View>
          )}

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
          <ErrorGuide
            error={error}
            onRetry={handleRegister}
            onHelp={() => navigation.navigate('HelpCenter')}
          />
        </View>
      </ScrollView>

      {/* 🗺️ Modal picker pays */}
      <Modal
        visible={showCountryPicker}
        onRequestClose={() => setShowCountryPicker(false)}
        transparent
        animationType="slide"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choisissez votre pays</Text>
            <Text style={styles.modalSubtitle}>Sélectionnez votre indicatif téléphonique</Text>
            <FlatList
              data={SUPPORTED_COUNTRY_CODES as readonly { dial: string; iso: string; flag: string; label: string; hint: string }[]}
              keyExtractor={(item) => `${item.iso}-${item.dial}`}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountryDial(item.dial);
                    setShowCountryPicker(false);
                    setPhone('');
                  }}
                  style={[
                    styles.countryItem,
                    item.dial === countryDial && { backgroundColor: colors.primary + '14', borderColor: colors.primary },
                  ]}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countryItemName}>{item.label}</Text>
                    <Text style={styles.countryItemHint}>{item.hint}</Text>
                  </View>
                  <Text style={styles.countryItemDial}>{item.dial}</Text>
                  {item.dial === countryDial && (
                    <Feather name="check-circle" size={20} color={colors.primary} style={{ marginLeft: spacing.sm }} />
                  )}
                </Pressable>
              )}
            />
            <Button
              label="Fermer"
              onPress={() => setShowCountryPicker(false)}
              variant="secondary"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RoleToggleCard({
  icon, label, desc, active, onPress, color, emoji, highlight,
}: {
  icon: string;
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
  color: string;
  emoji?: string;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roleCard,
        active && { borderColor: color, backgroundColor: color + '12' },
        highlight && !active && { borderColor: color + '66' },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20 }}>{emoji ?? '✨'}</Text>
        <Feather
          name={active ? 'check-square' : 'square'}
          size={20}
          color={active ? color : colors.textMuted}
        />
      </View>
      <View style={{ marginTop: spacing.sm, alignItems: 'flex-start' }}>
        <Feather name={icon as any} size={22} color={active ? color : colors.textMuted} />
      </View>
      <Text style={[styles.roleCardLabel, active && { color }]}>{label}</Text>
      <Text style={styles.roleCardDesc}>{desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  backBtn: { marginBottom: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  subtitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  titleThread: { alignSelf: 'center', marginBottom: spacing.xl },
  form: {},
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  inputLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.sm },

  /* Cartes multi-rôles (toggle avec case à cocher) */
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  roleCard: {
    width: '48%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  roleCardLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  roleCardDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* Bannière PROMO LIVREUR */
  driverPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success + '80',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginVertical: spacing.lg,
    backgroundColor: colors.success + '08',
  },
  driverPromoIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPromoTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  driverPromoSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    marginTop: 3,
    lineHeight: 16,
  },

  /* Info box quand livreur sélectionné */
  driverInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success + '50',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  driverInfoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    lineHeight: 18,
  },

  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cityChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cityText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  cityTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },

  /* Téléphone */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    minWidth: 110,
  },
  countryFlag: { fontSize: 22 },
  countryDial: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },

  /* Modal pays */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 48, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginVertical: 2,
  },
  countryItemFlag: { fontSize: 26 },
  countryItemName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  countryItemHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  countryItemDial: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
