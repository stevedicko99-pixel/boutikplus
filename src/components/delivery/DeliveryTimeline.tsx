import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import {
  DELIVERY_STATUS,
  DELIVERY_TIMELINE,
  getDeliveryStatusInfo,
} from '@/lib/deliveryStatus';
import type { DeliveryStatus, DeliveryRequest } from '@/types/models';

interface DeliveryTimelineProps {
  delivery: DeliveryRequest;
  compact?: boolean;
}

/**
 * Timeline visuelle des étapes d'une livraison.
 * Les étapes validées sont colorées, l'étape courante est mise en avant,
 * les étapes annulées affichent un état d'erreur.
 */
export function DeliveryTimeline({ delivery, compact = false }: DeliveryTimelineProps) {
  const currentStep = DELIVERY_STATUS[delivery.status]?.step ?? 0;
  const isCancelled = delivery.status === 'cancelled' || delivery.status === 'refunded';

  // Cas spécial : annulée / remboursée
  if (isCancelled) {
    const info = getDeliveryStatusInfo(delivery.status);
    return (
      <View style={[styles.cancelledCard, { backgroundColor: info.bgColor }]}>
        <Feather name={info.icon as any} size={22} color={info.color} />
        <View style={styles.cancelledInfo}>
          <Text style={[styles.cancelledTitle, { color: info.color }]}>
            {info.label}
          </Text>
          {delivery.cancellation_reason ? (
            <Text style={styles.cancelledReason}>
              {delivery.cancellation_reason}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {DELIVERY_TIMELINE.map((status: DeliveryStatus, index: number) => {
        const info = DELIVERY_STATUS[status];
        const isCompleted = currentStep > info.step;
        const isCurrent = currentStep === info.step;
        const isLast = index === DELIVERY_TIMELINE.length - 1;
        const timestamp = getTimestamp(delivery, status);

        return (
          <View key={status} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.stepDot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isCompleted ? (
                  <Feather name="check" size={14} color={colors.textInverse} />
                ) : (
                  <Feather
                    name={info.icon as any}
                    size={14}
                    color={isCurrent ? colors.textInverse : colors.textMuted}
                  />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.stepLine,
                    isCompleted && styles.lineCompleted,
                    isCurrent && styles.lineCurrent,
                  ]}
                />
              )}
            </View>
            <View style={[styles.stepContent, !isLast && styles.stepContentGap]}>
              <View style={styles.stepHeader}>
                <Text
                  style={[
                    styles.stepLabel,
                    (isCompleted || isCurrent) && styles.stepLabelActive,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {info.label}
                </Text>
                {timestamp ? (
                  <Text style={styles.stepTime}>{timestamp}</Text>
                ) : null}
              </View>
              {!compact && isCurrent ? (
                <Text style={styles.stepHint}>
                  {getStepHint(status, delivery)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function getTimestamp(delivery: DeliveryRequest, status: DeliveryStatus): string | null {
  switch (status) {
    case 'pending':
      return formatDate(delivery.created_at);
    case 'accepted':
      return delivery.accepted_at ? formatDate(delivery.accepted_at) : null;
    case 'in_progress':
      return delivery.updated_at ? formatDate(delivery.updated_at) : null;
    case 'delivered':
      return delivery.delivered_at ? formatDate(delivery.delivered_at) : null;
    default:
      return null;
  }
}

function getStepHint(status: DeliveryStatus, delivery: DeliveryRequest): string {
  switch (status) {
    case 'pending':
      return 'En attente qu\u2019un livreur accepte votre demande';
    case 'accepted':
      return delivery.driver?.profile?.full_name
        ? `${delivery.driver.profile.full_name} arrive bientôt pour la prise en charge`
        : 'Le livreur est en route vers le point de prise en charge';
    case 'in_progress':
      return 'Le colis a été récupéré et est en route vers la destination';
    case 'delivered':
      return 'La livraison est terminée avec succès';
    default:
      return '';
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepLeft: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  lineCompleted: { backgroundColor: colors.success },
  lineCurrent: { backgroundColor: colors.primary },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  stepContentGap: {
    paddingBottom: spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    flex: 1,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  stepTime: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  stepHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  cancelledInfo: { flex: 1 },
  cancelledTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.semibold,
    marginBottom: 2,
  },
  cancelledReason: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
});
