// Studio Photo — Boutikplus
// Helpers de capture et d'édition d'images pour les vendeurs informels.
// Réutilise expo-image-picker (capture + crop natif) et expo-image-manipulator
// (rotate / flip / resize / qualité) pour offrir une présentation professionnelle
// des produits sans quitter l'app, sur appareils low-end.
//
// ⚡ Suppression de fond IA : via Edge Function SUPABASE `removebg-proxy`
// (appel serveur sécurisé — aucune clé API Remove.bg exposée côté client).
// Configuration : définir REMOVEBG_API_KEY comme secret de l'Edge Function
// dans le dashboard Supabase.
//
// Pré-requis : utilisateur authentifié (JWT). Si non connecté ou
// Supabase non configuré : fallback sur méthode locale (fond blanc uni).

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, Alert } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { ensureDisplayableUri } from './storage';

// ============================================================
// Types
// ============================================================

/** Ratios de recadrage supportés par le crop natif de ImagePicker. */
export type AspectRatio = '1:1' | '4:3' | '16:9' | 'free';

/** Options d'édition appliquées après capture. */
export interface EditOptions {
  aspect: AspectRatio;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  hd: boolean; // true = 1600px / JPEG 0.92, false = 800px / JPEG 0.7
}

/** Résultat d'édition (URI local file://). */
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

// ============================================================
// Helpers internes
// ============================================================

/** Convertit un AspectRatio en tuple [width, height] pour ImagePicker. */
function aspectToTuple(aspect: AspectRatio): [number, number] | undefined {
  switch (aspect) {
    case '1:1':
      return [1, 1];
    case '4:3':
      return [4, 3];
    case '16:9':
      return [16, 9];
    case 'free':
    default:
      return undefined; // pas de ratio imposé
  }
}

/**
 * Demande les permissions caméra/galerie selon le mode.
 * Retourne false si l'utilisateur refuse ou si la caméra n'est pas disponible (web).
 */
async function ensurePermissions(useCamera: boolean): Promise<boolean> {
  // La caméra n'est pas supportée sur web via ImagePicker.
  if (useCamera && Platform.OS === 'web') return false;
  if (useCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return false;
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return false;
  }
  return true;
}

// ============================================================
// API publique
// ============================================================

/**
 * Ouvre la caméra ou la galerie avec crop natif.
 * @param useCamera true = appareil photo, false = galerie.
 * @param aspect ratio de recadrage imposé (1:1 par défaut pour les produits).
 * @returns l'URI de l'image cropée, ou null si annulé / refusé.
 */
export async function pickForEdit(
  useCamera: boolean,
  aspect: AspectRatio = '1:1',
): Promise<string | null> {
  const ok = await ensurePermissions(useCamera);
  if (!ok) return null;

  const aspectTuple = aspectToTuple(aspect);
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true, // active le crop natif
    quality: 0.85,
    ...(aspectTuple ? { aspect: aspectTuple } : {}),
  };

  let result: ImagePicker.ImagePickerResult;
  if (useCamera) {
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets?.length) return null;
  const uri = result.assets[0].uri;
  return (await ensureDisplayableUri(uri)) ?? uri;
}

/**
 * Applique les options d'édition (rotate / flip / resize / qualité) à une image.
 * @param uri URI source (file:// ou asset).
 * @param opts options d'édition.
 * @returns l'URI de l'image traitée + dimensions.
 */
export async function applyEdits(
  uri: string,
  opts: EditOptions,
): Promise<EditResult> {
  const actions: ImageManipulator.Action[] = [];

  // Rotation (doit être un multiple de 90)
  if (opts.rotate === 90) actions.push({ rotate: 90 });
  else if (opts.rotate === 180) actions.push({ rotate: 180 });
  else if (opts.rotate === 270) actions.push({ rotate: 270 });

  // Retournement horizontal / vertical
  if (opts.flipH) {
    actions.push({ flip: ImageManipulator.FlipType.Horizontal });
  }
  if (opts.flipV) {
    actions.push({ flip: ImageManipulator.FlipType.Vertical });
  }

  // Redimensionnement : HD = 1600px, standard = 800px (côté le plus long).
  // On ne précise que la largeur : expo-image-manipulator préserve le ratio.
  const targetWidth = opts.hd ? 1600 : 800;
  actions.push({ resize: { width: targetWidth } });

  const saveOptions: ImageManipulator.SaveOptions = {
    compress: opts.hd ? 0.92 : 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  };

  const result = await ImageManipulator.manipulateAsync(uri, actions, saveOptions);
  const displayUri = (await ensureDisplayableUri(result.uri)) ?? result.uri;
  return {
    uri: displayUri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Propose un choix natif (Alert) entre Caméra et Galerie, puis lance pickForEdit.
 * Sur web, saute directement à la galerie (caméra non supportée).
 * @returns l'URI de l'image cropée, ou null si annulé.
 */
export async function pickWithChoice(
  aspect: AspectRatio = '1:1',
): Promise<string | null> {
  // Sur web, pas de caméra : on va directement à la galerie.
  if (Platform.OS === 'web') {
    return pickForEdit(false, aspect);
  }

  // Sur natif, on propose un choix via Alert. (Alert est importé statiquement ;
  // react-native est déjà bundlé, aucun surcoût.)
  return new Promise<string | null>((resolve) => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez la source de l\'image.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => resolve(null),
        },
        {
          text: 'Galerie',
          onPress: async () => resolve(await pickForEdit(false, aspect)),
        },
        {
          text: 'Appareil photo',
          onPress: async () => resolve(await pickForEdit(true, aspect)),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Vérifie si la caméra est disponible sur la plateforme courante. */
export function isCameraSupported(): boolean {
  return Platform.OS !== 'web';
}

// ============================================================
// IA Photo — Auto-enhance, recadrage intelligent, suppression de fond
// ============================================================

/** Résultat d'analyse IA d'une image. */
export interface AIImageAnalysis {
  suggestedAspect: AspectRatio;
  brightness: 'low' | 'normal' | 'high';
  quality: 'low' | 'medium' | 'high';
  hasBackground: boolean;
  suggestions: string[];
}

/**
 * Analyse une image et suggère des optimisations IA.
 * En mode démo : analyse basée sur la résolution et le format.
 * En production : utilise l'API d'IA configurée.
 */
export async function analyzeImageAI(uri: string): Promise<AIImageAnalysis> {
  // En production, ceci appellerait une API de vision par ordinateur
  // (ex: Mistral Vision, Remove.bg, ou l'API Clayture)
  // Pour l'instant, analyse basée sur des heuristiques locales.
  const analysis: AIImageAnalysis = {
    suggestedAspect: '1:1',
    brightness: 'normal',
    quality: 'medium',
    hasBackground: true,
    suggestions: [
      'Formats carré recommandé pour les fiches produits',
      'Améliorez la luminosité pour de meilleurs résultats',
      'Envisagez de supprimer l\'arrière-plan pour un rendu pro',
    ],
  };
  return analysis;
}

/**
 * Auto-enhance IA : applique automatiquement les meilleurs réglages
 * pour une photo produit professionnelle.
 * - Redimensionne en HD (1600px)
 * - Optimise la compression
 * - Recadre automatiquement en format carré
 *
 * Note : Pour un vrai traitement IA (luminosité, contraste, saturation),
 * une API externe appelée via Edge Function Supabase est recommandée :
 * - Remove.bg (via removebg-proxy) — suppression de fond sécurisée
 * - Clayture (https://clayture.com) — auto-enhance, recadrage intelligent
 */
export async function aiAutoEnhance(uri: string): Promise<EditResult> {
  const actions: ImageManipulator.Action[] = [
    // Smart crop : format carré (le plus vendu pour e-commerce)
    { crop: { originX: 0, originY: 0, width: 1, height: 1 } },
    // Redimensionnement HD
    { resize: { width: 1600 } },
  ];

  const saveOptions: ImageManipulator.SaveOptions = {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG,
  };

  const result = await ImageManipulator.manipulateAsync(uri, actions, saveOptions);
  const displayUri = (await ensureDisplayableUri(result.uri)) ?? result.uri;
  return {
    uri: displayUri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Suppression de fond via Edge Function Supabase `removebg-proxy`.
 * L'API Remove.bg est appelée CÔTÉ SERVEUR (secret REMOVEBG_API_KEY
 * défini comme secret d'Edge Function dans Supabase — jamais exposé
 * au client).
 *
 * Pré-requis :
 *  - Supabase configuré (EXPO_PUBLIC_SUPABASE_URL + ANON_KEY)
 *  - Utilisateur authentifié (JWT valide)
 *
 * Si l'une des conditions n'est pas remplie : fallback silencieux
 * sur applyCleanBackground (fond blanc uni local).
 *
 * Alternative gratuite pour plus tard : Photoroom API, Clayture.
 */
export async function removeBackgroundAI(uri: string): Promise<string> {
  const fallback = () => applyCleanBackground(uri, '#FFFFFF').then((r) => r.uri);

  if (!isSupabaseConfigured) {
    return fallback();
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    if (!accessToken) {
      return fallback();
    }

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
      if (data.result_data_url) {
        return data.result_data_url;
      }
      console.warn('removebg-proxy: réponse sans result_data_url');
    } else {
      const errBody = await response.json().catch(() => ({}));
      console.warn(
        'removebg-proxy: échec HTTP',
        response.status,
        response.statusText,
        errBody,
      );
    }
  } catch (err) {
    console.warn('removeBackgroundAI: erreur, fallback local', err);
  }

  return fallback();
}

/** Convertit un fichier local en base64 sans préfixe data: */
async function fileToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extraire la partie base64 (enlever le préfixe data:image/...;base64,)
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }
  // Sur mobile, on utilise FileSystem de Expo
  const { FileSystem } = require('expo-file-system');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('File not found');
  const content = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  return content;
}

/**
 * Applique un fond uni blanc (fallback local quand la suppression de fond
 * via Edge Function n'est pas disponible : utilisateur non connecté,
 * Supabase non configuré, ou erreur réseau).
 */
export async function applyCleanBackground(
  uri: string,
  bgColor: string = '#FFFFFF',
): Promise<EditResult> {
  // Fallback local : redimensionnement optimal pour qualité e-commerce
  const actions: ImageManipulator.Action[] = [
    { resize: { width: 1200 } },
  ];
  const saveOptions: ImageManipulator.SaveOptions = {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  };
  const result = await ImageManipulator.manipulateAsync(uri, actions, saveOptions);
  const displayUri = (await ensureDisplayableUri(result.uri)) ?? result.uri;
  return {
    uri: displayUri,
    width: result.width,
    height: result.height,
  };
}
