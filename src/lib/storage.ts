import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { logger } from '@/lib/logger';

export type StorageBucket = 'shop-logos' | 'shop-covers' | 'product-images' | 'payment-proofs' | 'delivery-proofs' | 'driver-id-cards' | 'profile-avatars' | 'ai-source-images';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/** Limites de fichiers (adaptées aux connexions burkinabè) */
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_VIDEO_SIZE_MB: 25,
  // On accepte tout type d'image — le système la convertit en JPEG automatiquement
  ACCEPTED_IMAGE_TYPES: [] as string[],
  ACCEPTED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
};

/** Erreurs d'upload user-friendly */
export class UploadError extends Error {
  constructor(message: string, public code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'AUTH_REQUIRED') {
    super(message);
    this.name = 'UploadError';
  }
}

/** Valide un fichier avant upload. Retourne null si OK, sinon un UploadError. */
export function validateFile(file: { size?: number; type?: string; uri?: string }, isVideo = false): UploadError | null {
  const maxSize = isVideo ? UPLOAD_LIMITS.MAX_VIDEO_SIZE_MB : UPLOAD_LIMITS.MAX_IMAGE_SIZE_MB;
  const acceptedTypes = isVideo ? UPLOAD_LIMITS.ACCEPTED_VIDEO_TYPES : UPLOAD_LIMITS.ACCEPTED_IMAGE_TYPES;

  if (file.size && file.size > maxSize * 1024 * 1024) {
    return new UploadError(
      `Fichier trop lourd (${Math.round(file.size / (1024 * 1024))}MB). Maximum ${maxSize}MB.`,
      'FILE_TOO_LARGE',
    );
  }

  // Pour les images, on accepte tout — la compression se charge de la conversion
  if (isVideo && file.type && acceptedTypes.length > 0 && !acceptedTypes.includes(file.type.toLowerCase())) {
    return new UploadError(
      `Format vidéo non supporté (${file.type}). Formats acceptés : ${acceptedTypes.join(', ')}`,
      'UNSUPPORTED_TYPE',
    );
  }

  return null;
}

/** Détecte les URI de médias qui doivent encore être téléversées. */
export const isLocalMediaUri = (uri?: string | null): boolean => {
  return !!uri && /^(file|content|data|blob):/i.test(uri);
};

/** Détecte si une URI est une URI blob générée par expo-image-manipulator/expo-image-picker sur web */
export const isBlobUri = (uri?: string | null): boolean => {
  return !!uri && uri.startsWith('blob:');
};

/**
 * Convertit une URI blob: en DataURI (base64) de manière synchrone via FileReader.
 * Nécessaire sur Web car expo-image <Image> ne rend pas toujours correctement les blob:.
 */
export const blobToDataUri = async (blobUri: string): Promise<string> => {
  try {
    const response = await fetch(blobUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    logger.error('blobToDataUri: conversion failed', e);
    throw e;
  }
};

/**
 * Garantit qu'une URI peut être affichée par <Image> de expo-image.
 * Sur Web, transforme les blob: en data URI. Sur mobile, conserve file:// tel quel.
 */
export const ensureDisplayableUri = async (uri?: string | null): Promise<string | null> => {
  if (!uri) return null;
  if (Platform.OS !== 'web') return uri;
  if (!isBlobUri(uri)) return uri;
  return blobToDataUri(uri);
};

/** Ouvre la galerie ou l'appareil photo et renvoie une image compressée */
export const pickAndCompressImage = async (
  useCamera = false,
): Promise<ImageManipulator.ImageResult | null> => {
  let pickerResult: ImagePicker.ImagePickerResult;
  try {
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        logger.warn('pickAndCompressImage: camera permission denied');
        return null;
      }
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        logger.warn('pickAndCompressImage: media library permission denied');
        return null;
      }
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        selectionLimit: 1,
      });
    }
  } catch (e) {
    logger.error('pickAndCompressImage: picker error', e);
    return null;
  }

  if (pickerResult.canceled || !pickerResult.assets?.length) return null;

  const asset: ImagePickerAsset = pickerResult.assets[0];
  try {
    const compressed = await compressImage(asset.uri);
    // Sur Web, manipulator retourne une URI blob: ; on la convertit pour l'affichage.
    if (Platform.OS === 'web' && isBlobUri(compressed.uri)) {
      const displayUri = await ensureDisplayableUri(compressed.uri);
      return { ...compressed, uri: displayUri ?? compressed.uri };
    }
    return compressed;
  } catch (e) {
    // La compression peut échouer sur certaines plateformes (web, URIs non standard).
    // Fallback : retourner l'URI originale non compressée plutôt que null.
    logger.warn('pickAndCompressImage: compression failed, using original URI', {
      error: e instanceof Error ? e.message : String(e),
    });
    return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 } as ImageManipulator.ImageResult;
  }
};

/** Ouvre la galerie et renvoie jusqu'à `max` images compressées (sélection multiple) */
export const pickMultipleImages = async (
  max = 5,
): Promise<ImageManipulator.ImageResult[]> => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      logger.warn('pickMultipleImages: media library permission denied');
      return [];
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: max,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) return [];

    const compressedImages: ImageManipulator.ImageResult[] = [];
    for (const asset of pickerResult.assets.slice(0, max)) {
      try {
        const compressed = await compressImage(asset.uri);
        if (Platform.OS === 'web' && isBlobUri(compressed.uri)) {
          const displayUri = await ensureDisplayableUri(compressed.uri);
          compressedImages.push({ ...compressed, uri: displayUri ?? compressed.uri });
        } else {
          compressedImages.push(compressed);
        }
      } catch (e) {
        logger.warn('pickMultipleImages: compression failed, using original URI', {
          error: e instanceof Error ? e.message : String(e),
        });
        compressedImages.push({
          uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
        } as ImageManipulator.ImageResult);
      }
    }
    return compressedImages;
  } catch (e) {
    logger.error('pickMultipleImages: picker error', e);
    return [];
  }
};

/** Compresse une image : max 800px de large, JPEG 0.7 */
export const compressImage = async (
  uri: string,
): Promise<ImageManipulator.ImageResult> => {
  return ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
};

/**
 * Récupère l'ID utilisateur courant pour construire le chemin d'upload.
 * Le chemin `{userId}/filename` permet aux politiques RLS Storage de
 * vérifier que l'utilisateur n'écrit que dans son propre dossier.
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Téléverse une image vers un bucket Supabase Storage avec support de progression et timeout */
export const uploadImage = async (
  bucket: StorageBucket,
  localUri: string,
  filePrefix = 'img',
  onProgress?: UploadProgressCallback,
  timeoutMs = 20000,
): Promise<UploadResult | null> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error('uploadImage: utilisateur non authentifié');
    throw new UploadError('Utilisateur non connecté', 'AUTH_REQUIRED');
  }

  const ext = 'jpg';
  const fileName = `${filePrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const path = `${userId}/${fileName}`;

  let body: Blob | ArrayBuffer;
  try {
    const response = await fetch(localUri);
    body = Platform.OS === 'web' ? await response.blob() : await response.arrayBuffer();
  } catch (e) {
    logger.error('uploadImage: conversion binaire impossible', e);
    throw new UploadError('Conversion de l\'image impossible', 'UPLOAD_FAILED');
  }

  // Timeout pour éviter de bloquer indéfiniment (réseaux burkinabè instables)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new UploadError('Temps dépassé - réseau instable', 'NETWORK_ERROR')), timeoutMs);
  });

  try {
    if (onProgress) {
      let simulated = 5;
      onProgress({ loaded: simulated, total: 100, percent: simulated });
    }

    const uploadPromise = (async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, body, {
          contentType: 'image/jpeg',
          upsert: false,
          ...(onProgress ? {
            onProgress: (event: any) => {
              if (event?.total && event?.loaded != null) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress({ loaded: event.loaded, total: event.total, percent });
              }
            },
          } : {}),
        });

      if (error) {
        logger.error('Upload error', error);
        // Ne plus masquer les erreurs bucket/JWT — l'utilisateur doit savoir
        throw new UploadError(
          error.message?.includes('bucket')
            ? `Bucket de stockage introuvable (${bucket}). Contactez un admin.`
            : error.message?.includes('policy') || error.message?.includes('row-level')
              ? `Permission refusée pour l'upload (${bucket}).`
              : `Échec de l'upload : ${error.message}`,
          'UPLOAD_FAILED',
        );
      }

      if (onProgress) {
        onProgress({ loaded: 100, total: 100, percent: 100 });
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return { url: publicUrlData.publicUrl, path: data.path };
    })();

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (e: any) {
    if (e instanceof UploadError) throw e;
    logger.error('uploadImage: exception', e);
    throw new UploadError(e?.message ?? 'Erreur réseau', 'NETWORK_ERROR');
  }
};

/** Supprime un objet Supabase Storage à partir de son URL publique */
export const deleteStorageObject = async (
  bucket: StorageBucket,
  publicUrl: string,
): Promise<boolean> => {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    const path = idx !== -1 ? publicUrl.slice(idx + marker.length) : publicUrl.split('/').pop();
    if (!path) {
      logger.warn('deleteStorageObject: impossible de déterminer le chemin', { bucket, publicUrl });
      return false;
    }
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      logger.error('deleteStorageObject: erreur Supabase', error);
      return false;
    }
    return true;
  } catch (e) {
    logger.error('deleteStorageObject: exception', e);
    return false;
  }
};

/** Téléverse plusieurs images vers un bucket */
export const uploadMultipleImages = async (
  bucket: StorageBucket,
  localUris: string[],
  filePrefix = 'img',
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  for (const uri of localUris) {
    const uploaded = await uploadImage(bucket, uri, filePrefix);
    if (uploaded) results.push(uploaded);
  }
  return results;
};
