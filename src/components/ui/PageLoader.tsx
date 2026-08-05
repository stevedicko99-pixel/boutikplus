// PageLoader — wrapper pleine page du BrandLoader.
// À utiliser à la place de <LoadingSpinner /> sur les écrans de boot
// (chargement initial, transition auth, etc.). Pour les listes longues,
// préférer les skeletons ; pour les spinners inline de boutons, garder
// LoadingSpinner.
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { BrandLoader } from './BrandLoader';

interface PageLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: boolean;
}

function PageLoader({ size = 'md', label = true }: PageLoaderProps) {
  return (
    <View style={styles.page}>
      <BrandLoader size={size} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { PageLoader };
