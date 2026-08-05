import { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { colors, typography, spacing, radius } from '@/theme';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
  barColor?: string;
  valueFormatter?: (value: number) => string;
  periodLabel?: string;
  prevPeriodTotal?: number;
  showComparison?: boolean;
}

function BarChartComponent({
  data,
  title,
  height = 200,
  barColor = colors.primary,
  valueFormatter = (v) => `${v}`,
  periodLabel = 'Cette période',
  prevPeriodTotal,
  showComparison = false,
}: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(280);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  const bars = useMemo(
    () =>
      data.map((item, i) => ({
        ...item,
        heightPct: (item.value / maxValue) * 100,
        isActive: activeIndex === i,
      })),
    [data, maxValue, activeIndex],
  );

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const pctChange = useMemo(() => {
    if (!prevPeriodTotal || prevPeriodTotal === 0) return null;
    return ((total - prevPeriodTotal) / prevPeriodTotal) * 100;
  }, [total, prevPeriodTotal]);

  const barWidth = useMemo(() => {
    if (data.length === 0) return 40;
    const available = chartWidth - spacing.xl * 2;
    const gap = spacing.sm;
    const cols = data.length;
    return Math.max(12, Math.min(60, (available - gap * (cols - 1)) / cols));
  }, [chartWidth, data.length]);

  const onLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  const comparisonPill = pctChange !== null ? (
    <View style={[styles.comparisonPill, { backgroundColor: pctChange >= 0 ? colors.success + '18' : colors.danger + '18' }]}>
      <Text style={[styles.comparisonText, { color: pctChange >= 0 ? colors.success : colors.danger }]}>
        {pctChange >= 0 ? '↑' : '↓'} {Math.abs(pctChange).toFixed(1)}% vs mois précédent
      </Text>
    </View>
  ) : null;

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.total}>{valueFormatter(total)}</Text>
        </View>
      )}
      {showComparison && comparisonPill}

      {/* Tooltip */}
      {activeIndex !== null && bars[activeIndex] && (
        <View style={[styles.tooltip, { left: spacing.xl + activeIndex * (barWidth + spacing.sm), bottom: 8 }]}>
          <Text style={styles.tooltipLabel}>{bars[activeIndex].label}</Text>
          <Text style={styles.tooltipValue}>{valueFormatter(bars[activeIndex].value)}</Text>
        </View>
      )}

      {/* Barres */}
      <View style={[styles.chartArea, { height: height - 60 }]}>
        {/* Grid */}
        <View style={styles.gridLines}>
          {[0, 0.25, 0.5, 0.75].map((pct) => (
            <View
              key={pct}
              style={[
                styles.gridLine,
                { bottom: `${pct * 100}%` },
              ]}
            />
          ))}
        </View>

        <View style={styles.barsRow}>
          {bars.map((bar, idx) => (
            <Pressable
              key={bar.label}
              style={styles.barCol}
              onPress={() => setActiveIndex(activeIndex === idx ? null : idx)}
            >
              <View style={styles.barFillArea}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${bar.heightPct}%`,
                      width: barWidth,
                      backgroundColor: bar.isActive
                        ? bar.color || colors.secondary
                        : bar.color || barColor,
                      opacity: bar.isActive ? 1 : 0.85,
                    },
                  ]}
                />
              </View>
              <Text
                style={styles.barLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {bar.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export const BarChart = memo(BarChartComponent);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  total: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  comparisonPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  comparisonText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  tooltipValue: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  chartArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  barCol: {
    alignItems: 'center',
  },
  barFillArea: {
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    borderRadius: radius.xs,
    minHeight: 2,
  },
  barLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
    maxWidth: 48,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
