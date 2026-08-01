import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { pickAndCompressImage } from '@/lib/storage';
import { generateProductSuggestion, suggestPrice } from '@/lib/aiService';

interface AIProductAssistantScreenProps {
  navigation: { goBack: () => void };
  route: { params?: { onProductGenerated?: (data: { name: string; description: string; categoryId: string; price: number }) => void } };
}

export function AIProductAssistantScreen({ navigation, route }: AIProductAssistantScreenProps) {
  const [step, setStep] = useState<'photo' | 'generating' | 'result'>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{
    name: string;
    description: string;
    categoryId: string;
    priceSuggestion: number;
    minPrice: number;
    maxPrice: number;
  } | null>(null);

  const handleTakePhoto = async () => {
    const result = await pickAndCompressImage(true);
    if (result) {
      setPhotoUri(result.uri);
      setStep('generating');
      await generateFromPhoto();
    }
  };

  const handlePickImage = async () => {
    const result = await pickAndCompressImage(false);
    if (result) {
      setPhotoUri(result.uri);
      setStep('generating');
      await generateFromPhoto();
    }
  };

  const generateFromPhoto = async () => {
    try {
      const suggestion = await generateProductSuggestion();
      const priceAnalysis = await suggestPrice(suggestion.name, suggestion.categoryId);

      setGenerated({
        name: suggestion.name,
        description: suggestion.description,
        categoryId: suggestion.categoryId,
        priceSuggestion: priceAnalysis.suggestedPrice,
        minPrice: priceAnalysis.minPrice,
        maxPrice: priceAnalysis.maxPrice,
      });
      setStep('result');
    } catch {
      Alert.alert('Erreur', 'Impossible de générer les suggestions. Réessayez.');
      setStep('photo');
    }
  };

  const handleApply = () => {
    if (generated && route.params?.onProductGenerated) {
      route.params.onProductGenerated({
        name: generated.name,
        description: generated.description,
        categoryId: generated.categoryId,
        price: generated.priceSuggestion,
      });
    }
    navigation.goBack();
  };

  const handleRetake = () => {
    setPhotoUri(null);
    setGenerated(null);
    setStep('photo');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Assistant IA produit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 'photo' ? (
          <View style={styles.stepContainer}>
            <View style={styles.aiIntro}>
              <View style={styles.aiIcon}>
                <Feather name="cpu" size={32} color={colors.textInverse} />
              </View>
              <Text style={styles.aiTitle}>Prenez une photo de votre produit</Text>
              <Text style={styles.aiDesc}>
                Notre IA générera automatiquement le titre, la description, la catégorie et un prix suggéré.
              </Text>
            </View>

            <Pressable style={styles.photoSlot} onPress={handleTakePhoto}>
              <Feather name="camera" size={48} color={colors.primary} />
              <Text style={styles.photoSlotText}>Prendre une photo</Text>
            </Pressable>

            <Pressable style={styles.galleryBtn} onPress={handlePickImage}>
              <Feather name="image" size={24} color={colors.secondary} />
              <Text style={styles.galleryBtnText}>Choisir dans la galerie</Text>
            </Pressable>

            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>💡 Conseils pour de meilleurs résultats :</Text>
              <Text style={styles.tipItem}>• Photo bien éclairée, de face</Text>
              <Text style={styles.tipItem}>• Produit sur un fond neutre</Text>
              <Text style={styles.tipItem}>• Cadrez bien le produit</Text>
            </View>
          </View>
        ) : step === 'generating' ? (
          <View style={styles.loadingContainer}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="cover" />
            ) : null}
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.loadingText}>L'IA analyse votre photo...</Text>
            <Text style={styles.loadingSubtext}>Création du titre et de la description</Text>
          </View>
        ) : generated ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultBadge}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={styles.resultBadgeText}>Suggestions générées !</Text>
            </View>

            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewSmall} contentFit="cover" />
            ) : null}

            <Text style={styles.sectionLabel}>Titre suggéré</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultValue}>{generated.name}</Text>
            </View>

            <Text style={styles.sectionLabel}>Catégorie détectée</Text>
            <View style={styles.categoryChip}>
              <Feather name="tag" size={14} color={colors.primary} />
              <Text style={styles.categoryText}>{getCategoryName(generated.categoryId)}</Text>
            </View>

            <Text style={styles.sectionLabel}>Description générée</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultDesc}>{generated.description}</Text>
            </View>

            <Text style={styles.sectionLabel}>Prix suggéré</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.suggestedPrice}>{generated.priceSuggestion.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.priceRange}>
                Entre {generated.minPrice.toLocaleString('fr-FR')} et {generated.maxPrice.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Button
                label="Reprendre une photo"
                variant="outline"
                onPress={handleRetake}
                style={{ flex: 1 }}
              />
              <Button
                label="Appliquer à mon produit"
                onPress={handleApply}
                style={{ flex: 1.5, marginLeft: spacing.sm }}
              />
            </View>
          </View>
        ) : null}
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  stepContainer: { alignItems: 'center' },
  aiIntro: { alignItems: 'center', marginBottom: spacing.xl },
  aiIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  aiTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  aiDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  photoSlot: {
    width: 200,
    height: 200,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBF5',
    marginBottom: spacing.md,
  },
  photoSlotText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.sm,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  galleryBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.secondary,
    fontWeight: typography.weights.semibold,
  },
  tips: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
  },
  tipsTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipItem: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
  loadingContainer: { alignItems: 'center', paddingTop: spacing.xxxl },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  spinner: { marginVertical: spacing.lg },
  loadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  loadingSubtext: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  resultContainer: { width: '100%' },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '18',
    padding: spacing.sm,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  resultBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  previewSmall: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  resultBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  resultDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.text,
    lineHeight: 22,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '18',
    padding: spacing.sm,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  priceContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  suggestedPrice: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  priceRange: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
});
