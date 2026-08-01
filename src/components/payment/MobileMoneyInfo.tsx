import { StyleSheet, View, Text } from 'react-native';
import { colors, typography, radius, spacing } from '@/theme';
import { CopyButton } from '@/components/ui/CopyButton';
import { formatPhone } from '@/lib/format';
import { PAYMENT_OPERATORS, type PaymentOperatorId } from '@/constants/payment';

interface MobileMoneyInfoProps {
  operator: PaymentOperatorId;
  number: string;
}

export function MobileMoneyInfo({ operator, number }: MobileMoneyInfoProps) {
  const op = PAYMENT_OPERATORS[operator];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: op.bgColor }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>{op.shortName}</Text>
        </View>
        <View>
          <Text style={styles.operatorName}>{op.name}</Text>
          <Text style={styles.prefix}>Numéros {op.prefix}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Numéro à créditer</Text>
        <Text style={styles.number}>{formatPhone(number)}</Text>
        <View style={styles.copyWrap}>
          <CopyButton value={number} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  operatorName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  prefix: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  body: { padding: spacing.lg, alignItems: 'center' },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  number: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  copyWrap: { width: '100%' },
});
