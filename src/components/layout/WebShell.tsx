import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { colors, shadows } from '@/theme';

const MAX_WIDTH = 720;

// Sur grand écran, l'interface mobile s'étirait sur toute la largeur, laissant
// de vastes zones vides. On la centre dans un cadre de largeur maîtrisée.
export function WebShell({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width <= MAX_WIDTH) {
    return <View style={styles.full}>{children}</View>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.frame, shadows.lg]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.background },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
});
