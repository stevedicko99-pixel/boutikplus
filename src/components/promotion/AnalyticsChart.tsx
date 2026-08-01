import { StyleSheet, View, Text } from 'react-native';
import { colors, typography, spacing, radius } from '@/theme';
import type { CampaignAnalyticsSummary } from '@/types/models';

interface AnalyticsChartProps {
  /** Synthèse analytique contenant la série temporelle */
  data: CampaignAnalyticsSummary;
  /** Hauteur du graphique en px */
  height?: number;
}

/**
 * Graphique à barres groupées (vues / clics / conversions) sur la période.
 * Rendu 100% React Native (pas de dépendance de charting) pour rester léger
 * et compatible web. Inspiré du pattern graphique de SellerStatsScreen.
 */
export function AnalyticsChart({ data, height = 180 }: AnalyticsChartProps) {
  const { timeseries } = data;

  // Valeur max pour mettre à l'échelle les barres
  const maxValue = Math.max(
    1,
    ...timeseries.map((d) => Math.max(d.views, d.clicks, d.conversions)),
  );

  // Formate l'étiquette de date (JJ/MM)
  const formatDay = (isoDate: string) => {
    const d = new Date(isoDate);
    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1,
    ).padStart(2, '0')}`;
  };

  // Affiche une étiquette sur 2 pour éviter la surcharge
  const showLabel = (i: number) =>
    timeseries.length <= 7 || i % Math.ceil(timeseries.length / 7) === 0;

  return (
    <View style={styles.container}>
      {/* Légende */}
      <View style={styles.legend}>
        <LegendItem color={colors.info} label="Vues" value={data.total_views} />
        <LegendItem
          color={colors.primary}
          label="Clics"
          value={data.total_clicks}
        />
        <LegendItem
          color={colors.success}
          label="Ventes"
          value={data.total_conversions}
        />
      </View>

      {/* Graphique */}
      <View style={[styles.chart, { height }]}>
        {timeseries.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>Aucune donnée sur cette période</Text>
          </View>
        ) : (
          timeseries.map((day, i) => (
            <View key={day.date} style={styles.barGroup}>
              <View style={styles.barsRow}>
                <Bar
                  value={day.views}
                  max={maxValue}
                  color={colors.info}
                  height={height - 28}
                />
                <Bar
                  value={day.clicks}
                  max={maxValue}
                  color={colors.primary}
                  height={height - 28}
                />
                <Bar
                  value={day.conversions}
                  max={maxValue}
                  color={colors.success}
                  height={height - 28}
                />
              </View>
              {showLabel(i) ? (
                <Text style={styles.dayLabel}>{formatDay(day.date)}</Text>
              ) : (
                <Text style={styles.dayLabel}> </Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>
        {label} · <Text style={styles.legendValue}>{value}</Text>
      </Text>
    </View>
  );
}

function Bar({
  value,
  max,
  color,
  height,
}: {
  value: number;
  max: number;
  color: string;
  height: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const barHeight = Math.max(value > 0 ? 3 : 0, (pct / 100) * height);
  return (
    <View style={styles.barTrack}>
      <View
        style={{
          width: 6,
          height: barHeight,
          backgroundColor: color,
          borderRadius: 2,
          minHeight: value > 0 ? 3 : 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  legendValue: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: '100%',
  },
  barTrack: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dayLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
});
