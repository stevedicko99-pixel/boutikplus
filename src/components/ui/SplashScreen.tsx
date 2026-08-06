import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { colors, typography, spacing, radius } from '@/theme';

// Écran d'attente affiché pendant la restauration de session. Un simple
// indicateur sur fond vide donnait l'impression d'une page blanche interminable
// au premier chargement web.
export function SplashScreen({ message = 'Chargement de la marketplace…' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>B+</Text>
      </View>
      <Text style={styles.brand}>Boutikplus</Text>
      <Text style={styles.tagline}>La marketplace des jeunes du Faso</Text>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.extrabold,
    color: colors.textInverse,
  },
  brand: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  tagline: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  spinner: { marginTop: spacing.xxl },
  message: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
