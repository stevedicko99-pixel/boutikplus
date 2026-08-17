// TrustBand — preuve sociale chiffrée en une bande compacte sous le hero.
// Rétention : un visiteur hésitant voit immédiatement l'échelle de la communauté.
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '@/theme';

interface Stat {
  value: string;
  label: string;
}

// Chiffres réels au lancement — WILLARIS PRIME BF est le premier vendeur.
// Messaging : "1 vendeur, soyez le prochain à gagner 10x plus".
const STATS: Stat[] = [
  { value: '1', label: 'Vendeur pionnier' },
  { value: '6', label: 'Produits' },
  { value: 'Ouaga', label: 'Ville' },
  { value: '5.0★', label: 'Note moyenne' },
];

function TrustBandComponent() {
  return (
    <View style={styles.wrap}>
      {STATS.map((s, i) => (
        <View key={i} style={[styles.item, i < STATS.length - 1 && styles.divider]}>
          <Text style={styles.value}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export const TrustBand = memo(TrustBandComponent);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { borderRightWidth: 1, borderRightColor: colors.borderLight },
  value: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.extrabold,
    color: colors.accentDeep,
    letterSpacing: typography.letterSpacings.tight,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacings.wide,
  },
});
