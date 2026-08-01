import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { CATEGORIES } from '@/constants/categories';
import { CITY_LIST } from '@/constants/cities';
import { getProducts } from '@/lib/dataService';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import type { ProductWithImages } from '@/types/models';

interface SearchScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route?: { params?: { query?: string; categoryId?: string; city?: string } };
}

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const [query, setQuery] = useState(route?.params?.query ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(route?.params?.categoryId ?? null);
  const [city, setCity] = useState<string | null>(route?.params?.city ?? null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [results, setResults] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    const data = await getProducts({
      query: query || undefined,
      categoryId: categoryId ?? undefined,
      city: city ?? undefined,
      maxPrice: maxPrice ?? undefined,
      limit: 50,
    });
    setResults(data);
    setLoading(false);
  }, [query, categoryId, city, maxPrice]);

  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchRow}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher..."
            icon="search"
          />
        </View>
        <Pressable style={styles.filterBtn} onPress={() => setShowFilters((s) => !s)}>
          <Feather name="sliders" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterTitle}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <FilterChip label="Tout" active={!categoryId} onPress={() => setCategoryId(null)} />
            {CATEGORIES.map((c) => (
              <FilterChip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ScrollView>
          <Text style={styles.filterTitle}>Ville</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <FilterChip label="Toutes" active={!city} onPress={() => setCity(null)} />
            {CITY_LIST.slice(0, 8).map((c) => (
              <FilterChip key={c} label={c} active={city === c} onPress={() => setCity(c)} />
            ))}
          </ScrollView>
          <Text style={styles.filterTitle}>Prix maximum</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <FilterChip label="Tout" active={!maxPrice} onPress={() => setMaxPrice(null)} />
            <FilterChip label="≤ 5 000" active={maxPrice === 5000} onPress={() => setMaxPrice(5000)} />
            <FilterChip label="≤ 10 000" active={maxPrice === 10000} onPress={() => setMaxPrice(10000)} />
            <FilterChip label="≤ 20 000" active={maxPrice === 20000} onPress={() => setMaxPrice(20000)} />
            <FilterChip label="≤ 50 000" active={maxPrice === 50000} onPress={() => setMaxPrice(50000)} />
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.resultInfo}>
        <Text style={styles.resultCount}>{results.length} résultat{results.length > 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : results.length === 0 ? (
        <EmptyState icon="search" title="Aucun résultat" message="Essayez d'autres mots-clés ou modifiez les filtres" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, paddingRight: spacing.sm },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: '#FFF0E0', alignItems: 'center', justifyContent: 'center' },
  filtersPanel: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight },
  filterTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm },
  resultInfo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  resultCount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  gridRow: { gap: spacing.md, paddingHorizontal: spacing.lg },
  gridItem: { flex: 1, maxWidth: '50%' },
  listContent: { paddingBottom: 100 },
  filterChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  filterChipTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
});
