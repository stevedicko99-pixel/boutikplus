import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, typography, spacing, radius } from '@/theme';
import { useFavorites } from '@/context/FavoriteContext';
import { formatFCFA } from '@/lib/format';
import { ThreadDivider } from '@/components/ui/ThreadDivider';
import { StampBadge } from '@/components/ui/StampBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface WishlistScreenProps {
  navigation: { goBack: () => void; navigate: (name: string, params?: any) => void };
}

export function WishlistScreen({ navigation }: WishlistScreenProps) {
  const { wishlist, loadingWishlist, isFav, toggleFavorite } = useFavorites();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const handleRemove = (id: string) => {
    toggleFavorite(id);
  };

  const handlePressProduct = (id: string) => {
    navigation.navigate('ProductDetail', { productId: id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Liste de souhaits</Text>
          <StampBadge label="Souhaits" color={colors.primaryDeep} size="sm" />
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Fil de Faso — couture signature */}
      <ThreadDivider color={colors.stitch} style={styles.titleThread} />

      <ScrollView contentContainerStyle={[styles.scroll, wide && styles.wideScroll]} showsVerticalScrollIndicator={false}>
        {loadingWishlist ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : wishlist.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="heart" size={64} color={colors.textMuted} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>Aucun produit sauvegardé pour l'instant 💔</Text>
            <Text style={styles.emptyHint}>Appuie sur ❤️ sur les produits pour les retrouver ici.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {wishlist.map((product) => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.85 }]}
                onPress={() => handlePressProduct(product.id)}
              >
                <View style={styles.imageWrap}>
                  {product.images?.[0]?.image_url ? (
                    <Image
                      source={{ uri: product.images[0].image_url }}
                      style={styles.image}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View style={[styles.image, styles.placeholder]}>
                      <Feather name="image" size={24} color={colors.textMuted} />
                    </View>
                  )}
                  {isFav(product.id) ? (
                    <View style={styles.favBadge}>
                      <Feather name="heart" size={12} color={colors.danger} fill={colors.danger} />
                    </View>
                  ) : null}
                </View>

                <View style={styles.info}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  {product.shop ? (
                    <Text style={styles.shopName} numberOfLines={1}>
                      {product.shop.name}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>{formatFCFA(product.price)}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleRemove(product.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${product.name} des favoris`}
                  >
                    <Feather name="trash-2" size={14} color={colors.danger} />
                    <Text style={styles.removeText}>Retirer</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loadingWishlist && wishlist.length > 0 ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {wishlist.length} produit{wishlist.length > 1 ? 's' : ''} favori{wishlist.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  titleThread: { alignSelf: 'center', marginBottom: spacing.sm },
  scroll: { padding: spacing.lg, paddingTop: 0 },
  wideScroll: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, textAlign: 'center', marginTop: spacing.lg },
  emptyHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  list: { gap: spacing.md },
  productCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  imageWrap: { position: 'relative' },
  image: { width: 110, height: 130, backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  favBadge: { position: 'absolute', top: spacing.xs, right: spacing.xs, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight },
  info: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  productName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.xs },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted, marginBottom: spacing.xs },
  price: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.sm },
  removeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: colors.danger + '12', borderRadius: radius.sm },
  removeText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold, color: colors.danger },
  footer: { alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.md },
  footerText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.semibold, color: colors.textMuted },
});
