import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: boolean | string;
}

function PageLoader({ size = 'md', label = true }: PageLoaderProps) {
  const spinnerSize = { sm: 24, md: 32, lg: 40 }[size];
  const text = typeof label === 'string' ? label : 'Chargement de la page';
  return (
    <View style={styles.page} accessibilityRole="progressbar" accessibilityLabel={text}>
      <View style={styles.mark} accessibilityElementsHidden><Text style={styles.markText}>B+</Text></View>
      <LoadingSpinner size={spinnerSize} label={label ? text : ''} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 280, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  mark: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.textInverse, fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.bold },
  spinner: { flex: 0, paddingTop: spacing.md, paddingBottom: 0 },
});

export { PageLoader };
