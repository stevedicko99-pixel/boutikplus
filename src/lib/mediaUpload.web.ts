import { supabase } from './supabase';
import { logger } from './logger';

const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

export interface MediaUploadResult {
  url: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
}

function getExtension(mimeType: string, fileType: 'audio' | 'video'): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('m4a')) return 'm4a';
  return fileType === 'audio' ? 'webm' : 'mp4';
}

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
    if (!userId) throw new Error('AUTH_REQUIRED');

    onProgress?.(10);
    const response = await fetch(localUri);
    if (!response.ok) throw new Error('MEDIA_READ_FAILED');
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('MEDIA_EMPTY');
    if (blob.size > MAX_MEDIA_SIZE) throw new Error('MEDIA_TOO_LARGE');

    const fallbackMime = fileType === 'audio' ? 'audio/webm' : 'video/webm';
    const mimeType = blob.type || fallbackMime;
    const allowedMimeTypes = fileType === 'audio'
      ? ['audio/webm', 'audio/mp4', 'audio/m4a']
      : ['video/webm', 'video/mp4'];
    if (!allowedMimeTypes.some((type) => mimeType.toLowerCase().startsWith(type))) {
      throw new Error('MEDIA_FORMAT_UNSUPPORTED');
    }
    const extension = getExtension(mimeType, fileType);
    const path = `${conversationId}/${userId}/${fileType}-${Date.now()}.${extension}`;

    onProgress?.(35);
    const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw new Error(`UPLOAD_FAILED:${error.message}`);

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    onProgress?.(100);
    return { url: urlData.publicUrl, path: data.path, sizeBytes: blob.size, mimeType };
  } catch (error) {
    logger.error('uploadMediaFile error:', error);
    throw error;
  }
}
