import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { HELP_TUTORIALS } from '@/constants/helpContent';

interface HelpTutorialScreenProps {
  navigation: { goBack: () => void };
  route: { params: { tutorialId: string } };
}

export function HelpTutorialScreen({ navigation, route }: HelpTutorialScreenProps) {
  const tutorial = HELP_TUTORIALS.find((t) => t.id === route.params.tutorialId);

  if (!tutorial) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={10}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Tutoriel introuvable</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Tutoriel</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête du tutoriel */}
        <View style={styles.introCard}>
          <View style={[styles.introIcon, { backgroundColor: tutorial.color + '18' }]}>
            <Feather name={tutorial.icon as any} size={32} color={tutorial.color} />
          </View>
          <Text style={styles.introTitle}>{tutorial.title}</Text>
          <Text style={styles.introSubtitle}>{tutorial.subtitle}</Text>
        </View>

        {/* Timeline des étapes */}
        <View style={styles.timeline}>
          {tutorial.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepLeft}>
                <View style={[styles.stepBadge, { backgroundColor: tutorial.color }]}>
                  <Feather
                    name={(step.icon as any) ?? 'check'}
                    size={16}
                    color={colors.textInverse}
                  />
                </View>
                {i < tutorial.steps.length - 1 ? (
                  <View style={styles.stepLine} />
                ) : null}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {i + 1}. {step.title}
                </Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bouton de fin */}
        <Pressable style={styles.doneBtn} onPress={navigation.goBack}>
          <Feather name="check-circle" size={18} color={colors.textInverse} />
          <Text style={styles.doneText}>J'ai compris</Text>
        </Pressable>
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
  introCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  introTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  introSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
  timeline: {
    paddingLeft: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepLeft: {
    alignItems: 'center',
    width: 40,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    minHeight: 24,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  doneText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
