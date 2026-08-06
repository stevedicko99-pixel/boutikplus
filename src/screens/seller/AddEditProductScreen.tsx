import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Modal, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProduct, createProduct, updateProduct } from '@/lib/dataService';
import { uploadMultipleImages, pickMultipleImages, deleteStorageObject, isLocalMediaUri } from '@/lib/storage';
import { consumeAIResult } from '@/lib/aiResultHolder';
import { consumePhotoResult } from '@/lib/photoResultHolder';
import { deleteProductVideo } from '@/lib/videoService';
import { CATEGORIES, getCategoryName } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProductVideoCard } from '@/components/product/ProductVideoCard';
import { MediaCarousel } from '@/components/product/MediaCarousel';
import { friendlyMessage } from '@/lib/errorMessages';
import { formatFCFA } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { logger } from '@/lib/logger';
import type { Shop, ProductVideo } from '@/types/models';

interface AddEditProductScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params?: { productId?: string; editedImageUri?: string; editIndex?: number } };
}

export function AddEditProductScreen({ navigation, route }: AddEditProductScreenProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const productId = route?.params?.productId;
  const isEdit = Boolean(productId);

  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [stock, setStock] = useState('1');
  const [images, setImages] = useState<string[]>([]);
  const pendingStorageDeletes = useRef<string[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [uploadState, setUploadState] = useState<{ done: number; total: number; label: string } | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getShopByOwner(profile?.id ?? 'demo-seller');
      setShop(s);
      if (productId) {
        const p = await getProduct(productId);
        if (p) {
          setName(p.name);
          setDescription(p.description ?? '');
          setPrice(String(p.price));
          setCategoryId(p.category_id);
          setStock(String(p.stock));
          setImages(p.images?.map((i) => i.image_url) ?? []);
          setVideos(p.videos ?? []);
        }
      }
    })();
  }, [profile, productId]);

  const handleDeleteVideo = async (video: ProductVideo) => {
    Alert.alert(
      'Supprimer la vidéo',
      'Voulez-vous vraiment retirer cette vidéo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteProductVideo(video.id);
            if (error) { Alert.alert('Erreur', friendlyMessage(error)); return; }
            setVideos((prev) => prev.filter((v) => v.id !== video.id));
          },
        },
      ],
    );
  };

  // Réception du résultat du Studio Photo (image éditée).
  useEffect(() => {
    const editedUri = route.params?.editedImageUri;
    if (!editedUri) return;
    const editIndex = route.params?.editIndex;
    setImages((prev) => {
      if (editIndex != null && editIndex >= 0 && editIndex < prev.length) {
        // Remplace l'image existante à editIndex
        const copy = [...prev];
        copy[editIndex] = editedUri;
        return copy;
      }
      // Sinon ajoute (dans la limite de 5)
      if (prev.length >= 10) return prev;
      return [...prev, editedUri];
    });
    // Nettoie les params pour éviter une re-application au prochain render.
    navigation.navigate('AddEditProduct', { productId });
  }, [route.params?.editedImageUri, route.params?.editIndex, productId, navigation]);

  // Consomme les résultats des assistants au retour de focus.
  // Les holders sont one-shot (consume = lit + efface), donc pas besoin de [images].
  useFocusEffect(
    useCallback(() => {
      // 1️⃣ Consomme le résultat du PhotoStudio (holder singleton robuste)
      const photoResult = consumePhotoResult();
      if (photoResult?.editedUri) {
        setImages((prev) => {
          if (photoResult.editIndex != null && photoResult.editIndex >= 0 && photoResult.editIndex < prev.length) {
            // Remplace l'image existante à editIndex
            const copy = [...prev];
            copy[photoResult.editIndex!] = photoResult.editedUri;
            return copy;
          }
          // Sinon ajoute (dans la limite de 5)
          if (prev.length >= 10 || prev.includes(photoResult.editedUri)) return prev;
          return [...prev, photoResult.editedUri];
        });
      }

      // 2️⃣ Consomme le résultat de l'Assistant IA
      const aiResult = consumeAIResult();
      if (!aiResult) return;
      if (aiResult.name) setName(aiResult.name);
      if (aiResult.description) setDescription(aiResult.description);
      if (aiResult.categoryId) setCategoryId(aiResult.categoryId);
      if (aiResult.price) setPrice(String(aiResult.price));
      // Ajoute les images uploadées par l'IA à la galerie du produit (utilisation du prev pour éviter les doublons).
      const aiImageUrls: string[] = [];
      if (aiResult.imageUrl) aiImageUrls.push(aiResult.imageUrl);
      if (aiResult.imageUrls?.length) aiImageUrls.push(...aiResult.imageUrls);
      if (aiImageUrls.length) {
        setImages((prev) => {
          const toAdd = aiImageUrls.filter((u) => !prev.includes(u));
          const available = 10 - prev.length;
          if (available > 0) {
            return [...prev, ...toAdd.slice(0, available)];
          }
          return prev;
        });
      }
      Alert.alert('IA ✓', 'Suggestions appliquées au produit.');
    }, []),
  );

  const handleAddImage = async () => {
    if (images.length >= 10) { Alert.alert('Maximum', '10 photos maximum par produit'); return; }
    const remaining = 10 - images.length;
    const picked = await pickMultipleImages(remaining);
    if (picked.length) {
      setImages((prev) => [...prev, ...picked.map((img) => img.uri)]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const uri = images[index];
    if (uri && uri.startsWith('http') && uri.includes('/product-images/')) {
      pendingStorageDeletes.current.push(uri);
    }
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleEditImage = (index: number) => {
    navigation.navigate('PhotoStudio', {
      returnTo: 'AddEditProduct',
      aspect: '1:1',
      initialUri: images[index],
      editIndex: index,
    });
  };

  const handleSave = async () => {
    if (!shop) { toast.warning('Boutique requise', 'Créez d\'abord votre boutique'); return; }
    if (!name || !price) { toast.warning('Champs obligatoires', 'Nom et prix sont requis'); return; }
    setLoading(true);
    try {
    const priceNum = parseInt(price.replace(/\D/g, ''), 10) || 0;
    const stockNum = parseInt(stock, 10) || 0;

    let imageUrls = images;
    const newImages = images.filter(isLocalMediaUri);
    if (newImages.length) {
      setUploadState({ done: 0, total: newImages.length, label: 'Préparation des images…' });
      try {
        const uploaded = await uploadMultipleImages('product-images', newImages, `prod_${shop.id}`);
        if (uploaded.length !== newImages.length) throw new Error('Téléversement incomplet');
        let uploadedIndex = 0;
        imageUrls = images.map((uri) => isLocalMediaUri(uri) ? uploaded[uploadedIndex++].url : uri);
        setUploadState({ done: newImages.length, total: newImages.length, label: `✅ ${newImages.length} image(s) téléversée(s)` });
      } catch (e: any) {
        toast.error('Échec de l\'upload', friendlyMessage(e?.message ?? 'Erreur de téléversement'));
        setLoading(false);
        setUploadState(null);
        return;
      }
    }

    if (isEdit && productId) {
      const { error } = await updateProduct(productId, {
        name, description, price: priceNum, category_id: categoryId, stock: stockNum,
        status: stockNum > 0 ? 'available' : 'out_of_stock',
        image_urls: imageUrls,
      });
      if (error) { toast.error('Échec de la modification', friendlyMessage(error)); setLoading(false); setUploadState(null); return; }
      toast.success('Produit modifié', 'Votre produit a été mis à jour');
    } else {
      const { error } = await createProduct({
        shopId: shop.id, name, description, price: priceNum, categoryId, stock: stockNum, imageUrls,
      });
      if (error) { toast.error('Échec de la création', friendlyMessage(error)); setLoading(false); setUploadState(null); return; }
      toast.success('Produit ajouté', 'Votre produit est maintenant en ligne');
    }
    const obsoleteUrls = [...pendingStorageDeletes.current];
    pendingStorageDeletes.current = [];
    await Promise.all(obsoleteUrls.map((uri) => deleteStorageObject('product-images', uri)));
    setUploadState(null);
    setLoading(false);
    setTimeout(() => navigation.goBack(), 400);
    } catch (e: any) {
      setLoading(false);
      setUploadState(null);
      toast.error('Erreur inattendue', friendlyMessage(e?.message ?? String(e)));
      logger.error('[AddEditProduct] handleSave error', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} hitSlop={10}><Feather name="arrow-left" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Images */}
        <View style={styles.aiBanner}>
          <Pressable
            style={styles.aiBannerBtn}
            onPress={() => navigation.navigate('AIProductAssistant')}
          >
            <Feather name="cpu" size={18} color={colors.secondary} />
            <Text style={styles.aiBannerText}>Utiliser l'IA pour générer description et prix</Text>
            <Feather name="chevron-right" size={16} color={colors.secondary} />
          </Pressable>
        </View>

        <Text style={styles.label}>Photos ({images.length}/10) · appui long pour retoucher</Text>
        <View style={styles.imageGrid}>
          {images.map((uri, i) => (
            <Pressable
              key={i}
              style={styles.imageSlot}
              onPress={() => handleEditImage(i)}
              onLongPress={() => handleEditImage(i)}
            >
              <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable style={styles.removeImg} onPress={() => handleRemoveImage(i)}>
                <Feather name="x" size={14} color={colors.textInverse} />
              </Pressable>
              <View style={styles.editImgBadge}>
                <Feather name="edit-2" size={9} color={colors.textInverse} />
              </View>
              {i === 0 ? <View style={styles.coverTag}><Text style={styles.coverText}>Couverture</Text></View> : null}
            </Pressable>
          ))}
          {images.length < 10 ? (
            <View style={styles.addImageSlot}>
              <Pressable style={styles.addImageBtn} onPress={handleAddImage}>
                <Feather name="image" size={22} color={colors.primary} />
                <Text style={styles.addImageText}>Galerie</Text>
              </Pressable>
              <View style={styles.addImageDivider} />
              <Pressable
                style={styles.addImageBtn}
                onPress={() => navigation.navigate('PhotoStudio', { returnTo: 'AddEditProduct', aspect: '1:1' })}
              >
                <Feather name="camera" size={22} color={colors.secondary} />
                <Text style={[styles.addImageText, { color: colors.secondary }]}>Studio IA</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Section vidéo */}
        <Text style={styles.label}>Vidéo du produit</Text>
        {isEdit && productId ? (
          <>
            {videos.length > 0 ? (
              <View style={{ marginBottom: spacing.sm }}>
                {videos.map((v) => (
                  <ProductVideoCard key={v.id} video={v} onDelete={handleDeleteVideo} />
                ))}
              </View>
            ) : null}
            {videos.length < 1 ? (
              <Pressable
                style={styles.addVideoSlot}
                onPress={() => navigation.navigate('ProductVideoPicker', { productId, returnTo: 'AddEditProduct' })}
              >
                <Feather name="video" size={22} color={colors.secondary} />
                <Text style={styles.addVideoText}>Ajouter une vidéo (TikTok, YouTube…)</Text>
                <Text style={styles.addVideoHint}>Attirez plus d'acheteurs avec une vidéo</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.videoHintBox}>
            <Feather name="info" size={14} color={colors.info} />
            <Text style={styles.videoHintText}>
              Vous pourrez ajouter une vidéo (lien TikTok/YouTube ou fichier) après
              avoir enregistré le produit.
            </Text>
          </View>
        )}

        <Input label="Nom du produit *" value={name} onChangeText={setName} placeholder="Ex: Robe wax moderne" icon="tag" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Décrivez votre produit..." multiline numberOfLines={4} />
        <Input label="Prix (FCFA) *" value={price} onChangeText={setPrice} placeholder="Ex: 15000" keyboardType="numeric" icon="dollar-sign" />
        <Input label="Stock disponible" value={stock} onChangeText={setStock} placeholder="Ex: 10" keyboardType="numeric" icon="box" />

        <Text style={styles.label}>Catégorie</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} style={[styles.catChip, categoryId === c.id && styles.catChipActive]} onPress={() => setCategoryId(c.id)}>
              <Feather name={c.icon as any} size={14} color={categoryId === c.id ? colors.textInverse : c.color} />
              <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.previewBtn}
            onPress={() => setShowPreview(true)}
          >
            <Feather name="eye" size={18} color={colors.primary} />
            <Text style={styles.previewBtnText}>Aperçu</Text>
          </Pressable>
          {uploadState && (
            <View style={{
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.primary + '55',
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.sm,
            }}>
              <Text style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption,
                color: colors.text,
                marginBottom: 4,
              }}>{uploadState.label}</Text>
              <View style={{
                width: '100%', height: 6, backgroundColor: colors.surface,
                borderRadius: 999, overflow: 'hidden',
              }}>
                <View style={{
                  width: `${Math.round((uploadState.done / Math.max(1, uploadState.total)) * 100)}%`,
                  height: '100%', backgroundColor: colors.primary,
                }} />
              </View>
              <Text style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption,
                color: colors.textMuted,
                marginTop: 3,
                textAlign: 'right',
              }}>{uploadState.done}/{uploadState.total}</Text>
            </View>
          )}
          <Button
            label={isEdit ? 'Enregistrer' : 'Publier le produit'}
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>

      {/* Modal d'aperçu produit - vue acheteur */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <SafeAreaView style={styles.previewContainer} edges={['top']}>
          <View style={styles.previewHeader}>
            <Pressable onPress={() => setShowPreview(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.previewTitle}>Aperçu acheteur</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Carrousel images */}
            {images.length > 0 ? (
              <MediaCarousel
                images={images}
                videos={videos}
                height={320}
              />
            ) : (
              <View style={styles.previewNoImage}>
                <Feather name="image" size={60} color={colors.textMuted} />
                <Text style={styles.previewNoImageText}>Ajoutez des photos pour l'aperçu</Text>
              </View>
            )}

            {/* Info produit */}
            <View style={styles.previewContent}>
              <Text style={styles.previewName}>{name || 'Nom du produit'}</Text>
              <View style={styles.previewPriceRow}>
                <Text style={styles.previewPrice}>{price ? formatFCFA(parseInt(price.replace(/\D/g, ''), 10) || 0) : '0 FCFA'}</Text>
                <View style={styles.previewStock}>
                  <Text style={styles.previewStockText}>{stock} en stock</Text>
                </View>
              </View>
              <Text style={styles.previewCat}>
                <Feather name="tag" size={12} color={colors.textMuted} /> {getCategoryName(categoryId)}
              </Text>
              {description ? (
                <Text style={styles.previewDesc}>{description}</Text>
              ) : (
                <Text style={styles.previewDescPlaceholder}>Description du produit...</Text>
              )}

              {/* Info boutique */}
              {shop ? (
                <View style={styles.previewShopCard}>
                  <Image
                    source={{ uri: shop.logo_url || '' }}
                    style={styles.previewShopLogo}
                    contentFit="cover"
                  />
                  <View style={styles.previewShopInfo}>
                    <Text style={styles.previewShopName}>{shop.name}</Text>
                    <Text style={styles.previewShopCity}>{shop.city}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </View>
              ) : null}

              {/* Simulation actions acheteur */}
              <View style={styles.previewActions}>
                <Pressable style={styles.previewBuyBtn}>
                  <Text style={styles.previewBuyBtnText}>Acheter maintenant</Text>
                </Pressable>
                <Pressable style={styles.previewCartBtn}>
                  <Feather name="shopping-cart" size={18} color={colors.primary} />
                  <Text style={styles.previewCartBtnText}>Ajouter au panier</Text>
                </Pressable>
              </View>

              <Text style={styles.previewDisclaimer}>
                ⚠️ Ceci est un aperçu. Les modifications ne sont pas encore publiées.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  aiBanner: { marginBottom: spacing.md },
  aiBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary + '15',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary + '30',
  },
  aiBannerText: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.secondary,
    fontWeight: typography.weights.semibold,
  },
  label: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, fontWeight: typography.weights.medium, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  imageSlot: { width: 100, height: 100, borderRadius: radius.md, position: 'relative', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  removeImg: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  editImgBadge: { position: 'absolute', bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  coverTag: { position: 'absolute', bottom: 4, left: 4, backgroundColor: colors.primary, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm },
  coverText: { fontFamily: typography.fontFamily, fontSize: 9, fontWeight: typography.weights.bold, color: colors.textInverse },
  addImageSlot: { width: 100, height: 100, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: '#FFF8F0', overflow: 'hidden' },
  addImageBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addImageDivider: { height: 1, backgroundColor: colors.primary + '30', width: '80%' },
  addImageText: { fontFamily: typography.fontFamily, fontSize: 10, color: colors.primary, fontWeight: typography.weights.semibold },
  addVideoSlot: { borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.secondary, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.secondary + '0A', paddingVertical: spacing.lg, marginBottom: spacing.sm },
  addVideoText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.body, color: colors.secondary, fontWeight: typography.weights.semibold },
  addVideoHint: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.textMuted },
  videoHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.info + '12', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  videoHintText: { flex: 1, fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.text, lineHeight: 18 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.small, color: colors.text },
  catChipTextActive: { color: colors.textInverse, fontWeight: typography.weights.semibold },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFF8F0',
  },
  previewBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  saveBtn: { flex: 2 },
  // Preview Modal styles
  previewContainer: { flex: 1, backgroundColor: colors.background },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  previewTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  previewNoImage: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    margin: spacing.lg,
    borderRadius: radius.lg,
  },
  previewNoImageText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  previewContent: { padding: spacing.lg },
  previewName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  previewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  previewPrice: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  previewStock: {
    backgroundColor: colors.success + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  previewStockText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.success,
    fontWeight: typography.weights.semibold,
  },
  previewCat: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  previewDesc: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  previewDescPlaceholder: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  previewShopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  previewShopLogo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  previewShopInfo: { flex: 1 },
  previewShopName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  previewShopCity: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  previewBuyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  previewBuyBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  previewCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#FFF8F0',
  },
  previewCartBtnText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  previewDisclaimer: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.small,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '12',
    borderRadius: radius.md,
  },
});
