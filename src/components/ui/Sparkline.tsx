import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

interface SparklineProps {
  /** Tableau de valeurs (0..∞). Les hauteurs sont normalisées entre la min et la max. */
  data: number[];
  /** Couleur des barres. */
  color?: string;
  /** Hauteur totale du graphique. */
  height?: number;
  /** Espacement entre les barres. */
  gap?: number;
  /** Style de conteneur additionnel. */
  style?: any;
}

/**
 * Mini histogramme sparkline — 7 barres verticales représentant
 * l'évolution d'un indicateur sur la période (ex: ventes des 7 derniers jours).
 * Perçu comme 10x plus utile qu'un simple chiffre par les utilisateurs.
 */
export function Sparkline({
  data,
  color = colors.success,
  height = 28,
  gap = 3,
  style,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);

  return (
    <View style={[styles.row, { height, gap }, style]}>
      {data.map((v, i) => {
        const h = Math.max(2, ((v - min) / range) * height);
        const isLast = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              backgroundColor: isLast ? color : color + '70',
              borderRadius: 2,
              opacity: isLast ? 1 : 0.55 + (i / data.length) * 0.45,
            }}
          />
        );
      })}
    </View>
  );
}

/** Génère 7 données pseudo-aléatoires à partir d'un seed (stable par render). */
export function mockSparkline7(seed: number, base = 10, variance = 20): number[] {
  const rand = (n: number) => {
    // xorshift mini PRNG — stable si seed fixe
    let x = seed * 9301 + n * 49297 + 233280;
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    return (x & 0xffff) / 0xffff;
  };
  return Array.from({ length: 7 }, (_, i) => Math.round(base + rand(i) * variance));
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    marginTop: spacing.xs,
  },
});
