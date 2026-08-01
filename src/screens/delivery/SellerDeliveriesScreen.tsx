import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getSellerDeliveries } from '@/lib/deliveryService';
import { DELIVERY_FILTERS, type DeliveryFilterDef } from '@/constants/delivery';
import { DeliveryCard } from '@/components/delivery';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DeliveryRequest, DeliveryStatus } from '@/types/models';

interface SellerDeliveriesScreenProps {
  navigation: { goBack: () => void; navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export function SellerDeliveriesScreen({ navigation }: SellerDeliveriesScreenProps) {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');

  const load = useCallback(async () => {
    const data = await getSellerDeliveries(profile?.id ?? 'demo-seller', filter);
    setDeliveries(data);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleNew = () => {
    navigation.navigate('CreateDelivery', {});
  };

  const handleOpen = (deliveryId: string) => {
    navigation.navigate('DeliveryTracking', { deliveryId });
  };

  // Compter par statut pour les badges
  const counts = deliveries.reduce(
    (acc, d) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Mes livraisons</Text>
        <Pressable onPress={handleNew} hitSlop={10}>
          <Feather name="plus-circle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filtres horizontaux */}
      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {DELIVERY_FILTERS.map((f: DeliveryFilterDef) => {
              const active = filter === f.id;
              const count = counts[f.id] ?? 0;
              return (
                <Pressable
                  key={f.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(f.id)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.filterCount, active && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : deliveries.length === 0 ? (
        <EmptyState
          icon="package"
          title="Aucune livraison"
          message={
            filter === 'all'
              ? "Vous n'avez pas encore commandé de livraison. Créez votre première demande !"
              : `Aucune livraison avec le statut « ${DELIVERY_FILTERS.find((f) => f.id === filter)?.label} ».`
          }
          action={
            filter === 'all' ? (
              <Button
                label="Commander une livraison"
                onPress={handleNew}
                style={{ marginTop: spacing.lg }}
                icon={<Feather name="plus" size={18} color={colors.textInverse} />}
              />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <DeliveryCard delivery={item} onPress={() => handleOpen(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  filtersWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.textInverse,
    fontWeight: typography.weights.semibold,
  },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  filterCountTextActive: { color: colors.textInverse },
  list: { padding: spacing.lg, paddingTop: 0 },
});
