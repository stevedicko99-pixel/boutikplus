import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { formatFCFA } from '@/lib/format';
import { getProduct } from '@/lib/dataService';
import { createProductReview } from '@/lib/productReviews';
import type { ProductWithImages } from '@/types/models';

interface WriteProductReviewScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  route: { params: { productId: string } };
}

export function WriteProductReviewScreen({ navigation, route }: WriteProductReviewScreenProps) {
  const { productId } = route.params;

  const [product, setProduct] = useState<ProductWithImages | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getProduct(productId);
      setProduct(p);
      setLoadingProduct(false);
    })();
  }, [productId]);

  const handleSubmit = async () => {
    if (rating < 1) {
      Alert.alert('Note requise', 'Choisis au moins 1 étoile pour publier ton avis.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createProductReview({
        productId,
        rating,
        comment,
        isAnonymous,
      });
      if (result.success) {
        Alert.alert('Avis publié ! 🎉', 'Merci d\'avoir partagé ton expérience.', [
          {
            text: 'Voir les avis',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Erreur', result.message ?? 'Impossible de publier l\'avis. Réessaie plus tard.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const productImage = product?.images?.[0]?.image_url;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Donner mon avis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {product ? (
          <Card style={styles.productCard}>
            <View style={styles.productRow}>
              {productImage ? (
                <Image
                  source={{ uri: productImage }}
                  style={styles.productImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.productImage, styles.productImagePlaceholder]}>
                  <Feather name="image" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPrice}>{formatFCFA(product.price)}</Text>
              </View>
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Note globale</Text>
          <View style={styles.starPickerWrap}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Feather
                  name={star <= rating ? 'star' : 'star'}
                  size={40}
                  color={star <= rating ? colors.warning : colors.border}
                  fill={star <= rating ? colors.warning : undefined}
                  style={star <= rating ? { color: colors.warning } : undefined}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating === 0
              ? 'Appuie sur une étoile pour noter'
              : rating === 1
                ? '⭐ Très mauvais'
                : rating === 2
                  ? '⭐⭐ Mauvais'
                  : rating === 3
                    ? '⭐⭐⭐ Moyen'
                    : rating === 4
                      ? '⭐⭐⭐⭐ Bon'
                      : '⭐⭐⭐⭐⭐ Excellent'}
          </Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ton commentaire</Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="Partage ton expérience avec ce produit…"
            multiline
            numberOfLines={6}
            style={{ minHeight: 140 }}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Publier anonymement</Text>
              <Text style={styles.switchHint}>
                Ton nom et avatar ne seront pas affichés publiquement
              </Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isAnonymous ? colors.primary : colors.textInverse}
              ios_backgroundColor={colors.border}
            />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Photos (optionnel)</Text>
          <Pressable
            style={({ pressed }) => [styles.galleryPlaceholder, pressed && { opacity: 0.8 }]}
            onPress={() =>
              Alert.alert(
                'Bientôt disponible',
                'L\'ajout de photos sera disponible dans une prochaine mise à jour.',
              )
            }
          >
            <View style={styles.galleryIconWrap}>
              <Feather name="camera" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.galleryText}>Ajouter des photos</Text>
            <Text style={styles.galleryHint}>
              Montre le produit en vrai avec des clichés (jusqu\'à 5 photos)
            </Text>
          </Pressable>
        </Card>

        <View style={styles.submitWrap}>
          <Button
            label="📤 Publier mon avis"
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
          <Button
            label="Annuler"
            variant="ghost"
            size="md"
            onPress={navigation.goBack}
            style={{ marginTop: spacing.sm }}
            fullWidth
          />
        </View>
      </ScrollView>
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
  scroll: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  productCard: {},
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    lineHeight: 20,
  },
  productPrice: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  sectionCard: {},
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  starPickerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  ratingHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  charCount: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  switchHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  galleryPlaceholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
  },
  galleryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  galleryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  galleryHint: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  submitWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
});
