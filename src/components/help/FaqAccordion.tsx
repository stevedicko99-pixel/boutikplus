import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import type { HelpFaqSection } from '@/constants/helpContent';

// Active LayoutAnimation sur Android (désactivé par défaut)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FaqAccordionProps {
  section: HelpFaqSection;
}

/**
 * Accordéon FAQ : une section dépliable contenant ses questions/réponses.
 * Animation native via LayoutAnimation (pas de lib additionnelle).
 */
export function FaqAccordion({ section }: FaqAccordionProps) {
  const [open, setOpen] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const toggleItem = (q: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenItem((cur) => (cur === q ? null : q));
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleSection}>
        <View style={[styles.iconWrap, { backgroundColor: section.color + '18' }]}>
          <Feather name={section.icon as any} size={18} color={section.color} />
        </View>
        <Text style={styles.title}>{section.title}</Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={styles.items}>
          {section.items.map((item) => (
            <View key={item.q} style={styles.item}>
              <Pressable
                style={styles.itemHeader}
                onPress={() => toggleItem(item.q)}
              >
                <Text style={styles.question}>{item.q}</Text>
                <Feather
                  name={openItem === item.q ? 'minus' : 'plus'}
                  size={14}
                  color={colors.primary}
                />
              </Pressable>
              {openItem === item.q ? (
                <Text style={styles.answer}>{item.a}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  items: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  question: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  answer: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginLeft: 0,
  },
});
