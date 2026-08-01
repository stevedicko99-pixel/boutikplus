import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '@/theme';
import { formatFCFA, formatRelativeDate } from '@/lib/format';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { Order, OrderItem, Shop } from '@/types/models';

interface OrderCardProps {
  order: Order & { items?: OrderItem[]; shop?: Shop };
  onPress?: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const firstItem = order.items?.[0];
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const shopName = order.shop?.name ?? firstItem?.product?.shop?.name ?? 'Boutique';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.header}>
        <View style={styles.shopInfo}>
          <View style={styles.logoWrap}>
            <Feather name="shopping-bag" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.shopName} numberOfLines={1}>{shopName}</Text>
            <Text style={styles.date}>{formatRelativeDate(order.created_at)}</Text>
          </View>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      <View style={styles.itemsRow}>
        {firstItem?.product?.images?.[0]?.image_url || firstItem?.product?.shop ? (
          <Image
            source={{ uri: firstItem?.product?.images?.[0]?.image_url }}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Feather name="package" size={18} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {firstItem?.product?.name ?? 'Commande'}
          </Text>
          <Text style={styles.itemCount}>
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.amount}>{formatFCFA(order.total_amount)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shopInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  date: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 2,
  },
  itemCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  amount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
