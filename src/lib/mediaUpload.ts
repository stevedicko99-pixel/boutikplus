import { Platform } from 'react-native';
import { supabase } from './supabase';
import { logger } from './logger';
import * as FileSystem from 'expo-file-system';

export interface MediaUploadResult {
  url: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Récupère un Blob depuis une URI locale, en gérant différemment web et natif.
 *
 * - Sur **web** : les URIs sont des `blob:` (créés par URL.createObjectURL) ou
 *   des `data:`. `expo-file-system` n'existe pas sur web — on utilise `fetch()`.
 * - Sur **natif** : on lit le fichier via `FileSystem.readAsStringAsync(base64)`,
 *   puis on convertit en Blob via `base64ToBlob` (atob n'existe pas sur RN natif).
 */
async function uriToBlob(
  localUri: string,
  mimeType: string,
): Promise<{ blob: Blob; sizeBytes: number }> {
  if (Platform.OS === 'web') {
    // Sur web, fetch gère blob:, data:, et http(s): URIs nativement.
    const response = await fetch(localUri);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('MEDIA_EMPTY');
    return { blob, sizeBytes: blob.size };
  }

  // --- Natif : expo-file-system
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }
  const sizeBytes = fileInfo.size ?? 0;
  if (sizeBytes === 0) {
    throw new Error('MEDIA_EMPTY');
  }
  if (sizeBytes > 50 * 1024 * 1024) {
    throw new Error('MEDIA_TOO_LARGE');
  }
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const blob = base64ToBlob(base64, mimeType);
  if (blob.size === 0) throw new Error('MEDIA_EMPTY');
  return { blob, sizeBytes };
}

/**
 * Upload a media file (audio or video) to Supabase storage
 */
export async function uploadMediaFile(
  bucket: 'chat-media',
  conversationId: string,
  localUri: string,
  fileType: 'audio' | 'video',
  onProgress?: (progress: number) => void,
): Promise<MediaUploadResult> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    const mimeType = fileType === 'audio' ? 'audio/m4a' : 'video/mp4';
    const extension = fileType === 'audio' ? 'm4a' : 'mp4';
    const timestamp = Date.now();
    const fileName = `${fileType}-${timestamp}.${extension}`;
    const path = `${conversationId}/${userId}/${fileName}`;

    // Vérification taille + récupération du Blob (web vs natif)
    const { blob, sizeBytes } = await uriToBlob(localUri, mimeType);
    if (sizeBytes > 50 * 1024 * 1024) {
      throw new Error('MEDIA_TOO_LARGE');
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      logger.error('Media upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    if (onProgress) {
      onProgress(100);
    }

    return {
      url: urlData.publicUrl,
      path: data.path,
      sizeBytes,
      mimeType,
    };
  } catch (error) {
    logger.error('uploadMediaFile error:', error);
    throw error;
  }
}

/**
 * Convert base64 string to Blob (natif uniquement — web utilise fetch)
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
