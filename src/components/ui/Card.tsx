// Card — carte signature « Fil de Faso ».
// Coins pincés (haut-gauche plus rond qu'ailleurs, évoque un pli de tissu),
// ombre teintée corail en couches (shadows.fani) au lieu d'une bordure dure.
// Variant `hero` pour les en-têtes premium (ombre plus profonde, accent deep).
import { StyleSheet, View, Platform, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  variant?: 'default' | 'hero';
}

export function Card({ children, style, padded = true, variant = 'default' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        variant === 'hero' ? styles.hero : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    // Coins pincés « Fani » : haut-gauche plus rond (pli de tissu)
    borderTopLeftRadius: 22,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 22,
    borderWidth: 0,
    ...shadows.fani,
  },
  hero: {
    ...shadows.hero,
  },
  padded: { padding: spacing.lg },
});
