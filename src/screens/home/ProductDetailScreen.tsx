import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { getProduct, findOrCreateConversation } from '@/lib/dataService';
import { showAlert } from '@/lib/dialog';
import { getCategoryName } from '@/constants/categories';
import { MediaCarousel } from '@/components/product/MediaCarousel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatFCFA } from '@/lib/format';
import { TextToSpeech } from '@/components/accessibility/TextToSpeech';
import type { ProductWithImages } from '@/types/models';

interface ProductDetailScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params: { productId: string } };
}

export function ProductDetailScreen({ navigation, route }: ProductDetailScreenProps) {
  const { productId } = route.params;
  const { addItem } = useCart();
  const { profile } = useAuth();
  const [product, setProduct] = useState<ProductWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProduct(productId);
      setProduct(p);
      setLoading(false);
    })();
  }, [productId]);

  if (loading) return <SafeAreaView style={styles.container} edges={['top']}><LoadingSpinner /></SafeAreaView>;
  if (!product) return <SafeAreaView style={styles.container} edges={['top']}><EmptyState icon="alert-circle" title="Produit introuvable" /></SafeAreaView>;

  const images = product.images?.map((i) => i.image_url) ?? [];
  const isOutOfStock = product.status === 'out_of_stock' || product.stock <= 0;
  const shop = product.shop;

  const handleAddToCart = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addItem(product, qty);
    navigation.navigate('Cart');
  };

  const handleContact = async () => {
    if (!shop) return;
    if (!profile) {
      showAlert('Connexion requise', 'Connectez-vous pour contacter le vendeur.');
      navigation.navigate('Login');
      return;
    }
    const conversationId = await findOrCreateConversation(profile.id, shop.owner_id, shop.id);
    if (!conversationId) {
      showAlert('Messagerie indisponible', "La conversation n'a pas pu être ouverte. Réessayez.");
      return;
    }
    navigation.navigate('Chat', { conversationId, shopId: shop.id, productId: product.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={navigation.goBack} style={styles.iconBtn} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn} hitSlop={10}>
              <Feather name="heart" size={20} color={colors.text} />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={10}>
              <Feather name="share-2" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <MediaCarousel images={images} videos={product.videos} height={340} />

        <View style={styles.content}>
          <View style={styles.tagRow}>
            <Badge label={getCategoryName(product.category_id)} color={colors.secondary} bgColor="#F3E8F9" />
            {isOutOfStock ? (
              <Badge label="Rupture de stock" color={colors.danger} bgColor="#FDECEC" />
            ) : (
              <Badge label={`En stock · ${product.stock}`} color={colors.success} bgColor="#E6F7EE" />
            )}
          </View>

          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatFCFA(product.price)}</Text>
            <TextToSpeech text={`${product.name}, ${formatFCFA(product.price)}. ${product.description ?? ''}`} size="sm" />
          </View>

          {shop ? (
            <Pressable style={styles.shopRow} onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}>
              <Image
                source={{ uri: shop.logo_url || 'https://placehold.co/80x80/FF6B00/FFFFFF?text=B' }}
                style={styles.shopLogo}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopCity}>{shop.city}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {product.description ? (
            <View style={styles.descSection}>
              <View style={styles.descTitleRow}>
                <Text style={styles.descTitle}>Description</Text>
                <TextToSpeech text={product.description} size="sm" />
              </View>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          ) : null}

          {!isOutOfStock ? (
            <View style={styles.qtySection}>
              <Text style={styles.qtyLabel}>Quantité</Text>
              <View style={styles.qtyControl}>
                <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                  <Feather name="minus" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.qtyValue}>{qty}</Text>
                <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.min(product.stock, q + 1))}>
                  <Feather name="plus" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ) : null}

          <Button
            label="Contacter le vendeur"
            variant="ghost"
            icon={<Feather name="message-circle" size={18} color={colors.secondary} />}
            onPress={handleContact}
            style={styles.contactBtn}
          />

          <Button
            label="Assistant IA"
            variant="outline"
            icon={<Feather name="cpu" size={18} color={colors.secondary} />}
            onPress={() => navigation.navigate('Chatbot', { product: product, shopName: shop?.name })}
            style={styles.aiBtn}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={added ? 'Ajouté ✓' : 'Ajouter au panier'}
          variant="outline"
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          style={{ flex: 1 }}
        />
        <Button
          label="Commander"
          onPress={handleBuyNow}
          disabled={isOutOfStock}
          style={{ flex: 1, marginLeft: spacing.md }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: colors.shadow, shadowOpacity: 0.3, shadowRadius: 4 }, android: { elevation: 3 }, default: { boxShadow: '0px 2px 4px rgba(0,0,0,0.15)' } }) },
  content: { padding: spacing.lg },
  tagRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  name: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.xs },
  price: { fontFamily: typography.fontFamily, fontSize: typography.sizes.hero, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.lg },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, marginBottom: spacing.lg },
  shopLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface },
  shopName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  shopCity: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  descSection: { marginBottom: spacing.lg },
  descTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  descTitle: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.semibold, color: colors.text, marginBottom: spacing.sm },
  desc: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.textMuted, lineHeight: 24 },
  aiBtn: { marginBottom: spacing.md },
  qtySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  qtyLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.text },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.subtitle, fontWeight: typography.weights.bold, color: colors.text, minWidth: 24, textAlign: 'center' },
  contactBtn: { marginBottom: spacing.xxxl },
  bottomBar: { flexDirection: 'row', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
});
