import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getShopByOwner, getProduct, createProduct, updateProduct } from '@/lib/dataService';
import { uploadMultipleImages } from '@/lib/storage';
import { deleteProductVideo } from '@/lib/videoService';
import { CATEGORIES } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProductVideoCard } from '@/components/product/ProductVideoCard';
import { friendlyMessage } from '@/lib/errorMessages';
import type { Shop, ProductVideo } from '@/types/models';

import { showAlert } from '@/lib/dialog';
interface AddEditProductScreenProps {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
  route: { params?: { productId?: string; editedImageUri?: string; editIndex?: number } };
}

export function AddEditProductScreen({ navigation, route }: AddEditProductScreenProps) {
  const { profile } = useAuth();
  const productId = route?.params?.productId;
  const isEdit = Boolean(productId);

  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [stock, setStock] = useState('1');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [loading, setLoading] = useState(false);

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
    showAlert(
      'Supprimer la vidéo',
      'Voulez-vous vraiment retirer cette vidéo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteProductVideo(video.id);
            if (error) { showAlert('Erreur', friendlyMessage(error)); return; }
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
      if (prev.length >= 5) return prev;
      return [...prev, editedUri];
    });
    // Nettoie les params pour éviter une re-application au prochain render.
    navigation.navigate('AddEditProduct', { productId });
  }, [route.params?.editedImageUri, route.params?.editIndex, productId, navigation]);

  const handleAddImage = () => {
    if (images.length >= 5) { showAlert('Maximum', '5 photos maximum par produit'); return; }
    navigation.navigate('PhotoStudio', { returnTo: 'AddEditProduct', aspect: '1:1' });
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
    if (!shop) { showAlert('Erreur', 'Créez d\'abord une boutique'); return; }
    if (!name || !price) { showAlert('Erreur', 'Nom et prix obligatoires'); return; }
    setLoading(true);
    const priceNum = parseInt(price.replace(/\D/g, ''), 10) || 0;
    const stockNum = parseInt(stock, 10) || 0;

    let imageUrls = images;
    // Téléversement des nouvelles images (en mode Supabase)
    const newImages = images.filter((u) => u.startsWith('file://'));
    if (newImages.length) {
      const uploaded = await uploadMultipleImages('product-images', newImages, `prod_${shop.id}`);
      imageUrls = [...images.filter((u) => !u.startsWith('file://')), ...uploaded.map((u) => u.url)];
    }

    if (isEdit && productId) {
      const { error } = await updateProduct(productId, {
        name, description, price: priceNum, category_id: categoryId, stock: stockNum,
        status: stockNum > 0 ? 'available' : 'out_of_stock',
      });
      if (error) { showAlert('Erreur', friendlyMessage(error)); setLoading(false); return; }
    } else {
      const { error } = await createProduct({
        shopId: shop.id, name, description, price: priceNum, categoryId, stock: stockNum, imageUrls,
      });
      if (error) { showAlert('Erreur', friendlyMessage(error)); setLoading(false); return; }
    }
    setLoading(false);
    showAlert('Succès ✓', isEdit ? 'Produit modifié' : 'Produit ajouté', [{ text: 'OK', onPress: navigation.goBack }]);
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

        <Text style={styles.label}>Photos ({images.length}/5) · appui long pour retoucher</Text>
        <View style={styles.imageGrid}>
          {images.map((uri, i) => (
            <Pressable
              key={i}
              style={styles.imageSlot}
              onPress={() => handleEditImage(i)}
              onLongPress={() => handleEditImage(i)}
            >
              <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
              <Pressable style={styles.removeImg} onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                <Feather name="x" size={14} color={colors.textInverse} />
              </Pressable>
              <View style={styles.editImgBadge}>
                <Feather name="edit-2" size={9} color={colors.textInverse} />
              </View>
              {i === 0 ? <View style={styles.coverTag}><Text style={styles.coverText}>Couverture</Text></View> : null}
            </Pressable>
          ))}
          {images.length < 5 ? (
            <Pressable style={styles.addImageSlot} onPress={handleAddImage}>
              <Feather name="camera" size={24} color={colors.primary} />
              <Text style={styles.addImageText}>Ajouter</Text>
            </Pressable>
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

        <Button label={isEdit ? 'Enregistrer les modifications' : 'Publier le produit'} onPress={handleSave} loading={loading} style={{ marginTop: spacing.xl, marginBottom: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontFamily: typography.fontFamily, fontSize: typography.sizes.heading, fontWeight: typography.weights.bold, color: colors.text },
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
  addImageSlot: { width: 100, height: 100, borderRadius: radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFF8F0' },
  addImageText: { fontFamily: typography.fontFamily, fontSize: typography.sizes.caption, color: colors.primary, fontWeight: typography.weights.semibold },
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
});
