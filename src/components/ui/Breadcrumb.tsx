import { memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
  /** Si true → le texte est en gras (état actif). */
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Affiche ou masque l'icône "home" pour le premier élément. */
  showHomeIcon?: boolean;
  style?: any;
}

/**
 * Fil d'Ariane (breadcrumb) : affiche un chemin Home > Catégorie > Produit.
 * - Utilisable sur ProductDetail / ShopDetail pour donner un repère spatial
 *   aux jeunes utilisateurs qui arrivent par URL de partage.
 * - Chaque item non-actif est pressable (back-nav possible).
 */
function BreadcrumbComponent({
  items,
  showHomeIcon = true,
  style,
}: BreadcrumbProps) {
  if (!items || items.length === 0) return null;
  return (
    <View style={[styles.wrap, style]}>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        const isFirst = i === 0;
        return (
          <View key={i} style={styles.itemRow}>
            <Pressable
              onPress={it.onPress}
              disabled={!it.onPress || isLast}
              hitSlop={6}
              style={styles.itemPress}
              accessibilityRole={it.onPress ? 'button' : 'text'}
            >
              {isFirst && showHomeIcon ? (
                <Feather name="home" size={14} color={it.active ? colors.primary : colors.textMuted} style={styles.homeIcon} />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  it.active ? styles.labelActive : null,
                  isLast ? styles.labelLast : null,
                ]}
              >
                {it.label}
              </Text>
            </Pressable>
            {!isLast ? (
              <Feather
                name="chevron-right"
                size={14}
                color={colors.textMuted}
                style={styles.sep}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export const Breadcrumb = memo(BreadcrumbComponent);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  homeIcon: {
    marginRight: 4,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    maxWidth: 140,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  labelLast: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  sep: {
    marginHorizontal: spacing.xs,
  },
});
