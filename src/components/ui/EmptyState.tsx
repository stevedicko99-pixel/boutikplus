// EmptyState — état vide signature « Fil de Faso ».
// Cercle d'icône cerclé d'un "fil" stitch (double bord), ThreadDivider sous
// le titre pour ancrer la composition. Hint en StampBadge quand il est fourni.
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { ThreadDivider } from './ThreadDivider';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
  /** Badge contextuel en haut à gauche (ex: "Suggestion IA", "Conseil") */
  hintLabel?: string;
  /** Couleur du hint (défaut = primary) */
  hintColor?: string;
  action?: React.ReactNode;
  /** Style additionnel du conteneur (permet inline sans flex:1 dans un scroll) */
  style?: any;
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  hintLabel,
  hintColor = colors.primary,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {hintLabel ? (
        <View
          style={[
            styles.hintBadge,
            {
              backgroundColor: hintColor + '14',
              borderColor: hintColor + '30',
            },
          ]}
        >
          <Text style={[styles.hintText, { color: hintColor }]}>{hintLabel}</Text>
        </View>
      ) : null}
      {/* Cercle d'icône cerclé d'un "fil" stitch (double bord superposé) */}
      <View style={styles.iconHalo}>
        <View style={styles.iconWrap}>
          <Feather name={icon} size={32} color={colors.primaryDeep} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <ThreadDivider color={colors.stitch} style={styles.divider} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  hintBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  hintText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacings.wide,
  },
  // Halo externe stitch (le "fil" qui dépasse)
  iconHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.stitch,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.fani,
  },
  // Cercle interne primaryDeep (double impression de fil)
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: typography.letterSpacings.tight,
    marginBottom: spacing.xs,
  },
  divider: {
    marginBottom: spacing.sm,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
