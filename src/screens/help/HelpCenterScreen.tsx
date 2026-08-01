import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Input } from '@/components/ui/Input';
import { FaqAccordion } from '@/components/help/FaqAccordion';
import {
  HELP_FAQ_SECTIONS,
  HELP_TUTORIALS,
  SUPPORT_WHATSAPP_URL,
  type HelpFaqSection,
} from '@/constants/helpContent';
import { openExternalLink } from '@/lib/safeLinking';

interface HelpCenterScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

export function HelpCenterScreen({ navigation }: HelpCenterScreenProps) {
  const [query, setQuery] = useState('');

  // Filtre local sur les questions/réponses (pas de backend)
  const filteredSections: HelpFaqSection[] = useMemo(() => {
    if (!query.trim()) return HELP_FAQ_SECTIONS;
    const q = query.toLowerCase();
    return HELP_FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  const handleSupport = async () => {
    await openExternalLink(SUPPORT_WHATSAPP_URL);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Aide & support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recherche */}
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une question..."
          icon="search"
        />

        {/* Tutoriels pas à pas */}
        <Text style={styles.sectionTitle}>Tutoriels pas à pas</Text>
        <View style={styles.tutorialsGrid}>
          {HELP_TUTORIALS.map((tuto) => (
            <Pressable
              key={tuto.id}
              style={styles.tutoCard}
              onPress={() => navigation.navigate('HelpTutorial', { tutorialId: tuto.id })}
            >
              <View style={[styles.tutoIcon, { backgroundColor: tuto.color + '18' }]}>
                <Feather name={tuto.icon as any} size={22} color={tuto.color} />
              </View>
              <Text style={styles.tutoTitle} numberOfLines={2}>
                {tuto.title}
              </Text>
              <Text style={styles.tutoSteps}>{tuto.steps.length} étapes</Text>
            </Pressable>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {filteredSections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Aucun résultat pour « {query} »
            </Text>
          </View>
        ) : (
          filteredSections.map((section) => (
            <FaqAccordion key={section.id} section={section} />
          ))
        )}

        {/* Support contact */}
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Feather name="message-circle" size={24} color="#25D366" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Besoin d'aide humaine ?</Text>
            <Text style={styles.supportDesc}>
              Discutez avec notre équipe sur WhatsApp. Réponse rapide.
            </Text>
          </View>
          <Pressable style={styles.supportBtn} onPress={handleSupport}>
            <Feather name="chevron-right" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  tutorialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tutoCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tutoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tutoTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  tutoSteps: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: '#25D36630',
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D36618',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  supportDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  supportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
