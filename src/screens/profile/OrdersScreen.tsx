import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getBuyerOrders } from '@/lib/dataService';
import { OrderCard } from '@/components/order/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { ORDER_STATUS } from '@/lib/orderStatus';
import type { Order, OrderItem, Shop, OrderStatus } from '@/types/models';

interface OrdersScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
}

const FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending_payment', label: 'À payer' },
  { key: 'proof_uploaded', label: 'En validation' },
  { key: 'payment_validated', label: 'En préparation' },
  { key: 'in_delivery', label: 'En livraison' },
  { key: 'delivered', label: 'Livrées' },
];

export function OrdersScreen({ navigation }: OrdersScreenProps) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<(Order & { items: OrderItem[]; shop?: Shop })[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const load = useCallback(async () => {
    const data = await getBuyerOrders(profile?.id ?? 'demo-buyer');
    setOrders(data as any);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mes commandes</Text>
          <StampBadge label="Commandes" color={colors.primaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon="package" title="Aucune commande" message="Vos commandes apparaîtront ici" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => {
                if (item.status === 'pending_payment') {
                  navigation.navigate('Payment', { orderId: item.id });
                } else {
                  navigation.navigate('OrderConfirmation', { orderId: item.id });
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  filterScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  filterChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  filterTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  list: { padding: spacing.lg, paddingTop: 0 },
});
