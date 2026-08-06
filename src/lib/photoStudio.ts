// Studio Photo — Boutikplus
// Helpers de capture et d'édition d'images pour les vendeurs informels.
// Réutilise expo-image-picker (capture + crop natif) et expo-image-manipulator
// (rotate / flip / resize / qualité) pour offrir une présentation professionnelle
// des produits sans quitter l'app, sur appareils low-end.

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, Alert } from 'react-native';

import { showAlert } from '@/lib/dialog';
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
  return result.assets[0].uri;
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
  return {
    uri: result.uri,
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
    showAlert(
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
    );
  });
}

/** Vérifie si la caméra est disponible sur la plateforme courante. */
export function isCameraSupported(): boolean {
  return Platform.OS !== 'web';
}
