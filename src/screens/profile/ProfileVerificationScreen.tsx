import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

type VerificationMethod = 'whatsapp' | 'instagram' | 'tiktok' | 'facebook';

interface MethodConfig {
  key: VerificationMethod;
  emoji: string;
  label: string;
  placeholder: string;
}

const METHODS: MethodConfig[] = [
  { key: 'whatsapp', emoji: '💬', label: 'WhatsApp', placeholder: '+226 70 12 34 56' },
  { key: 'instagram', emoji: '📸', label: 'Instagram', placeholder: '@ton_pseudo_instagram' },
  { key: 'tiktok', emoji: '🎵', label: 'TikTok', placeholder: '@ton_tiktok' },
  { key: 'facebook', emoji: '📘', label: 'Facebook', placeholder: 'facebook.com/tonnom' },
];

interface ProfileVerificationScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function ProfileVerificationScreen({ navigation }: ProfileVerificationScreenProps) {
  const { profile, refreshProfile } = useAuth();
  const [methodInput, setMethodInput] = useState<Record<VerificationMethod, string>>({
    whatsapp: '',
    instagram: '',
    tiktok: '',
    facebook: '',
  });
  const [expandedMethod, setExpandedMethod] = useState<VerificationMethod | null>(null);
  const [savingMethod, setSavingMethod] = useState<VerificationMethod | null>(null);

  const getCurrentValue = (method: VerificationMethod): string => {
    if (!profile?.social_links) return '';
    const links = profile.social_links as Record<string, string>;
    return links[method] ?? '';
  };

  const isMethodFilled = (method: VerificationMethod): boolean => {
    return Boolean(getCurrentValue(method));
  };

  const filledCount = METHODS.filter((m) => isMethodFilled(m.key)).length;
  const isVerified = Boolean(profile?.is_verified);

  const handleToggleExpand = (method: VerificationMethod) => {
    if (expandedMethod === method) {
      setExpandedMethod(null);
      setMethodInput((prev) => ({ ...prev, [method]: '' }));
    } else {
      setExpandedMethod(method);
      setMethodInput((prev) => ({ ...prev, [method]: getCurrentValue(method) }));
    }
  };

  const handleSaveMethod = async (method: VerificationMethod) => {
    const value = methodInput[method].trim();
    if (!value) {
      Alert.alert('Champ vide', 'Entre une valeur valide pour cette méthode.');
      return;
    }

    setSavingMethod(method);
    try {
      const { data, error } = await supabase.rpc('add_verification_method', {
        p_method: method,
        p_value: value,
      });

      if (error) {
        Alert.alert('Erreur', error.message);
        return;
      }

      const result = (data as any)?.[0] ?? data;
      if (result?.success === false) {
        Alert.alert('Erreur', result?.message ?? "Une erreur est survenue.");
        return;
      }

      await refreshProfile();

      setExpandedMethod(null);
      setMethodInput((prev) => ({ ...prev, [method]: '' }));

      if (result?.is_verified_now) {
        Alert.alert(
          '🎉 Vérifié·e !',
          'Félicitations ! Tu as obtenu ton badge officiel ✅. Il apparaît sur ton profil et tes avis !',
        );
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Une erreur inattendue est survenue.');
    } finally {
      setSavingMethod(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Devenu·e vérifié·e</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isVerified ? (
          <View style={styles.celebrationBanner}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationText}>
              Félicitations ! Tu es maintenant vérifié·e. Ton badge apparaît sur ton profil et tes avis !
            </Text>
          </View>
        ) : null}

        <Text style={styles.subtitle}>
          Ajoute au moins 2 liens sociaux pour obtenir ton badge officiel ✅
        </Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {filledCount}/2 méthodes ajoutées
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (filledCount / 2) * 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.methodsList}>
          {METHODS.map((cfg) => {
            const filled = isMethodFilled(cfg.key);
            const expanded = expandedMethod === cfg.key;
            const saving = savingMethod === cfg.key;
            const savedValue = getCurrentValue(cfg.key);

            return (
              <View key={cfg.key} style={[styles.methodCard, filled && styles.methodCardFilled]}>
                <Pressable
                  style={({ pressed }) => [styles.methodHeader, pressed && { opacity: 0.8 }]}
                  onPress={() => handleToggleExpand(cfg.key)}
                >
                  <View style={styles.methodHeaderLeft}>
                    <Text style={styles.methodEmoji}>{cfg.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodLabel}>{cfg.label}</Text>
                      {filled ? (
                        <View style={styles.filledValueRow}>
                          <View style={styles.filledBadgeWrap}>
                            <Feather name="check" size={11} color={colors.success} />
                            <Badge
                              label={savedValue.length > 24 ? savedValue.slice(0, 22) + '…' : savedValue}
                              color={colors.success}
                              bgColor="transparent"
                              size="sm"
                              style={styles.filledBadgeInline}
                            />
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.methodPlaceholder}>{cfg.placeholder}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.methodHeaderRight}>
                    {filled ? (
                      <View style={[styles.actionBtn, styles.modifyBtn]}>
                        <Text style={styles.modifyBtnText}>{expanded ? 'Fermer' : 'Modifier'}</Text>
                      </View>
                    ) : (
                      <View style={[styles.actionBtn, expanded ? styles.cancelBtn : styles.addBtn]}>
                        <Text style={[
                          styles.actionBtnText,
                          expanded ? styles.cancelBtnText : styles.addBtnText,
                        ]}>
                          {expanded ? 'Annuler' : 'Ajouter'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.methodExpanded}>
                    <View style={styles.inputRow}>
                      <Text style={styles.inputLabel}>
                        {filled ? `Modifier ton ${cfg.label}` : `Entre ton ${cfg.label}`}
                      </Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          value={methodInput[cfg.key]}
                          onChangeText={(txt) =>
                            setMethodInput((prev) => ({ ...prev, [cfg.key]: txt }))
                          }
                          placeholder={cfg.placeholder}
                          placeholderTextColor={colors.textMuted}
                          style={styles.textInput}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.saveBtn,
                        saving && { opacity: 0.6 },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleSaveMethod(cfg.key)}
                      disabled={saving}
                    >
                      <Feather name={saving ? 'loader' : 'check-circle'} size={18} color={colors.textInverse} />
                      <Text style={styles.saveBtnText}>
                        {saving ? 'Enregistrement…' : filled ? 'Mettre à jour' : 'Valider'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.footerNote}>
          <Feather name="info" size={14} color={colors.textMuted} />
          <Text style={styles.footerNoteText}>
            Aucun document officiel demandé. Vérification sociale légère conçue pour les jeunes 👌
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.success + '18',
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  celebrationEmoji: { fontSize: 28 },
  celebrationText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.success,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  progressRow: { marginBottom: spacing.lg },
  progressText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: radius.pill,
  },
  methodsList: { gap: spacing.md },
  methodCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  methodCardFilled: {
    borderColor: colors.success + '60',
    backgroundColor: colors.success + '08',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  methodHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  methodEmoji: { fontSize: 28 },
  methodLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  filledValueRow: { marginTop: 2 },
  filledBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.success + '18',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  filledBadgeInline: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  methodPlaceholder: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  methodHeaderRight: {},
  actionBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  addBtn: { backgroundColor: colors.primary },
  addBtnText: { color: colors.textInverse },
  cancelBtn: { backgroundColor: colors.surfaceAlt },
  cancelBtnText: { color: colors.textMuted },
  modifyBtn: { backgroundColor: colors.success + '18' },
  modifyBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  actionBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
  methodExpanded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  inputRow: { marginBottom: spacing.md },
  inputLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputWrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  footerNoteText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
