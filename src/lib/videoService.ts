// Service de vidéos produit — Boutikplus
// Support combiné : upload natif (fichier ≤ 30s / 25MB) + lien externe
// (TikTok / YouTube / Snapchat). Les vendeurs ont déjà leurs vidéos sociales :
// on met le lien externe en avant, l'upload natif reste optionnel pour la qualité.
// Dual-mode : Supabase si configuré, sinon cache mémoire démo (pattern promotionService).

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { DEMO_PRODUCT_VIDEOS } from '@/data/demoData';
import type {
  ProductVideo,
  ExternalVideoSource,
} from '@/types/models';

const useDemo = !isSupabaseConfigured;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Cache mémoire pour le mode démo (mutations locales).
let demoProductVideos: ProductVideo[] = [...DEMO_PRODUCT_VIDEOS];

// ============================================================
// Constantes (limites pour appareils low-end)
// ============================================================

export const MAX_VIDEO_DURATION_SEC = 30;
export const MAX_VIDEO_SIZE_MB = 25;
const VIDEO_BUCKET = 'product-videos';

// ============================================================
// Helpers purs
// ============================================================

/**
 * Détecte la source d'une vidéo externe à partir de son URL.
 * Supporte TikTok, YouTube (youtu.be + youtube.com), Snapchat.
 */
export function detectExternalSource(url: string): ExternalVideoSource {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('youtu.be') || u.includes('youtube.com')) return 'youtube';
  if (u.includes('snapchat.com')) return 'snapchat';
  return 'other';
}

/**
 * Valide un asset vidéo sélectionné (taille + durée).
 * @returns null si valide, sinon un message d'erreur.
 */
export function validateVideoAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.duration && asset.duration > MAX_VIDEO_DURATION_SEC * 1000) {
    return `Vidéo trop longue : ${Math.round(asset.duration / 1000)}s. Maximum ${MAX_VIDEO_DURATION_SEC}s.`;
  }
  if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    const mb = Math.round(asset.fileSize / (1024 * 1024));
    return `Vidéo trop lourde : ${mb}MB. Maximum ${MAX_VIDEO_SIZE_MB}MB.`;
  }
  return null;
}

/** Valide une URL externe (format + domaines connus). */
export function validateExternalUrl(url: string): string | null {
  if (!url.trim()) return 'URL requise';
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    return 'URL invalide (doit commencer par https://)';
  }
  if (!url.startsWith('https://')) return 'Utilisez un lien https://';
  return null;
}

// ============================================================
// Sélection & upload natif
// ============================================================

/**
 * Ouvre la galerie pour sélectionner une vidéo (durée max 30s, qualité medium).
 * @returns l'asset sélectionné, ou null si annulé.
 */
export async function pickVideoForUpload(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: MAX_VIDEO_DURATION_SEC,
    videoQuality: 2, // medium — bon compromis taille/qualité pour low-end
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

/**
 * Téléverse une vidéo vers le bucket product-videos.
 * Réutilise le pattern FormData de storage.ts uploadImage.
 */
export async function uploadVideo(
  localUri: string,
  filePrefix = 'video',
): Promise<{ url: string; path: string } | null> {
  const ext = 'mp4';
  const fileName = `${filePrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;
  const path = `${userId}/${fileName}`;

  const response = await fetch(localUri);
  const body = Platform.OS === 'web' ? await response.blob() : await response.arrayBuffer();

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(path, body, {
      contentType: 'video/mp4',
      upsert: false,
    });

  if (error) {
    console.error('uploadVideo error:', error.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from(VIDEO_BUCKET)
    .getPublicUrl(data.path);

  return { url: publicUrlData.publicUrl, path: data.path };
}

// ============================================================
// CRUD — Product videos (dual-mode)
// ============================================================

export async function getProductVideos(
  productId: string,
): Promise<ProductVideo[]> {
  if (useDemo) {
    await delay(150);
    return demoProductVideos
      .filter((v) => v.product_id === productId)
      .sort((a, b) => a.position - b.position);
  }
  const { data, error } = await supabase
    .from('product_videos')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true });
  if (error) console.error('getProductVideos:', error.message);
  return (data as ProductVideo[]) ?? [];
}

export interface AddProductVideoParams {
  productId: string;
  type: 'upload' | 'external';
  url: string;
  source?: ExternalVideoSource | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  position?: number;
}

export async function addProductVideo(
  params: AddProductVideoParams,
): Promise<{ video: ProductVideo | null; error: string | null }> {
  if (!params.productId) return { video: null, error: 'Produit requis' };
  if (!params.url) return { video: null, error: 'URL requise' };

  const source = params.source ?? (params.type === 'external' ? detectExternalSource(params.url) : null);

  if (useDemo) {
    await delay(250);
    const newVideo: ProductVideo = {
      id: `pv-demo-${Date.now()}`,
      product_id: params.productId,
      type: params.type,
      url: params.url,
      source,
      thumbnail_url: params.thumbnailUrl ?? null,
      duration_sec: params.durationSec ?? null,
      position: params.position ?? 0,
      created_at: new Date().toISOString(),
    };
    demoProductVideos = [...demoProductVideos, newVideo];
    return { video: newVideo, error: null };
  }

  const { data, error } = await supabase
    .from('product_videos')
    .insert({
      product_id: params.productId,
      type: params.type,
      url: params.url,
      source,
      thumbnail_url: params.thumbnailUrl ?? null,
      duration_sec: params.durationSec ?? null,
      position: params.position ?? 0,
    })
    .select('*')
    .single();
  if (error) return { video: null, error: error.message };
  return { video: data as ProductVideo, error: null };
}

export async function deleteProductVideo(
  videoId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoProductVideos = demoProductVideos.filter((v) => v.id !== videoId);
    return { error: null };
  }
  const { error } = await supabase
    .from('product_videos')
    .delete()
    .eq('id', videoId);
  return { error: error?.message ?? null };
}

/**
 * Supprime toutes les vidéos d'un produit (avant suppression du produit).
 */
export async function deleteProductVideosByProduct(
  productId: string,
): Promise<void> {
  if (useDemo) {
    demoProductVideos = demoProductVideos.filter(
      (v) => v.product_id !== productId,
    );
    return;
  }
  await supabase.from('product_videos').delete().eq('product_id', productId);
}

export { isSupabaseConfigured, useDemo as isDemoMode };
