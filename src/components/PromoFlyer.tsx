import { useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';

interface PromoFlyerProps {
  productName: string;
  productImage: string;
  price: number;
  originalPrice?: number;
  shopName: string;
  shopLogo?: string;
  promoText?: string;
  template?: 'orange' | 'violet' | 'green' | 'sunset';
  onGenerated?: (uri: string) => void;
}

const TEMPLATES = {
  orange: { gradient: ['#FF6B00', '#FF8533'], accent: '#FFFFFF' },
  violet: { gradient: ['#6B2D8E', '#8B3DAE'], accent: '#FFFFFF' },
  green: { gradient: ['#00A859', '#00C96F'], accent: '#FFFFFF' },
  sunset: { gradient: ['#FF6B00', '#6B2D8E'], accent: '#FFFFFF' },
} as const;

function PromoFlyerComponent({
  productName,
  productImage,
  price,
  originalPrice,
  shopName,
  shopLogo,
  promoText = 'Offre spéciale !',
  template = 'orange',
  onGenerated,
}: PromoFlyerProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const isCapturing = useRef(false);
  const tpl = TEMPLATES[template];

  const handleCapture = useCallback(async () => {
    if (isCapturing.current) return;
    isCapturing.current = true;
    const shot = viewShotRef.current;
    if (!shot?.capture) {
      isCapturing.current = false;
      return;
    }

    const uri = await shot.capture();
    isCapturing.current = false;

    onGenerated?.(uri);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Flyer généré',
        `Image sauvegardée : ${uri}`
      );
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Partager la promotion',
      UTI: 'public.png',
    });
  }, [onGenerated]);

  const discount = originalPrice && originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;

  return (
    <View style={styles.outerContainer}>
      {/* Flyer visible (sera capturé) */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }}>
        <View style={[styles.flyer, { backgroundColor: tpl.gradient[0] }]}>
          {/* Header band */}
          <View style={styles.headerBand}>
            {shopLogo ? (
              <Image source={{ uri: shopLogo }} style={styles.shopLogo} />
            ) : (
              <View style={[styles.shopLogoPlaceholder, { backgroundColor: tpl.accent + '30' }]}>
                <Feather name="shopping-bag" size={20} color={tpl.accent} />
              </View>
            )}
            <Text style={[styles.shopName, { color: tpl.accent }]}>{shopName}</Text>
          </View>

          {/* Product image area */}
          <View style={styles.imageContainer}>
            {productImage ? (
              <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: tpl.gradient[1] + '60' }]}>
                <Feather name="image" size={48} color={tpl.accent + '40'} />
              </View>
            )}
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}
          </View>

          {/* Product info */}
          <View style={styles.infoSection}>
            <Text style={[styles.promoLabel, { color: tpl.accent + 'CC' }]}>{promoText}</Text>
            <Text style={[styles.productName, { color: tpl.accent }]} numberOfLines={2}>
              {productName}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: tpl.accent }]}>
                {Math.round(price).toLocaleString('fr-FR')} FCFA
              </Text>
              {originalPrice && originalPrice > price && (
                <Text style={[styles.originalPrice, { color: tpl.accent + '80' }]}>
                  {Math.round(originalPrice).toLocaleString('fr-FR')} FCFA
                </Text>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: tpl.accent + '90' }]}>
              Commandez maintenant sur Boutikplus
            </Text>
          </View>
        </View>
      </ViewShot>

      {/* Bouton partager */}
      <Pressable style={styles.shareButton} onPress={handleCapture}>
        <Feather name="share-2" size={20} color={colors.textInverse} />
        <Text style={styles.shareButtonText}>Partager sur WhatsApp / Réseaux</Text>
      </Pressable>
    </View>
  );
}

export const PromoFlyer = memo(PromoFlyerComponent);
export { TEMPLATES };

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  flyer: {
    width: 320,
    alignSelf: 'center',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  shopLogo: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shopLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  imageContainer: {
    height: 200,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  discountText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  infoSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  promoLabel: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  productName: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  price: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: typography.weights.bold,
  },
  originalPrice: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  footerText: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  shareButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
