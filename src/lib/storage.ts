import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerAsset } from 'expo-image-picker';
import { logger } from '@/lib/logger';

export type StorageBucket = 'shop-logos' | 'product-images' | 'payment-proofs' | 'delivery-proofs';

export interface UploadResult {
  url: string;
  path: string;
}

/** Ouvre la galerie ou l'appareil photo et renvoie une image compressée */
export const pickAndCompressImage = async (
  useCamera = false,
): Promise<ImageManipulator.ImageResult | null> => {
  let pickerResult: ImagePicker.ImagePickerResult;
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    pickerResult = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 0,
    });
  }

  if (pickerResult.canceled || !pickerResult.assets?.length) return null;

  const asset: ImagePickerAsset = pickerResult.assets[0];
  return compressImage(asset.uri);
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

/** Téléverse une image vers un bucket Supabase Storage */
export const uploadImage = async (
  bucket: StorageBucket,
  localUri: string,
  filePrefix = 'img',
): Promise<UploadResult | null> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.error('uploadImage: utilisateur non authentifié');
    return null;
  }

  const ext = 'jpg';
  const fileName = `${filePrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  // Chemin sécurisé : {userId}/filename — vérifié par les politiques RLS Storage
  const path = `${userId}/${fileName}`;

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, formData, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    logger.error('Upload error', error);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { url: publicUrlData.publicUrl, path: data.path };
};

/** Téléverse plusieurs images vers un bucket */
export const uploadMultipleImages = async (
  bucket: StorageBucket,
  localUris: string[],
  filePrefix = 'img',
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  for (const uri of localUris) {
    const compressed = await compressImage(uri);
    const uploaded = await uploadImage(bucket, compressed.uri, filePrefix);
    if (uploaded) results.push(uploaded);
  }
  return results;
};
