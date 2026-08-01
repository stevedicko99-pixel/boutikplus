import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { formatFCFA } from '@/lib/deliveryService';

interface FeeEstimateProps {
  baseRate: number;
  perKmRate: number;
  distanceKm: number;
  /** Montant total déjà calculé (prioritaire sur le recalcul) */
  total?: number;
}

/** Détail chiffré de l'estimation des frais de livraison */
export function FeeEstimate({
  baseRate,
  perKmRate,
  distanceKm,
  total,
}: FeeEstimateProps) {
  const kmCost = perKmRate * Math.max(0, distanceKm);
  const computedTotal = total ?? Math.max(baseRate, baseRate + kmCost);
  // Le tarif de base s'applique comme minimum facturé lorsque aucun coût kilométrique
  // n'est ajouté (distance nulle ou négative). Comme kmCost est clampé à 0, on détecte
  // ce cas via kmCost === 0 (la valeur baseRate + kmCost reste égale au tarif de base).
  const isMaxFloor = total == null && kmCost === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="credit-card" size={16} color={colors.primary} />
        <Text style={styles.title}>Estimation des frais</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Tarif de base</Text>
        <Text style={styles.rowValue}>{formatFCFA(baseRate)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          Distance ({Math.max(0, distanceKm).toFixed(0)} km × {formatFCFA(perKmRate)})
        </Text>
        <Text style={styles.rowValue}>{formatFCFA(kmCost)}</Text>
      </View>

      {isMaxFloor && (
        <View style={styles.noteRow}>
          <Feather name="info" size={12} color={colors.info} />
          <Text style={styles.noteText}>
            Le tarif de base s'applique (minimum facturé).
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total estimé</Text>
        <View style={styles.totalValueWrap}>
          <Text style={styles.totalValue}>{formatFCFA(computedTotal)}</Text>
          <Text style={styles.totalHint}>à payer au livreur</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    flex: 1,
  },
  rowValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  noteText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.info,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  totalValueWrap: {
    alignItems: 'flex-end',
  },
  totalValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  totalHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
});
