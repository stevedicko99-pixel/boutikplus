import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { notifyReferralBonus } from '@/lib/notifications';

interface ReferralProgramScreenProps {
  navigation: { goBack: () => void };
}

export function ReferralProgramScreen({ navigation }: ReferralProgramScreenProps) {
  const { profile } = useAuth();
  const [inviteCode, setInviteCode] = useState('');

  const handleInvite = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Code requis', 'Entrez le numéro de téléphone du vendeur à inviter.');
      return;
    }
    // Simulation d'envoi d'invitation
    Alert.alert(
      'Invitation envoyée 🎉',
      `Vous avez invité ${inviteCode}. Dès qu'il crée une boutique active, vous recevrez une mise en avant gratuite !`,
    );
    setInviteCode('');
  };

  const handleCopyReferralCode = () => {
    const code = profile?.id ?? 'votre-code';
    Alert.alert('Code copié !', `Votre code de parrainage: ${code}\n\nPartagez-le avec d'autres vendeurs !`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Programme de parrainage</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Feather name="gift" size={36} color={colors.textInverse} />
          </View>
          <Text style={styles.heroTitle}>Gagnez en invitant des vendeurs !</Text>
          <Text style={styles.heroDesc}>
            Pour chaque vendeur qui crée une boutique active grâce à votre invitation, vous recevez une mise en avant gratuite sur la plateforme.
          </Text>
        </View>

        {/* Votre code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeValue}>{profile?.id ?? 'votre-code'}</Text>
            <Pressable style={styles.copyBtn} onPress={handleCopyReferralCode}>
              <Feather name="copy" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.codeHint}>Partagez ce code avec d'autres vendeurs</Text>
        </View>

        {/* Inviter un vendeur */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Inviter un vendeur</Text>
          <Text style={styles.inviteDesc}>Entrez le numéro de téléphone du vendeur que vous souhaitez inviter</Text>

          <View style={styles.inputRow}>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Ex: 70123456"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.inviteBtn} onPress={handleInvite}>
              <Feather name="send" size={18} color={colors.textInverse} />
            </Pressable>
          </View>

          <Text style={styles.orDivider}>— OU —</Text>

          <View style={styles.socialInviteRow}>
            <SocialInviteOption icon="message-circle" label="WhatsApp" color="#25D366" bgColor="#E8F5E9" />
            <SocialInviteOption icon="facebook" label="Facebook" color="#1877F2" bgColor="#E3F2FD" />
            <SocialInviteOption icon="share-2" label="Copier" color={colors.primary} bgColor={colors.primary + '18'} />
          </View>
        </View>

        {/* Comment ça marche */}
        <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
        <View style={styles.stepsContainer}>
          <Step number="1" title="Partagez votre code" description="Envoyez votre code de parrainage à d'autres vendeurs" />
          <Step number="2" title="Ils créent leur boutique" description="Les vendeurs s'inscrivent et activent leur boutique avec votre code" />
          <Step number="3" title="Gagnez votre récompense" description="Vous recevez une mise en avant gratuite sur la page d'accueil" />
        </View>

        {/* Statistiques */}
        <View style={styles.statsRow}>
          <StatBox value="0" label="Invitations envoyées" color={colors.primary} />
          <StatBox value="0" label="Filleules actives" color={colors.success} />
          <StatBox value="0" label="Mises en avant gagnées" color={colors.secondary} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SocialInviteOption({ icon, label, color, bgColor }: { icon: string; label: string; color: string; bgColor: string }) {
  return (
    <Pressable style={[styles.socialOption, { backgroundColor: bgColor }]}>
      <Feather name={icon as any} size={24} color={color} />
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{description}</Text>
      </View>
    </View>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: color + '18' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: 'center',
  },
  heroDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  codeLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  codeValue: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  inviteTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inviteDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inviteBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orDivider: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  socialInviteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  socialOption: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  socialLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  stepTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  stepDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },
});
