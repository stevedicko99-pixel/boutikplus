import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getCategoryName } from '@/constants/categories';
import { pickAndCompressImage, pickMultipleImages, uploadImage, deleteStorageObject } from '@/lib/storage';
import { friendlyMessage } from '@/lib/errorMessages';
import { logger } from '@/lib/logger';
import { setAIResult } from '@/lib/aiResultHolder';
import {
  generateMagicListing,
  type MagicListingResult,
} from '@/lib/aiSuite';

interface AIProductAssistantScreenProps {
  navigation: { goBack: () => void };
  route: { params?: { onProductGenerated?: (data: { name: string; description: string; categoryId: string; price: number; imageUrl?: string; imageUrls?: string[] }) => void } };
}

const MAX_AI_PHOTOS = 5;

export function AIProductAssistantScreen({ navigation, route }: AIProductAssistantScreenProps) {
  const [step, setStep] = useState<'photo' | 'uploading' | 'generating' | 'result'>('photo');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ phase: string; pct: number } | null>(null);
  const [generated, setGenerated] = useState<MagicListingResult | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceSuggestion, setPriceSuggestion] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Set<string>>>({});
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const showError = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleTakePhoto = async () => {
    if (photoUris.length >= MAX_AI_PHOTOS) {
      showError('Maximum atteint', `${MAX_AI_PHOTOS} photos maximum.`);
      return;
    }
    const result = await pickAndCompressImage(true);
    if (!result) {
      showError('Photo indisponible', 'Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      return;
    }
    setPhotoUris([result.uri]);
    await runPipeline([result.uri]);
  };

  const handlePickImages = async () => {
    const remaining = MAX_AI_PHOTOS - photoUris.length;
    const picked = await pickMultipleImages(remaining);
    if (!picked.length) {
      showError('Galerie indisponible', 'Impossible d\'accéder à la galerie. Vérifiez les permissions.');
      return;
    }
    const newUris = picked.map((img) => img.uri);
    setPhotoUris(newUris);
    await runPipeline(newUris);
  };

  const handleRemoveSelectedPhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Pipeline complet : Upload Supabase → Génération IA → Résultat.
   * Cause racine du bug historique : l'upload n'était JAMAIS effectué,
   * la photo restait en file:// local et n'était pas persistée.
   * Désormais : upload réel vers product-images si possible ; sinon on continue
   * avec l'URI locale pour garder l'expérience fluide en mode démo / hors ligne.
   */
  const runPipeline = async (localUris: string[]) => {
    // === Étape 1 : Upload vers Supabase Storage ===
    setStep('uploading');
    setUploadProgress({ phase: `Téléversement de ${localUris.length} photo(s)…`, pct: 15 });

    const remoteUrls: string[] = [];
    for (let i = 0; i < localUris.length; i++) {
      const uri = localUris[i];
      setUploadProgress({ phase: `Téléversement ${i + 1}/${localUris.length}…`, pct: Math.round(15 + (i / localUris.length) * 40) });
      const uploaded = await uploadImage('product-images', uri, `ai_prod_${Date.now()}_${i}`);
      if (uploaded?.url) {
        remoteUrls.push(uploaded.url);
      } else {
        logger.warn('AIProductAssistant: upload failed for one image', { uri });
      }
    }

    if (!remoteUrls.length) {
      // Mode démo / pas de connexion Supabase : on continue avec la photo locale.
      logger.warn('AIProductAssistant: all uploads failed, continuing with local URIs');
      showError(
        'Mode hors ligne',
        'Les photos n\'ont pas pu être sauvegardées en ligne. L\'IA va analyser vos photos locales.',
      );
    }

    setUploadedImageUrls(remoteUrls);
    setUploadProgress({ phase: remoteUrls.length ? `${remoteUrls.length} photo(s) sécurisée(s) ✓` : 'Photos locales ✓', pct: 100 });

    // === Étape 2 : Génération IA ===
    setStep('generating');
    setUploadProgress({ phase: 'Analyse IA en cours…', pct: 30 });

    try {
      const photoHint = remoteUrls.length
        ? `photos produit téléversées (URLs: ${remoteUrls.join(', ')})`
        : 'photos produit fournies';

      const result = await generateMagicListing({
        rawInput: 'Produit à vendre',
        photoHint,
      });

      setUploadProgress({ phase: 'Finalisation…', pct: 90 });

      setGenerated(result);
      setName(result.name);
      setDescription(result.description);
      setCategoryId(result.category_id);
      setPriceSuggestion(result.price_suggestion);
      setMinPrice(Math.round(result.price_suggestion * 0.85));
      setMaxPrice(Math.round(result.price_suggestion * 1.2));

      const initialSelected: Record<string, Set<string>> = {};
      result.variants.forEach((v) => {
        initialSelected[v.label] = new Set();
      });
      setSelectedVariants(initialSelected);

      setUploadProgress(null);
      setStep('result');
    } catch (e: any) {
      showError(
        'Génération IA échouée',
        friendlyMessage(e?.message ?? 'Impossible de générer les suggestions. Réessayez.'),
      );
      setUploadProgress(null);
      setStep('photo');
    }
  };

  const handleApply = () => {
    const resultData: { name: string; description: string; categoryId: string; price: number; imageUrl?: string; imageUrls?: string[] } = {
      name,
      description,
      categoryId,
      price: priceSuggestion,
      imageUrls: uploadedImageUrls.length ? uploadedImageUrls : (photoUris.length ? photoUris : undefined),
    };
    // Retro-compatibilité : si une seule image, on expose aussi imageUrl
    if (resultData.imageUrls?.length === 1) {
      resultData.imageUrl = resultData.imageUrls[0];
    }
    // Stockage via holder singleton (robuste sur web + native).
    // Le callback legacy est conservé pour rétro-compatibilité si fourni.
    setAIResult(resultData);
    if (route.params?.onProductGenerated) {
      route.params.onProductGenerated(resultData);
    }
    navigation.goBack();
  };

  const handleRetake = () => {
    // Nettoie les images uploadées distantes si l'utilisateur recommence
    uploadedImageUrls.forEach((url) => {
      if (url.includes('/product-images/')) {
        deleteStorageObject('product-images', url);
      }
    });
    setPhotoUris([]);
    setUploadedImageUrls([]);
    setUploadProgress(null);
    setGenerated(null);
    setName('');
    setDescription('');
    setCategoryId('');
    setPriceSuggestion(0);
    setMinPrice(0);
    setMaxPrice(0);
    setSelectedVariants({});
    setCopiedKeyword(null);
    setStep('photo');
  };

  const handleNameSuggestionPress = (suggestion: string) => {
    setName(suggestion);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleVariantOptionPress = (variantLabel: string, option: string) => {
    setSelectedVariants((prev) => {
      const current = prev[variantLabel] || new Set();
      const next = new Set(current);
      if (next.has(option)) {
        next.delete(option);
      } else {
        next.add(option);
      }
      return { ...prev, [variantLabel]: next };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleKeywordCopy = async (keyword: string) => {
    await Clipboard.setStringAsync(keyword);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  const handleEmojiPress = (emoji: string) => {
    setDescription((prev) => prev + emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      {step === 'photo' ? (
        <ScrollView contentContainerStyle={styles.content}>
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

            {photoUris.length > 0 ? (
              <View style={styles.selectedPhotosRow}>
                {photoUris.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.selectedPhotoWrap}>
                    <Image source={{ uri }} style={styles.selectedPhotoThumb} contentFit="cover" />
                    <Pressable style={styles.removeSelectedPhoto} onPress={() => handleRemoveSelectedPhoto(idx)}>
                      <Feather name="x" size={14} color={colors.textInverse} />
                    </Pressable>
                  </View>
                ))}
                {photoUris.length < MAX_AI_PHOTOS ? (
                  <Pressable style={styles.addPhotoThumb} onPress={handlePickImages}>
                    <Feather name="plus" size={24} color={colors.primary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable style={styles.photoSlot} onPress={handleTakePhoto}>
              <Feather name="camera" size={48} color={colors.primary} />
              <Text style={styles.photoSlotText}>Prendre une photo</Text>
            </Pressable>

            <Pressable style={styles.galleryBtn} onPress={handlePickImages}>
              <Feather name="image" size={24} color={colors.secondary} />
              <Text style={styles.galleryBtnText}>Choisir jusqu'à {MAX_AI_PHOTOS} photos</Text>
            </Pressable>

            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>💡 Conseils pour de meilleurs résultats :</Text>
              <Text style={styles.tipItem}>• Photos bien éclairées, de face</Text>
              <Text style={styles.tipItem}>• Produit sur un fond neutre</Text>
              <Text style={styles.tipItem}>• Jusqu'à {MAX_AI_PHOTOS} photos pour un résultat optimal</Text>
            </View>
          </View>
        </ScrollView>
      ) : step === 'uploading' || step === 'generating' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.loadingContainer}>
            {photoUris.length ? (
              <View style={styles.previewRow}>
                {photoUris.slice(0, 3).map((uri, idx) => (
                  <Image key={`preview-${idx}`} source={{ uri }} style={styles.previewImage} contentFit="cover" />
                ))}
              </View>
            ) : null}

            {/* Badge de statut upload (vert si réussi) */}
            {uploadedImageUrls.length > 0 && step === 'generating' ? (
              <View style={styles.uploadSuccessBadge}>
                <Feather name="check-circle" size={16} color={colors.success} />
                <Text style={styles.uploadSuccessText}>
                  {uploadedImageUrls.length} photo(s) téléversée(s) ✓
                </Text>
              </View>
            ) : null}

            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.loadingText}>
              {step === 'uploading'
                ? `Téléversement de ${photoUris.length} photo(s)…`
                : 'L\'IA analyse vos photos...'}
            </Text>
            <Text style={styles.loadingSubtext}>
              {uploadProgress?.phase ?? 'Traitement en cours'}
            </Text>

            {/* Barre de progression animée */}
            {uploadProgress ? (
              <View style={styles.progressBarWrap}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${uploadProgress.pct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressBarPct}>{uploadProgress.pct}%</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : step === 'result' && generated ? (
        <View style={styles.resultLayout}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultContainer}>
              <View style={styles.resultBadgeRow}>
                <View style={styles.resultBadge}>
                  <Feather name="check-circle" size={18} color={colors.success} />
                  <Text style={styles.resultBadgeText}>Suggestions générées !</Text>
                </View>
                <Badge
                  label="Fiche premium"
                  color={colors.textInverse}
                  bgColor={colors.primary}
                  size="md"
                />
              </View>

              {uploadedImageUrls.length || photoUris.length ? (
                <View style={styles.previewSmallRow}>
                  {(uploadedImageUrls.length ? uploadedImageUrls : photoUris).slice(0, 5).map((uri, idx) => (
                    <Image
                      key={`result-${idx}`}
                      source={{ uri }}
                      style={styles.previewSmall}
                      contentFit="cover"
                      transition={200}
                    />
                  ))}
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Titre du produit</Text>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Nom du produit"
                icon="tag"
              />

              <Text style={styles.sectionLabel}>Catégorie détectée</Text>
              <View style={styles.categoryChip}>
                <Feather name="tag" size={14} color={colors.primary} />
                <Text style={styles.categoryText}>{getCategoryName(categoryId)}</Text>
              </View>

              <Text style={styles.sectionLabel}>Description</Text>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Description du produit"
                icon="align-left"
                multiline
                numberOfLines={6}
              />

              <Text style={styles.sectionLabel}>💡 10 Suggestions de noms</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {generated.nameSuggestions.map((suggestion, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleNameSuggestionPress(suggestion)}
                    style={({ pressed }) => [
                      styles.nameChip,
                      name === suggestion && styles.nameChipActive,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nameChipText,
                        name === suggestion && styles.nameChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>🎯 Variantes suggérées</Text>
              <Card style={styles.variantsCard}>
                {generated.variants.map((variant, vIdx) => (
                  <View key={vIdx} style={[styles.variantRow, vIdx > 0 && styles.variantRowDivider]}>
                    <Text style={styles.variantLabel}>{variant.label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantOptionsRow}>
                      {variant.options.map((option, oIdx) => {
                        const isSelected = selectedVariants[variant.label]?.has(option);
                        return (
                          <Pressable
                            key={oIdx}
                            onPress={() => handleVariantOptionPress(variant.label, option)}
                            style={({ pressed }) => [
                              styles.optionChip,
                              isSelected && styles.optionChipActive,
                              pressed && { opacity: 0.7 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionChipText,
                                isSelected && styles.optionChipTextActive,
                              ]}
                            >
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}
              </Card>

              <Text style={styles.sectionLabel}>🔍 Mots-clés SEO longue traîne</Text>
              <View style={styles.keywordsWrap}>
                {generated.longTailKeywords.map((keyword, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleKeywordCopy(keyword)}
                    style={({ pressed }) => [
                      styles.keywordChip,
                      copiedKeyword === keyword && styles.keywordChipCopied,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Feather
                      name={copiedKeyword === keyword ? 'check' : 'copy'}
                      size={14}
                      color={copiedKeyword === keyword ? colors.surface : colors.primary}
                    />
                    <Text
                      style={[
                        styles.keywordChipText,
                        copiedKeyword === keyword && styles.keywordChipTextCopied,
                      ]}
                      numberOfLines={1}
                    >
                      {copiedKeyword === keyword ? 'Copié !' : keyword}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>😀 Emojis vendeurs</Text>
              <View style={styles.emojisRow}>
                {generated.emojis.map((emoji, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleEmojiPress(emoji)}
                    style={({ pressed }) => [
                      styles.emojiChip,
                      pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] },
                    ]}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Prix suggéré</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.suggestedPrice}>{priceSuggestion.toLocaleString('fr-FR')} FCFA</Text>
                <Text style={styles.priceRange}>
                  Entre {minPrice.toLocaleString('fr-FR')} et {maxPrice.toLocaleString('fr-FR')} FCFA
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

              <View style={{ height: spacing.xxxl * 2.5 }} />
            </View>
          </ScrollView>
        </View>
      ) : null}
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  resultLayout: { flex: 1 },
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
  selectedPhotosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  selectedPhotoWrap: { position: 'relative' },
  selectedPhotoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  removeSelectedPhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  addPhotoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBF5',
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
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
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
  uploadSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  uploadSuccessText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  progressBarWrap: {
    width: '80%',
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  progressBarPct: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.semibold,
  },
  resultContainer: { width: '100%' },
  resultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '18',
    padding: spacing.sm,
    borderRadius: radius.lg,
  },
  resultBadgeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  previewSmallRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  previewSmall: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
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
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  nameChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
    maxWidth: 280,
  },
  nameChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nameChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },
  nameChipTextActive: {
    color: colors.textInverse,
  },
  variantsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  variantRow: {
    padding: spacing.md,
  },
  variantRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  variantLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  variantOptionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  optionChipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  optionChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  optionChipTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '12',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    maxWidth: '100%',
  },
  keywordChipCopied: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  keywordChipText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    maxWidth: 260,
  },
  keywordChipTextCopied: {
    color: colors.surface,
    fontWeight: typography.weights.bold,
  },
  emojisRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  emojiChip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
  benchmarkSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  benchmarkCard: {
    padding: spacing.md,
    borderColor: colors.primary + '30',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: { boxShadow: '0px -4px 12px rgba(0,0,0,0.08)' },
    }),
  },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benchmarkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benchmarkTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  benchmarkSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  benchmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  benchmarkItem: {
    width: '48.5%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  benchmarkIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  benchmarkRatio: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.extrabold,
    color: colors.primary,
  },
  benchmarkLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  benchmarkBarRow: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  benchmarkBarBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginVertical: 1,
  },
  benchmarkBar: {
    height: '100%',
    borderRadius: radius.pill,
  },
  benchmarkLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  legendText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    flexShrink: 1,
  },
});
