import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { BrandLoader } from './BrandLoader';

interface PageLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: boolean | string;
}

/**
 * PageLoader — écran de chargement pleine page "premium".
 * Délègue à <BrandLoader> (orbe corail respirant + points fil + wordmark
 * shimmer + fil de couture dessiné) pour une expérience de marque cohérente
 * et haut de gamme sur toutes les pages.
 */
function PageLoader({ size = 'md', label = true }: PageLoaderProps) {
  const labelText = typeof label === 'string' ? label : 'Chargement de la page';
  return (
    <View style={styles.page} accessibilityRole="progressbar" accessibilityLabel={labelText}>
      <BrandLoader size={size} label={label !== false} fullPage={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 280,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});

export { PageLoader };
