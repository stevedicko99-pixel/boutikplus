// Ouverture de liens sécurisée — Boutikplus
// Interdiction des protocoles dangereux (javascript:, file:, data:, etc.)
// + sanitize minimal des paramètres affichés à l'écran.

import { Linking, Alert, Platform } from 'react-native';

export type AllowedProtocol =
  | 'http:'
  | 'https:'
  | 'tel:'
  | 'sms:'
  | 'mailto:'
  | 'whatsapp:';

const ALLOWED_PROTOCOLS = new Set<AllowedProtocol>([
  'http:',
  'https:',
  'tel:',
  'sms:',
  'mailto:',
  'whatsapp:',
]);

// Plateformes sociales explicitement autorisées pour les liens produits
const ALLOWED_EXTERNAL_HOSTS = [
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'snapchat.com',
  'whatsapp.com',
  'wa.me',
  'facebook.com',
  'fb.me',
  'instagram.com',
];

function parseSafe(raw: string): { url: URL; safe: boolean } {
  try {
    const url = new URL(raw.trim());
    const protoOk = ALLOWED_PROTOCOLS.has(url.protocol as AllowedProtocol);
    return { url, safe: protoOk };
  } catch {
    return { url: undefined as any, safe: false };
  }
}

/**
 * Ouvre une URL externe après validation du protocole.
 * Retourne true si l'ouverture a été initiée, false sinon.
 * Jamais throw, toujours silencieux ou Alert explicative.
 */
export async function openExternalLink(
  raw: string,
  options: {
    requireTrustedHost?: boolean;
    showErrorOnBlocked?: boolean;
  } = {},
): Promise<boolean> {
  if (!raw) return false;
  const { url, safe } = parseSafe(raw);
  if (!safe) {
    if (options.showErrorOnBlocked) {
      Alert.alert('Lien bloqué', "Ce type de lien n'est pas autorisé.");
    }
    return false;
  }

  if (
    options.requireTrustedHost &&
    url.protocol !== 'tel:' &&
    url.protocol !== 'sms:' &&
    url.protocol !== 'mailto:'
  ) {
    const host = url.hostname.replace(/^www\./, '');
    const ok = ALLOWED_EXTERNAL_HOSTS.some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
    if (!ok) {
      if (options.showErrorOnBlocked) {
        Alert.alert(
          'Site non autorisé',
          'Pour votre sécurité, seules les plateformes de confiance peuvent être ouvertes depuis le produit.',
        );
      }
      return false;
    }
  }

  // Sur le web, ne pas ouvrir les `tel:` en background — utiliser tel: simplement
  try {
    const canOpen = await Linking.canOpenURL(url.toString());
    if (!canOpen && Platform.OS !== 'web') {
      if (options.showErrorOnBlocked)
        Alert.alert('Application introuvable', "Aucune application ne peut ouvrir ce lien.");
      return false;
    }
    await Linking.openURL(url.toString());
    return true;
  } catch {
    return false;
  }
}

/** Raccourci pour les numéros de téléphone */
export async function openPhone(rawPhone: string): Promise<boolean> {
  const digits = rawPhone.replace(/[^\d+]/g, '');
  if (!digits) return false;
  return openExternalLink(`tel:${encodeURIComponent(digits)}`);
}

/** Raccourci pour WhatsApp (numéro international sans le +) */
export async function openWhatsApp(
  rawPhone: string,
  message?: string,
): Promise<boolean> {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return false;
  const msg = message ? `?text=${encodeURIComponent(message)}` : '';
  return openExternalLink(`https://wa.me/${digits}${msg}`);
}
