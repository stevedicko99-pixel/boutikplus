import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { logger } from '@/lib/logger';

export type StorageBucket = 'shop-logos' | 'shop-covers' | 'product-images' | 'payment-proofs' | 'delivery-proofs' | 'driver-id-cards' | 'profile-avatars' | 'ai-source-images' | 'chat-media';

export interface UploadResult {
  url: string;
  path: string;
  imageCode: string;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadImageOptions {
  fileCode?: string;
  path?: string;
  maxRetries?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_VIDEO_SIZE_MB: 25,
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ACCEPTED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
};

export class UploadError extends Error {
  constructor(
    message: string,
    public code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'UPLOAD_FAILED' | 'NETWORK_ERROR' | 'AUTH_REQUIRED',
    public uploadIdentity?: { imageCode: string; path: string },
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export function validateFile(file: { size?: number; type?: string; uri?: string }, isVideo = false): UploadError | null {
  const maxSize = isVideo ? UPLOAD_LIMITS.MAX_VIDEO_SIZE_MB : UPLOAD_LIMITS.MAX_IMAGE_SIZE_MB;
  const acceptedTypes = isVideo ? UPLOAD_LIMITS.ACCEPTED_VIDEO_TYPES : UPLOAD_LIMITS.ACCEPTED_IMAGE_TYPES;

  if (file.size && file.size > maxSize * 1024 * 1024) {
    return new UploadError(
      `Fichier trop lourd (${Math.round(file.size / (1024 * 1024))}MB). Maximum ${maxSize}MB.`,
      'FILE_TOO_LARGE',
    );
  }

  if (file.type && acceptedTypes.length > 0 && !acceptedTypes.includes(file.type.toLowerCase())) {
    return new UploadError(
      isVideo
        ? `Format vidéo non supporté (${file.type}). Formats acceptés : MP4, MOV ou WebM.`
        : `Format d’image non supporté (${file.type}). Formats acceptés : JPEG, PNG ou WebP.`,
      'UNSUPPORTED_TYPE',
    );
  }

  return null;
}

export const isLocalMediaUri = (uri?: string | null): boolean => {
  return !!uri && /^(file|content|data|blob):/i.test(uri);
};

export const isBlobUri = (uri?: string | null): boolean => {
  return !!uri && uri.startsWith('blob:');
};

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

export const ensureDisplayableUri = async (uri?: string | null): Promise<string | null> => {
  if (!uri) return null;
  if (!isBlobUri(uri)) return uri;
  return blobToDataUri(uri);
};

interface CompressResult {
  uri: string;
  width: number;
  height: number;
}

async function compressImageWithCanvas(
  uri: string,
  maxWidth = 800,
  quality = 0.7,
): Promise<CompressResult> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = uri;
  });

  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { uri, width: img.width, height: img.height };
  }
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<CompressResult>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve({ uri, width: img.width, height: img.height });
          return;
        }
        const resultUri = URL.createObjectURL(blob);
        resolve({ uri: resultUri, width, height });
      },
      'image/jpeg',
      quality,
    );
  });
}

export const pickAndCompressImage = async (
  useCamera = false,
): Promise<CompressResult | null> => {
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
  const validationError = validateFile({
    uri: asset.uri,
    size: asset.fileSize,
    type: asset.mimeType,
  });
  if (validationError) throw validationError;

  try {
    const compressed = await compressImageWithCanvas(asset.uri, 800, 0.7);
    if (isBlobUri(compressed.uri)) {
      const displayUri = await ensureDisplayableUri(compressed.uri);
      return { ...compressed, uri: displayUri ?? compressed.uri };
    }
    return compressed;
  } catch (e) {
    logger.warn('pickAndCompressImage: compression failed, using original URI', {
      error: e instanceof Error ? e.message : String(e),
    });
    return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 };
  }
};

export const pickMultipleImages = async (
  max = 5,
): Promise<CompressResult[]> => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return [];

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: max,
    });

    if (pickerResult.canceled || !pickerResult.assets?.length) return [];

    const selectedAssets = pickerResult.assets.slice(0, max);
    for (const asset of selectedAssets) {
      const validationError = validateFile({
        uri: asset.uri,
        size: asset.fileSize,
        type: asset.mimeType,
      });
      if (validationError) throw validationError;
    }

    const results: CompressResult[] = [];
    for (const asset of selectedAssets) {
      try {
        const compressed = await compressImageWithCanvas(asset.uri, 800, 0.7);
        if (isBlobUri(compressed.uri)) {
          const displayUri = await ensureDisplayableUri(compressed.uri);
          results.push({ ...compressed, uri: displayUri ?? compressed.uri });
        } else {
          results.push(compressed);
        }
      } catch (e) {
        logger.warn('pickMultipleImages: compression failed, using original URI', {
          error: e instanceof Error ? e.message : String(e),
        });
        results.push({ uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 });
      }
    }
    return results;
  } catch (e) {
    if (e instanceof UploadError) throw e;
    logger.error('pickMultipleImages: picker error', e);
    return [];
  }
};

export const compressImage = async (uri: string): Promise<CompressResult> => {
  return compressImageWithCanvas(uri, 800, 0.7);
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const uploadImage = async (
  bucket: StorageBucket,
  localUri: string,
  filePrefix = 'img',
  onProgress?: UploadProgressCallback,
  timeoutMs = 20000,
  options: UploadImageOptions = {},
): Promise<UploadResult | null> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error('uploadImage: utilisateur non authentifié');
    throw new UploadError('Utilisateur non connecté', 'AUTH_REQUIRED');
  }

  const imageCode = options.fileCode ?? `${filePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
  const path = options.path ?? `${userId}/${imageCode}.jpg`;
  let body: Blob;
  let sizeBytes = 0;
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    sizeBytes = blob.size;
    const validationError = validateFile({ size: sizeBytes, type: 'image/jpeg', uri: localUri });
    if (validationError) throw validationError;
    body = blob;
  } catch (e) {
    if (e instanceof UploadError) {
      e.uploadIdentity = { imageCode, path };
      throw e;
    }
    logger.error('uploadImage: conversion binaire impossible', e);
    throw new UploadError('Conversion de l’image impossible', 'UPLOAD_FAILED', { imageCode, path });
  }

  const maxRetries = Math.max(0, options.maxRetries ?? 1);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new UploadError('Temps dépassé - réseau instable', 'NETWORK_ERROR')), timeoutMs);
      });
      const uploadPromise = supabase.storage.from(bucket).upload(path, body, {
        contentType: 'image/jpeg',
        upsert: attempt > 0,
      });
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      if (error) {
        const transient = /network|fetch|timeout|5\d\d/i.test(error.message ?? '');
        if (transient && attempt < maxRetries) continue;
        throw new UploadError(
          error.message?.includes('bucket')
            ? `Bucket de stockage introuvable (${bucket}). Contactez un admin.`
            : error.message?.includes('policy') || error.message?.includes('row-level')
              ? `Permission refusée pour le téléversement (${bucket}).`
              : `Échec du téléversement : ${error.message}`,
          transient ? 'NETWORK_ERROR' : 'UPLOAD_FAILED',
          { imageCode, path },
        );
      }
      onProgress?.({ loaded: sizeBytes, total: sizeBytes, percent: 100 });
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { url: publicUrlData.publicUrl, path: data.path, imageCode, sizeBytes, mimeType: 'image/jpeg' };
    } catch (e: any) {
      if (timer) clearTimeout(timer);
      const transient = e instanceof UploadError
        ? e.code === 'NETWORK_ERROR'
        : /network|fetch|timeout|timed out/i.test(e?.message ?? '');
      if (transient && attempt < maxRetries) continue;
      if (e instanceof UploadError) {
        e.uploadIdentity ??= { imageCode, path };
        throw e;
      }
      logger.error('uploadImage: exception', e);
      throw new UploadError(e?.message ?? 'Erreur réseau', 'NETWORK_ERROR', { imageCode, path });
    }
  }
  throw new UploadError(
    'Échec du téléversement après plusieurs tentatives',
    'NETWORK_ERROR',
    { imageCode, path },
  );
};

export const deleteStorageObject = async (
  bucket: StorageBucket,
  publicUrl: string,
): Promise<boolean> => {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    const path = idx !== -1 ? publicUrl.slice(idx + marker.length) : publicUrl.split('/').pop();
    if (!path) return false;
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

export const uploadMultipleImages = async (
  bucket: StorageBucket,
  localUris: string[],
  filePrefix = 'img',
  concurrency = 3,
  onFileState?: (index: number, state: 'uploading' | 'success' | 'error', result?: UploadResult, error?: string) => void,
): Promise<UploadResult[]> => {
  const results = new Array<UploadResult>(localUris.length);
  const errors = new Array<unknown>(localUris.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < localUris.length) {
      const index = nextIndex++;
      onFileState?.(index, 'uploading');
      try {
        const uploaded = await uploadImage(bucket, localUris[index], filePrefix);
        if (!uploaded) throw new UploadError('Téléversement incomplet', 'UPLOAD_FAILED');
        results[index] = uploaded;
        onFileState?.(index, 'success', uploaded);
      } catch (error) {
        errors[index] = error;
        onFileState?.(index, 'error', undefined, error instanceof Error ? error.message : String(error));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), localUris.length) }, worker));
  const firstError = errors.find(Boolean);
  if (firstError) throw firstError;
  return results;
};
