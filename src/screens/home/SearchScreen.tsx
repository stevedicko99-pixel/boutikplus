import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MasonryFlashList } from '@shopify/flash-list';
import { colors, typography, spacing, radius } from '@/theme';
import { CATEGORIES } from '@/constants/categories';
import { CITY_LIST } from '@/constants/cities';
import { getProducts } from '@/lib/dataService';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonProductGrid } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { ProductWithImages } from '@/types/models';

interface SearchScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route?: { params?: { query?: string; categoryId?: string; city?: string } };
}

const PAGE_SIZE = 24;

function mergeUniqueProducts(current: ProductWithImages[], incoming: ProductWithImages[]) {
  const products = new Map(current.map((product) => [product.id, product]));
  incoming.forEach((product) => products.set(product.id, product));
  return [...products.values()];
}

export function SearchScreen({ navigation, route }: SearchScreenProps) {
  useDocumentTitle('Recherche — Boutikplus');
  const { width } = useWindowDimensions();
  const columns = width >= 1180 ? 4 : width >= 760 ? 3 : 2;
  const pagePadding = width >= 760 ? spacing.xxl : spacing.md;
  const [query, setQuery] = useState(route?.params?.query ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(route?.params?.categoryId ?? null);
  const [city, setCity] = useState<string | null>(route?.params?.city ?? null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [results, setResults] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(width >= 900);
  const requestIdRef = useRef(0);
  const nextOffsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const search = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    loadingMoreRef.current = false;
    hasMoreRef.current = true;
    nextOffsetRef.current = 0;
    setLoading(true);
    setLoadingMore(false);
    const data = await getProducts({ query: query || undefined, categoryId: categoryId ?? undefined, city: city ?? undefined, maxPrice: maxPrice ?? undefined, limit: PAGE_SIZE, offset: 0 });
    if (requestId !== requestIdRef.current) return;
    const unique = mergeUniqueProducts([], data);
    nextOffsetRef.current = data.length;
    hasMoreRef.current = data.length === PAGE_SIZE;
    setResults(unique);
    setHasMore(hasMoreRef.current);
    setLoading(false);
  }, [query, categoryId, city, maxPrice]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    const requestId = requestIdRef.current;
    const offset = nextOffsetRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const data = await getProducts({ query: query || undefined, categoryId: categoryId ?? undefined, city: city ?? undefined, maxPrice: maxPrice ?? undefined, limit: PAGE_SIZE, offset });
    if (requestId !== requestIdRef.current) return;
    setResults((current) => mergeUniqueProducts(current, data));
    nextOffsetRef.current = offset + data.length;
    hasMoreRef.current = data.length === PAGE_SIZE;
    loadingMoreRef.current = false;
    setHasMore(hasMoreRef.current);
    setLoadingMore(false);
  }, [query, categoryId, city, maxPrice]);

  useEffect(() => {
    const timer = setTimeout(search, 300);
    return () => { clearTimeout(timer); requestIdRef.current += 1; };
  }, [search]);

  const activeFilterCount = Number(Boolean(categoryId)) + Number(Boolean(city)) + Number(Boolean(maxPrice));

  const filters = (
    <View style={[styles.filtersPanel, width >= 900 && styles.filtersDesktop]} accessibilityLabel="Filtres de recherche">
      <View style={styles.filterPanelHead}>
        <View><Text style={styles.eyebrow}>AFFINER</Text><Text style={styles.filterHeading}>Filtres</Text></View>
        {width < 900 ? <Pressable style={styles.closeBtn} onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Fermer les filtres"><Feather name="x" size={20} color={colors.text} /></Pressable> : null}
      </View>
      <FilterGroup title="Catégorie"><FilterChip label="Tout" active={!categoryId} onPress={() => setCategoryId(null)} />{CATEGORIES.map((item) => <FilterChip key={item.id} label={item.name} active={categoryId === item.id} onPress={() => setCategoryId(item.id)} />)}</FilterGroup>
      <FilterGroup title="Ville"><FilterChip label="Toutes" active={!city} onPress={() => setCity(null)} />{CITY_LIST.slice(0, 8).map((item) => <FilterChip key={item} label={item} active={city === item} onPress={() => setCity(item)} />)}</FilterGroup>
      <FilterGroup title="Budget"><FilterChip label="Tous les prix" active={!maxPrice} onPress={() => setMaxPrice(null)} />{[5000, 10000, 20000, 50000].map((price) => <FilterChip key={price} label={`≤ ${price.toLocaleString('fr-FR')} FCFA`} active={maxPrice === price} onPress={() => setMaxPrice(price)} />)}</FilterGroup>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.shell, { paddingHorizontal: pagePadding }]}>
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Retour"><Feather name="arrow-left" size={22} color={colors.text} /></Pressable>
          <View style={styles.titleWrap}><Text style={styles.eyebrow}>MARCHÉ DU BURKINA</Text><Text style={styles.title}>Trouver le bon produit</Text></View>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.inputWrap}><Input value={query} onChangeText={setQuery} placeholder="Produit, boutique, savoir-faire…" icon="search" accessibilityLabel="Rechercher un produit ou une boutique" /></View>
          {width < 900 ? <Pressable style={({ pressed }) => [styles.filterBtn, pressed && styles.pressed]} onPress={() => setShowFilters((value) => !value)} accessibilityRole="button" accessibilityLabel={`Filtres${activeFilterCount ? `, ${activeFilterCount} actifs` : ''}`} accessibilityState={{ expanded: showFilters }}><Feather name="sliders" size={19} color={colors.primaryDeep} /><Text style={styles.filterBtnText}>Filtres</Text>{activeFilterCount ? <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View> : null}</Pressable> : null}
        </View>
        <View style={styles.contentRow}>
          {width >= 900 || showFilters ? filters : null}
          <View style={styles.resultsPane}>
            <View style={styles.resultInfo}><Text style={styles.resultTitle}>Sélection locale</Text><Text style={styles.resultCount}>{loading ? 'Recherche…' : `${results.length} résultat${results.length > 1 ? 's' : ''}`}</Text></View>
            {loading ? <SkeletonProductGrid count={6} /> : results.length === 0 ? <EmptyState icon="search" title="Aucun résultat" message="Essayez d’autres mots-clés ou modifiez les filtres" /> : (
              <MasonryFlashList<ProductWithImages>
                key={`search-${columns}`}
                data={results}
                keyExtractor={(item) => item.id}
                numColumns={columns}
                estimatedItemSize={300}
                drawDistance={400}
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                ListFooterComponent={loadingMore && hasMore ? <ActivityIndicator style={styles.loadingMore} color={colors.primary} /> : null}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => <View style={styles.gridItem}><ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { productId: item.id })} /></View>}
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.filterGroup}><Text style={styles.filterTitle}>{title}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{children}</ScrollView></View>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Filtrer par ${label}`}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1, width: '100%', maxWidth: 1440, alignSelf: 'center', paddingTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight },
  titleWrap: { flex: 1 },
  eyebrow: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.bold, color: colors.primaryDeep, letterSpacing: typography.letterSpacings.ultra },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.extrabold, color: colors.ink, letterSpacing: typography.letterSpacings.tight },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  inputWrap: { flex: 1 },
  filterBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: 'transparent' },
  filterBtnText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.primaryDeep },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontFamily: typography.fontFamily, fontSize: 10, fontWeight: typography.weights.bold, color: colors.textInverse },
  contentRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  filtersPanel: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md, maxHeight: 420 },
  filtersDesktop: { width: 280, maxHeight: '100%' },
  filterPanelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  filterHeading: { fontFamily: typography.fontFamily, fontSize: typography.sizes.title, fontWeight: typography.weights.extrabold, color: colors.ink },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterGroup: { marginBottom: spacing.lg },
  filterTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.sm },
  filterChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: 'transparent' },
  filterChipActive: { backgroundColor: colors.ink },
  filterChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  filterChipTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  resultsPane: { flex: 1, minWidth: 0, height: '100%' },
  resultInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  resultTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.ink },
  resultCount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  gridItem: { width: '100%', paddingHorizontal: spacing.xs },
  loadingMore: { paddingVertical: spacing.lg },
  listContent: { paddingBottom: 110 },
  pressed: { opacity: 0.72 },
  focused: { borderColor: colors.stitchDeep },
});
