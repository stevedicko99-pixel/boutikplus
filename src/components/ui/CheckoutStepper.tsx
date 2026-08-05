import { memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

export type CheckoutStep = 'cart' | 'address' | 'review' | 'payment';

interface CheckoutStepperProps {
  /** Étape active (commence à 'cart' = 1). */
  current: CheckoutStep;
  /** Pression sur un step déjà complété pour y revenir. */
  onStepPress?: (step: CheckoutStep) => void;
}

const STEPS: { id: CheckoutStep; label: string; icon: any }[] = [
  { id: 'cart', label: 'Panier', icon: 'shopping-cart' },
  { id: 'address', label: 'Adresse', icon: 'map-pin' },
  { id: 'review', label: 'Récap', icon: 'file-text' },
  { id: 'payment', label: 'Paiement', icon: 'credit-card' },
];

function stepIndex(step: CheckoutStep) {
  return STEPS.findIndex((s) => s.id === step);
}

/**
 * Stepper 4 étapes du Checkout.
 * - Utilisé en haut de CheckoutScreen (après le header + bannière invité)
 *   pour donner un repère visuel clair aux jeunes utilisateurs.
 * - Les étapes avant `current` sont "complétées" (coche verte, pressable).
 * - L'étape active est surlignée en primary.
 * - Les étapes suivantes sont grisées ("à venir").
 */
function CheckoutStepperComponent({ current, onStepPress }: CheckoutStepperProps) {
  const curIdx = stepIndex(current);
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {STEPS.map((s, i) => {
        const isActive = i === curIdx;
        const isCompleted = i < curIdx;
        const isUpcoming = i > curIdx;
        const canPress = isCompleted && onStepPress;
        const color = isActive
          ? colors.primary
          : isCompleted
            ? colors.success
            : colors.textMuted;
        const bgColor = isActive
          ? colors.primary + '18'
          : isCompleted
            ? colors.success + '18'
            : colors.surfaceAlt;

        return (
          <View key={s.id} style={styles.stepWrap}>
            <Pressable
              disabled={!canPress}
              onPress={() => canPress && onStepPress!(s.id)}
              style={[styles.iconWrap, { backgroundColor: bgColor, borderColor: color + '60' }]}
              accessibilityRole={canPress ? 'button' : undefined}
              accessibilityLabel={`Étape ${i + 1} : ${s.label}`}
            >
              {isCompleted ? (
                <Feather name="check" size={16} color={colors.success} />
              ) : (
                <Feather name={s.icon as any} size={16} color={color} />
              )}
            </Pressable>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isActive || isCompleted ? colors.text : colors.textMuted,
                  fontWeight: isActive ? typography.weights.bold : typography.weights.medium,
                },
              ]}
            >
              {s.label}
            </Text>
            {/* Connecteur entre step n et step n+1 */}
            {i < STEPS.length - 1 ? (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      i < curIdx ? colors.success : colors.borderLight,
                  },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export const CheckoutStepper = memo(CheckoutStepperComponent);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 4,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
  },
  connector: {
    position: 'absolute',
    top: 19,
    left: '60%',
    width: '80%',
    height: 2,
    borderRadius: 1,
    zIndex: -1,
  },
});
