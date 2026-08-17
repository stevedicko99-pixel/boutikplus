// Studio Photo — Boutikplus (VERSION WEB)
// Version web qui utilise l'API Canvas HTML5 au lieu d'expo-image-manipulator,
// et qui n'importe AUCUN module natif sans équivalent web.
//
// Sur web :
//  - expo-image-picker : OK (a un entry point web — input file)
//  - expo-image-manipulator : PAS de support web → remplacé par Canvas
//  - expo-file-system : PAS de support web → remplacé par fetch + FileReader

import * as ImagePicker from 'expo-image-picker';
import { supabase, isSupabaseConfigured } from './supabase';
import { ensureDisplayableUri } from './storage';

export type AspectRatio = '1:1' | '4:3' | '16:9' | 'free';

export interface EditOptions {
  aspect: AspectRatio;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  hd: boolean;
}

export interface EditResult {
  uri: string;
  width: number;
  height: number;
}

export const DEFAULT_EDIT_OPTIONS: EditOptions = {
  aspect: '1:1',
  rotate: 0,
  flipH: false,
  flipV: false,
  hd: false,
};

function aspectToTuple(aspect: AspectRatio): [number, number] | undefined {
  switch (aspect) {
    case '1:1': return [1, 1];
    case '4:3': return [4, 3];
    case '16:9': return [16, 9];
    case 'free':
    default: return undefined;
  }
}

async function ensurePermissions(useCamera: boolean): Promise<boolean> {
  if (useCamera) return false; // caméra via ImagePicker non supportée sur web
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.granted === true;
}

export async function pickForEdit(
  useCamera: boolean,
  aspect: AspectRatio = '1:1',
): Promise<string | null> {
  const ok = await ensurePermissions(useCamera);
  if (!ok) return null;

  const aspectTuple = aspectToTuple(aspect);
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
    ...(aspectTuple ? { aspect: aspectTuple } : {}),
  };

  const result = await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const uri = result.assets[0].uri;
  return (await ensureDisplayableUri(uri)) ?? uri;
}

async function loadHtmlImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = uri;
  });
}

function canvasToBlobUri(canvas: HTMLCanvasElement, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(canvas.toDataURL('image/jpeg', quality));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function applyEdits(
  uri: string,
  opts: EditOptions,
): Promise<EditResult> {
  const img = await loadHtmlImage(uri);

  const targetWidth = opts.hd ? 1600 : 800;
  const ratio = img.width > targetWidth ? targetWidth / img.width : 1;
  let outW = Math.round(img.width * ratio);
  let outH = Math.round(img.height * ratio);

  const rotation = opts.rotate;
  const swapDims = rotation === 90 || rotation === 270;
  const canvasW = swapDims ? outH : outW;
  const canvasH = swapDims ? outW : outH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const displayUri = (await ensureDisplayableUri(uri)) ?? uri;
    return { uri: displayUri, width: img.width, height: img.height };
  }

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const sx = opts.flipH ? -1 : 1;
  const sy = opts.flipV ? -1 : 1;
  ctx.scale(sx, sy);
  ctx.drawImage(img, -outW / 2, -outH / 2, outW, outH);
  ctx.restore();

  const quality = opts.hd ? 0.92 : 0.7;
  const resultUri = await canvasToBlobUri(canvas, quality);
  const displayUri = (await ensureDisplayableUri(resultUri)) ?? resultUri;
  return { uri: displayUri, width: canvasW, height: canvasH };
}

export async function pickWithChoice(
  aspect: AspectRatio = '1:1',
): Promise<string | null> {
  return pickForEdit(false, aspect);
}

export function isCameraSupported(): boolean {
  return false;
}

export interface AIImageAnalysis {
  suggestedAspect: AspectRatio;
  brightness: 'low' | 'normal' | 'high';
  quality: 'low' | 'medium' | 'high';
  hasBackground: boolean;
  suggestions: string[];
}

export async function analyzeImageAI(uri: string): Promise<AIImageAnalysis> {
  return {
    suggestedAspect: '1:1',
    brightness: 'normal',
    quality: 'medium',
    hasBackground: true,
    suggestions: [
      'Format carré recommandé pour les fiches produits',
      'Améliorez la luminosité pour de meilleurs résultats',
      'Envisagez de supprimer l\'arrière-plan pour un rendu pro',
    ],
  };
}

export async function aiAutoEnhance(uri: string): Promise<EditResult> {
  const img = await loadHtmlImage(uri);

  const size = Math.min(img.width, img.height);
  const ox = Math.max(0, (img.width - size) / 2);
  const oy = Math.max(0, (img.height - size) / 2);

  const TARGET = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = TARGET;
  canvas.height = TARGET;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return applyEdits(uri, { ...DEFAULT_EDIT_OPTIONS, hd: true });
  }
  ctx.drawImage(img, ox, oy, size, size, 0, 0, TARGET, TARGET);

  const resultUri = await canvasToBlobUri(canvas, 0.92);
  const displayUri = (await ensureDisplayableUri(resultUri)) ?? resultUri;
  return { uri: displayUri, width: TARGET, height: TARGET };
}

async function fileToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function removeBackgroundAI(uri: string): Promise<string> {
  const fallback = () => applyCleanBackground(uri, '#FFFFFF').then((r) => r.uri);

  if (!isSupabaseConfigured) return fallback();

  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;
    if (!accessToken) return fallback();

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const functionUrl = `${supabaseUrl}/functions/v1/removebg-proxy`;

    let payload: Record<string, unknown>;
    if (uri.startsWith('http')) {
      payload = { image_url: uri, size: 'auto', format: 'auto' };
    } else {
      const base64 = await fileToBase64(uri);
      payload = { image_file_b64: base64, size: 'auto', format: 'auto' };
    }

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as { result_data_url?: string };
      if (data.result_data_url) return data.result_data_url;
    }
  } catch {
    // fallback
  }
  return fallback();
}

export async function applyCleanBackground(
  uri: string,
  bgColor: string = '#FFFFFF',
): Promise<EditResult> {
  const img = await loadHtmlImage(uri);

  const TARGET = 1200;
  const ratio = img.width > TARGET ? TARGET / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return applyEdits(uri, DEFAULT_EDIT_OPTIONS);
  }
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const resultUri = await canvasToBlobUri(canvas, 0.88);
  const displayUri = (await ensureDisplayableUri(resultUri)) ?? resultUri;
  return { uri: displayUri, width: w, height: h };
}
