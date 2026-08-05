import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import {
  pickAndCompressImage,
  pickMultipleImages,
  uploadImage,
  deleteStorageObject,
  validateFile,
  UploadError,
  type StorageBucket,
  type UploadProgress,
} from '@/lib/storage';
import { pickWithChoice } from '@/lib/photoStudio';
import { logger } from '@/lib/logger';

// ============================================================
// Types
// ============================================================

export interface UploadedImage {
  uri: string;        // URI d'affichage (file://, data:, ou URL publique)
  url?: string;       // URL Supabase si uploadé avec succès
  path?: string;      // Chemin Storage si uploadé
  isUploading?: boolean;
  uploadError?: string | null;
}

interface ImageUploaderProps {
  /** Images déjà présentes (édition) */
  initialImages?: UploadedImage[];
  /** Nombre max d'images (1 par défaut) */
  maxImages?: number;
  /** Bucket Supabase cible */
  bucket: StorageBucket;
  /** Préfixe de nom de fichier */
  filePrefix?: string;
  /** Autoriser la caméra */
  allowCamera?: boolean;
  /** Ratio d'affichage des vignettes (height / width) */
  aspectRatio?: number;
  /** Label du bouton d'ajout */
  addLabel?: string;
  /** Format carré (logo, avatar) */
  square?: boolean;
  /** Appelé quand la liste change */
  onChange?: (images: UploadedImage[]) => void;
  /** Taille maximum en MB (défaut = 5) */
  maxSizeMB?: number;
  /** Test ID */
  testID?: string;
}

// ============================================================
// Composant
// ============================================================

export function ImageUploader({
  initialImages = [],
  maxImages = 1,
  bucket,
  filePrefix = 'img',
  allowCamera = true,
  aspectRatio = 1,
  addLabel = 'Ajouter une photo',
  square = false,
  onChange,
  maxSizeMB,
  testID,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Synchronise avec initialImages (mode édition)
  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  // Notifie le parent
  const notifyChange = useCallback(
    (next: UploadedImage[]) => {
      setImages(next);
      onChange?.(next);
    },
    [onChange],
  );

  // ── Sélection ────────────────────────────────────────────

  const handlePick = useCallback(
    async (fromCamera: boolean) => {
      try {
        const result = await pickAndCompressImage(fromCamera);
        if (!result) return;

        const validationError = validateFile(
          { uri: result.uri, size: (result as any).fileSize },
          false,
        );
        if (validationError) {
          Alert.alert('Fichier invalide', validationError.message);
          return;
        }

        const newImage: UploadedImage = { uri: result.uri, isUploading: false };
        const next = [...images, newImage].slice(0, maxImages);
        notifyChange(next);

        // Upload auto vers Supabase
        handleUpload(newImage, next.length - 1, next);
      } catch (e: any) {
        logger.error('ImageUploader: pick error', e);
        Alert.alert('Erreur', e?.message ?? 'Impossible de sélectionner l\'image');
      }
    },
    [images, maxImages, notifyChange],
  );

  // ── Upload ────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (image: UploadedImage, index: number, currentList: UploadedImage[]) => {
      if (!image.uri.startsWith('file:') && !image.uri.startsWith('data:') && !image.uri.startsWith('blob:')) {
        return; // Déjà uploadé (URL publique)
      }

      // Marque en cours
      const pendingList = currentList.map((img, i) =>
        i === index ? { ...img, isUploading: true, uploadError: null } : img,
      );
      notifyChange(pendingList);

      try {
        const uploaded = await uploadImage(
          bucket,
          image.uri,
          `${filePrefix}_${Date.now()}`,
          (progress: UploadProgress) => {
            // Màj de la progression (facultatif, via image metadata)
          },
        );

        if (uploaded) {
          const successList = pendingList.map((img, i) =>
            i === index
              ? { ...img, uri: uploaded.url, url: uploaded.url, path: uploaded.path, isUploading: false, uploadError: null }
              : img,
          );
          notifyChange(successList);
          Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.delay(1200),
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start();
        } else {
          // Mode démo : upload non disponible, on garde l'URI locale
          const localList = pendingList.map((img, i) =>
            i === index ? { ...img, isUploading: false, uploadError: null } : img,
          );
          notifyChange(localList);
        }
      } catch (e: any) {
        const msg = e instanceof UploadError ? e.message : e?.message ?? 'Échec de l\'upload';
        const errorList = pendingList.map((img, i) =>
          i === index ? { ...img, isUploading: false, uploadError: msg } : img,
        );
        notifyChange(errorList);
        Alert.alert('Erreur d\'upload', msg);
      }
    },
    [bucket, filePrefix, notifyChange, fadeAnim],
  );

  // ── Suppression ───────────────────────────────────────────

  const handleRemove = useCallback(
    async (index: number) => {
      const image = images[index];
      if (!image) return;

      Alert.alert('Retirer l\'image', 'Voulez-vous vraiment retirer cette image ?', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            // Supprime du Storage si uploadé
            if (image.path && image.url) {
              await deleteStorageObject(bucket, image.url);
            }
            const next = images.filter((_, i) => i !== index);
            notifyChange(next);
          },
        },
      ]);
    },
    [images, bucket, notifyChange],
  );

  // ── Remplacement (mode single) ───────────────────────────

  const handleReplace = useCallback(
    async (index: number) => {
      try {
        const result = await pickWithChoice('1:1');
        if (!result) return;

        const validationError = validateFile({ uri: result }, false);
        if (validationError) {
          Alert.alert('Fichier invalide', validationError.message);
          return;
        }

        const newImage: UploadedImage = { uri: result, isUploading: false };
        const next = images.map((img, i) => (i === index ? newImage : img));
        notifyChange(next);
        handleUpload(newImage, index, next);
      } catch (e: any) {
        logger.error('ImageUploader: replace error', e);
        Alert.alert('Erreur', e?.message ?? 'Impossible de remplacer l\'image');
      }
    },
    [images, notifyChange, handleUpload],
  );

  // ── Rendu ──────────────────────────────────────────────────

  const canAddMore = images.length < maxImages;

  return (
    <View style={styles.container} testID={testID}>
      {/* Badge de succès */}
      <Animated.View
        style={[
          styles.successBadge,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <Feather name="check-circle" size={16} color={colors.success} />
        <Text style={styles.successText}>Image téléversée ✓</Text>
      </Animated.View>

      <View style={[styles.grid, square && styles.gridSquare]}>
        {/* Images existantes */}
        {images.map((img, index) => (
          <View
            key={`${img.uri}-${index}`}
            style={[
              styles.thumbWrap,
              { aspectRatio: square ? 1 : aspectRatio },
            ]}
          >
            <Image source={{ uri: img.uri }} style={styles.thumbImage} contentFit="cover" />

            {/* Overlay pendant upload */}
            {img.isUploading && (
              <View style={styles.uploadingOverlay}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '60%' }]} />
                </View>
                <Text style={styles.uploadingText}>Téléversement…</Text>
              </View>
            )}

            {/* Erreur */}
            {img.uploadError ? (
              <View style={styles.errorOverlay}>
                <Feather name="alert-circle" size={20} color={colors.danger} />
                <Text style={styles.errorText}>Échec</Text>
              </View>
            ) : null}

            {/* Boutons d'action */}
            {!img.isUploading && (
              <>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => handleRemove(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer l'image"
                >
                  <Feather name="x" size={14} color={colors.textInverse} />
                </Pressable>
                <Pressable
                  style={styles.replaceBtn}
                  onPress={() => handleReplace(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remplacer l'image"
                >
                  <Feather name="refresh-cw" size={12} color={colors.textInverse} />
                  <Text style={styles.replaceText}>Remplacer</Text>
                </Pressable>
              </>
            )}
          </View>
        ))}

        {/* Bouton d'ajout */}
        {canAddMore && (
          <Pressable
            style={[styles.addBtn, { aspectRatio: square ? 1 : aspectRatio }]}
            onPress={() => {
              if (allowCamera) {
                Alert.alert('Ajouter une photo', 'Choisissez la source :', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Galerie', onPress: () => handlePick(false) },
                  { text: 'Appareil photo', onPress: () => handlePick(true) },
                ]);
              } else {
                handlePick(false);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
          >
            <Feather name="plus" size={28} color={colors.primary} />
            <Text style={styles.addLabel}>{addLabel}</Text>
            <Text style={styles.addHint}>
              {maxImages > 1 ? `${images.length}/${maxImages}` : 'JPG, PNG · Max 5MB'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { position: 'relative' },
  successBadge: {
    position: 'absolute',
    top: -spacing.sm,
    left: spacing.sm,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#E6F7EE',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  successText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridSquare: { gap: spacing.md },
  thumbWrap: {
    width: '31%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    ...shadows.fani,
  },
  thumbImage: { width: '100%', height: '100%' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  progressBarBg: {
    width: '70%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  uploadingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  replaceBtn: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  replaceText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  addBtn: {
    width: '31%',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF8F0',
    minHeight: 44,
  },
  addLabel: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  addHint: {
    fontFamily: typography.fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
