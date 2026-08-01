import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { searchDrivers } from '@/lib/deliveryService';
import {
  DriverCard,
  DeliveryFilters,
  type DeliveryFilterState,
} from '@/components/delivery';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DriverProfile } from '@/types/models';

interface DriverSearchScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: { params?: { preselectedDriverId?: string; packageWeight?: number; pickupCity?: string } };
}

const DEFAULT_FILTERS: DeliveryFilterState = {
  city: null,
  vehicleType: null,
  availableOnly: true,
  minRating: 0,
  sortBy: 'rating',
};

export function DriverSearchScreen({ navigation, route }: DriverSearchScreenProps) {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DeliveryFilterState>(DEFAULT_FILTERS);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(
    route.params?.preselectedDriverId ?? null,
  );

  const packageWeight = route.params?.packageWeight;
  const pickupCity = route.params?.pickupCity ?? profile?.city ?? undefined;

  const load = useCallback(async () => {
    const data = await searchDrivers({
      city: filters.city ?? undefined,
      vehicleType: filters.vehicleType ?? undefined,
      availableOnly: filters.availableOnly,
      minRating: filters.minRating || undefined,
      sortBy: filters.sortBy,
    });
    setDrivers(data);
    setLoading(false);
    setRefreshing(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSelect = (driver: DriverProfile) => {
    setSelectedDriver(driver.id);
    // Naviguer vers l'écran de création avec le livreur pré-sélectionné
    navigation.navigate('CreateDelivery', {
      driverId: driver.id,
      packageWeight,
      pickupCity,
    });
  };

  const activeFiltersCount =
    (filters.city ? 1 : 0) +
    (filters.vehicleType ? 1 : 0) +
    (filters.availableOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.sortBy !== 'rating' ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Choisir un livreur</Text>
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          hitSlop={10}
          style={styles.filterBtn}
        >
          <Feather name="sliders" size={22} color={colors.primary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {pickupCity && (
        <View style={styles.contextBar}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={styles.contextText}>
            Prise en charge à <Text style={styles.contextBold}>{pickupCity}</Text>
            {packageWeight ? ` · ${packageWeight} kg` : ''}
          </Text>
        </View>
      )}

      {showFilters && (
        <View style={styles.filtersWrap}>
          <DeliveryFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
        </View>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : drivers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Aucun livreur trouvé"
          message="Essayez d'élargir vos filtres ou de changer de ville."
          action={
            <Pressable
              style={styles.resetAction}
              onPress={() => setFilters(DEFAULT_FILTERS)}
            >
              <Text style={styles.resetActionText}>Réinitialiser</Text>
            </Pressable>
          }
        />
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {drivers.length} livreur{drivers.length > 1 ? 's' : ''} disponible
              {drivers.length > 1 ? 's' : ''}
            </Text>
          }
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              packageWeight={packageWeight}
              pickupCity={pickupCity}
              selected={selectedDriver === item.id}
              onPress={() => handleSelect(item)}
              distanceKm={undefined}
            />
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
  filterBtn: { position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  contextText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
  },
  contextBold: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  filtersWrap: { padding: spacing.lg, paddingTop: 0 },
  list: { padding: spacing.lg, paddingTop: 0 },
  resultCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  resetAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing.lg,
  },
  resetActionText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
