import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import type { DiscountCode, DiscountCodeStatus } from '@/types/models';
import { formatPromoFCFA } from '@/lib/promotionService';

const STATUS_META: Record<
  DiscountCodeStatus,
  { label: string; color: string }
> = {
  active: { label: 'Actif', color: colors.success },
  expired: { label: 'Expiré', color: colors.danger },
  paused: { label: 'En pause', color: colors.warning },
  exhausted: { label: 'Épuisé', color: colors.textMuted },
};

interface DiscountCodeCardProps {
  code: DiscountCode;
  onPress?: (code: DiscountCode) => void;
  onTogglePause?: (code: DiscountCode) => void;
  onDelete?: (code: DiscountCode) => void;
}

export function DiscountCodeCard({
  code,
  onPress,
  onTogglePause,
  onDelete,
}: DiscountCodeCardProps) {
  const statusMeta = STATUS_META[code.status] ?? STATUS_META.active;
  const usesPct =
    code.max_uses > 0
      ? Math.min(100, Math.round((code.uses_count / code.max_uses) * 100))
      : 0;
  const isPercentage = code.discount_type === 'percentage';
  const expiresSoon =
    code.status === 'active' &&
    new Date(code.expires_at).getTime() - Date.now() < 7 * 24 * 3600 * 1000;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.97 }]}
      onPress={() => onPress?.(code)}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.codeWrap}>
          <Feather
            name={isPercentage ? 'percent' : 'tag'}
            size={16}
            color={colors.textInverse}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.codeText}>{code.code}</Text>
          <Text style={styles.discountValue}>
            {isPercentage
              ? `-${code.discount_value}%`
              : `-${formatPromoFCFA(code.discount_value)}`}
            {code.min_order_amount > 0
              ? ` · min ${formatPromoFCFA(code.min_order_amount)}`
              : ''}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusMeta.color + '18' },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
          <Text style={[styles.statusText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      {/* Barre de progression utilisation */}
      {code.max_uses > 0 ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {code.uses_count} / {code.max_uses} utilisations
            </Text>
            <Text style={styles.progressPct}>{usesPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${usesPct}%`,
                  backgroundColor:
                    usesPct >= 80 ? colors.warning : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            {code.uses_count} utilisation{code.uses_count > 1 ? 's' : ''} · illimité
          </Text>
        </View>
      )}

      {/* Pied : expiration + actions */}
      <View style={styles.footer}>
        <View style={styles.expiryRow}>
          <Feather
            name="calendar"
            size={13}
            color={expiresSoon ? colors.warning : colors.textMuted}
          />
          <Text
            style={[
              styles.expiryText,
              expiresSoon && { color: colors.warning },
            ]}
          >
            Expire le {new Date(code.expires_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.footerActions}>
          {onTogglePause ? (
            <Pressable
              hitSlop={8}
              onPress={() => onTogglePause(code)}
              style={styles.iconAction}
            >
              <Feather
                name={code.status === 'paused' ? 'play' : 'pause'}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              hitSlop={8}
              onPress={() => onDelete(code)}
              style={styles.iconAction}
            >
              <Feather name="trash-2" size={16} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  discountValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  progressPct: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconAction: {
    padding: spacing.xs,
  },
});
