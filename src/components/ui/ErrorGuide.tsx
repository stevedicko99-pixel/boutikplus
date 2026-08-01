// ErrorGuide — affichage clair d'une erreur pour les utilisateurs non techniques.
// Au lieu d'un simple texte rouge, on montre : icône + titre + explication + action.
// Utilisé sur les écrans de connexion, inscription, paiement, etc.

import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { toFriendlyError, type FriendlyError } from '@/lib/errorMessages';

interface ErrorGuideProps {
  /** Message d'erreur brut (technique) ouFriendlyError déjà résolu. */
  error: string | null | undefined | FriendlyError;
  /** Appelé quand l'utilisateur appuie sur « Réessayer ». Optionnel. */
  onRetry?: () => void;
  /** Appelé pour ouvrir l'aide / le support. Optionnel. */
  onHelp?: () => void;
  /** Compact = affiché en ligne (pour les formulaires). Par défaut false (carte). */
  compact?: boolean;
}

export function ErrorGuide({ error, onRetry, onHelp, compact = false }: ErrorGuideProps) {
  if (!error) return null;

  const friendly: FriendlyError =
    typeof error === 'string' ? toFriendlyError(error) : error;

  if (compact) {
    // Version compacte : une ligne rouge avec icône, pour les petits espaces.
    return (
      <View style={styles.compactWrap}>
        <Feather name={friendly.icon as any} size={14} color={colors.danger} />
        <Text style={styles.compactText}>{friendly.title}. {friendly.action}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather name={friendly.icon as any} size={24} color={colors.danger} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{friendly.title}</Text>
        <Text style={styles.message}>{friendly.message}</Text>
        <Text style={styles.action}>{friendly.action}</Text>
        {(onRetry || onHelp) && (
          <View style={styles.actions}>
            {onRetry && (
              <Pressable style={styles.retryBtn} onPress={onRetry}>
                <Feather name="refresh-cw" size={14} color={colors.surface} />
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            )}
            {onHelp && (
              <Pressable style={styles.helpBtn} onPress={onHelp}>
                <Feather name="help-circle" size={14} color={colors.primary} />
                <Text style={styles.helpText}>Aide</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#F8D7DA',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FADBD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.danger,
    marginBottom: 2,
  },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  action: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  retryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  helpText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  compactWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: '#F8D7DA',
    gap: spacing.xs,
  },
  compactText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.danger,
    flexShrink: 1,
  },
});
