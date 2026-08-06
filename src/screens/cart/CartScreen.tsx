import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { confirmAction } from '@/lib/dialog';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatFCFA } from '@/lib/format';
import type { CartLine, CartSellerGroup } from '@/context/CartContext';

interface CartScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void };
}

export function CartScreen({ navigation }: CartScreenProps) {
  const { sellerGroups, total, count, updateQuantity, removeItem, clear } = useCart();
  const { profile } = useAuth();

  const handleClear = async () => {
    if (await confirmAction('Vider le panier', 'Retirer tous les articles du panier ?', 'Vider')) clear();
  };

  // La commande exige un compte : on redirige au lieu d'échouer au checkout.
  const handleCheckout = () => {
    navigation.navigate(profile ? 'Checkout' : 'Login');
  };

  if (count === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="shopping-cart"
          title="Votre panier est vide"
          message="Parcourez les boutiques et ajoutez des produits"
          action={<Button label="Explorer" onPress={() => navigation.navigate('Home')} style={{ marginTop: spacing.lg }} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon panier</Text>
        <Pressable onPress={handleClear} hitSlop={10}>
          <Text style={styles.clearBtn}>Vider</Text>
        </Pressable>
      </View>
      <FlatList
        data={sellerGroups}
        keyExtractor={(item) => item.sellerId}
        renderItem={({ item: group }) => (
          <SellerGroup
            group={group}
            onQty={updateQuantity}
            onRemove={removeItem}
            onShopPress={(shopId) => navigation.navigate('ShopDetail', { shopId })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      />
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatFCFA(total)}</Text>
        </View>
        <Button
          label={profile ? 'Commander' : 'Se connecter pour commander'}
          onPress={handleCheckout}
          style={{ flex: 1, marginLeft: spacing.lg }}
        />
      </View>
    </SafeAreaView>
  );
}

function SellerGroup({
  group,
  onQty,
  onRemove,
  onShopPress,
}: {
  group: CartSellerGroup;
  onQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onShopPress: (shopId: string) => void;
}) {
  return (
    <View style={styles.groupCard}>
      <Pressable style={styles.groupHead} onPress={() => group.shop && onShopPress(group.shop.id)}>
        <Feather name="briefcase" size={16} color={colors.secondary} />
        <Text style={styles.groupShopName} numberOfLines={1}>{group.shop?.name ?? 'Boutique'}</Text>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Pressable>
      {group.lines.map((line) => (
        <CartLineItem key={line.product.id} line={line} onQty={onQty} onRemove={onRemove} />
      ))}
      <View style={styles.groupFoot}>
        <Text style={styles.groupFootLabel}>Sous-total</Text>
        <Text style={styles.groupFootAmount}>{formatFCFA(group.subtotal)}</Text>
      </View>
    </View>
  );
}

function CartLineItem({ line, onQty, onRemove }: { line: CartLine; onQty: (id: string, q: number) => void; onRemove: (id: string) => void }) {
  const img = line.product.images?.[0]?.image_url;
  return (
    <View style={styles.line}>
      {img ? (
        <Image source={{ uri: img }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}><Feather name="image" size={18} color={colors.textMuted} /></View>
      )}
      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>{line.product.name}</Text>
        <Text style={styles.linePrice}>{formatFCFA(line.product.price)}</Text>
        <View style={styles.lineControls}>
          <View style={styles.qtyControl}>
            <Pressable style={styles.qtyBtn} onPress={() => onQty(line.product.id, line.quantity - 1)}>
              <Feather name="minus" size={14} color={colors.text} />
            </Pressable>
            <Text style={styles.qtyValue}>{line.quantity}</Text>
            <Pressable style={styles.qtyBtn} onPress={() => onQty(line.product.id, line.quantity + 1)}>
              <Feather name="plus" size={14} color={colors.text} />
            </Pressable>
          </View>
          <Pressable onPress={() => onRemove(line.product.id)} hitSlop={8}>
            <Feather name="trash-2" size={18} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
  clearBtn: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.danger, fontWeight: typography.weights.semibold },
  list: { padding: spacing.lg, paddingTop: 0 },
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  groupShopName: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.text },
  line: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  lineInfo: { flex: 1 },
  lineName: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginBottom: 4 },
  linePrice: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.primary, marginBottom: spacing.sm },
  lineControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing.sm },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text, minWidth: 20, textAlign: 'center' },
  groupFoot: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  groupFootLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  groupFootAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.text },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingBottom: spacing.xxl },
  totalLabel: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.textMuted },
  totalAmount: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.primary },
});
