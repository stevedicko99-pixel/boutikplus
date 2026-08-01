import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import type { ShareLink, ShareLinkMedium } from '@/types/models';

// Icône et libellé associés à chaque medium de partage
const MEDIUM_META: Record<
  ShareLinkMedium,
  { icon: string; label: string; color: string }
> = {
  social: { icon: 'share-2', label: 'Réseau social', color: colors.secondary },
  qr: { icon: 'grid', label: 'QR code', color: colors.info },
  link: { icon: 'link', label: 'Lien direct', color: colors.primary },
  flyer: { icon: 'image', label: 'Flyer', color: colors.warning },
  sms: { icon: 'message-square', label: 'SMS', color: colors.success },
};

interface ShareLinkCardProps {
  link: ShareLink;
  onPress?: (link: ShareLink) => void;
  onCopy?: (link: ShareLink) => void;
  onShare?: (link: ShareLink) => void;
}

export function ShareLinkCard({ link, onPress, onCopy, onShare }: ShareLinkCardProps) {
  const meta = MEDIUM_META[link.medium] ?? MEDIUM_META.link;
  const conversionRate =
    link.clicks_count > 0
      ? Math.round((link.conversions_count / link.clicks_count) * 100)
      : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.97 }]}
      onPress={() => onPress?.(link)}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Feather name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label} numberOfLines={1}>
            {link.label ?? link.slug}
          </Text>
          <Text style={styles.medium} numberOfLines={1}>
            {meta.label}
            {link.campaign ? ` · ${link.campaign}` : ''}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: link.is_active
                ? colors.success + '18'
                : colors.textMuted + '18',
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: link.is_active ? colors.success : colors.textMuted },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: link.is_active ? colors.success : colors.textMuted },
            ]}
          >
            {link.is_active ? 'Actif' : 'Inactif'}
          </Text>
        </View>
      </View>

      {/* Mini-statistiques : vues / clics / conversions */}
      <View style={styles.statsRow}>
        <MiniStat
          icon="eye"
          label="Vues"
          value={link.views_count}
          color={colors.info}
        />
        <View style={styles.statDivider} />
        <MiniStat
          icon="mouse-pointer"
          label="Clics"
          value={link.clicks_count}
          color={colors.primary}
        />
        <View style={styles.statDivider} />
        <MiniStat
          icon="check-circle"
          label="Ventes"
          value={link.conversions_count}
          color={colors.success}
        />
        <View style={styles.statDivider} />
        <MiniStat
          icon="trending-up"
          label="Conv."
          value={`${conversionRate}%`}
          color={colors.secondary}
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { borderColor: colors.primary }]}
          onPress={() => onCopy?.(link)}
        >
          <Feather name="copy" size={15} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Copier</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.primaryAction]}
          onPress={() => onShare?.(link)}
        >
          <Feather name="share-2" size={15} color={colors.textInverse} />
          <Text style={[styles.actionText, { color: colors.textInverse }]}>
            Partager
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  medium: {
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  miniStatValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  miniStatLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
  },
});
