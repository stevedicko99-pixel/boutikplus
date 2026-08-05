// ============================================================
// Service de notifications push — Boutikplus
// ============================================================
// Gère l'enregistrement du token Expo Push auprès de Supabase
// (champ `profiles.push_token`) et l'envoi de notifications via
// l'Edge Function `send-push-notification`.
//
// Le token push est stocké côté serveur (jamais exposé au client
// d'un autre utilisateur). L'envoi se fait via Edge Function avec
// la service_role key (contourne RLS pour lire push_token).
//
// expo-notifications est installé et activé par défaut.
// Le handler de premier-plan est initialisé dans App.tsx.
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

/** Indique si les notifications push natives sont disponibles sur cette plateforme */
export function isPushAvailable(): boolean {
  // expo-notifications nécessite un appareil natif (iOS/Android) physique.
  // Sur web ou simulateur/émulateur, retourne false.
  return Platform.OS !== 'web' && Device.isDevice === true;
}

/**
 * Configure le handler de notification au premier-plan (appel UNE FOIS au démarrage).
 * Sans ça, les notifications ne s'affichent pas quand l'app est ouverte.
 */
export function setupForegroundNotificationHandler(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String((err as any) ?? 'unknown');
    logger.error(`setupForegroundNotificationHandler: ${message}`, err as any);
  }
}

/**
 * Demande la permission d'envoyer des notifications push.
 * @returns true si la permission a été accordée
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (!isPushAvailable()) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    logger.debug('requestPushPermissions: refusée');
    return false;
  }
  return true;
}

/**
 * Récupère le token Expo Push de l'appareil courant.
 * @returns Le token (format `ExponentPushToken[...]`) ou null si indisponible
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!isPushAvailable()) return null;

  const projectId =
    process.env.EXPO_PUBLIC_PROJECT_ID ||
    // Récupère le projectId depuis Constants.expoConfig.extra (EAS Project ID) si set
    undefined;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      // @ts-ignore projectId peut être undefined, Notifications handle ça
      projectId,
    });
    if (!token?.startsWith('ExponentPushToken[')) return null;
    return token;
  } catch (err) {
    logger.error('getExpoPushToken: erreur', err);
    return null;
  }
}

/**
 * Enregistre le token push de l'utilisateur courant dans `profiles.push_token`.
 * À appeler après connexion (dans AuthContext ou au démarrage de l'app).
 *
 * @param userId L'ID de l'utilisateur connecté
 * @returns true si le token a été enregistré avec succès
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    logger.debug('registerPushToken: Supabase non configuré, skip');
    return false;
  }

  const hasPermission = await requestPushPermissions();
  if (!hasPermission) {
    logger.debug('registerPushToken: permission refusée ou expo-notifications absent');
    return false;
  }

  const token = await getExpoPushToken();
  if (!token) return false;

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    logger.error('registerPushToken: échec MAJ profile', error);
    return false;
  }

  logger.info('Token push enregistré pour l\'utilisateur', { userId: userId.slice(0, 8) });
  return true;
}

/**
 * Retire le token push de l'utilisateur (à l'appel de signOut).
 * @param userId L'ID de l'utilisateur qui se déconnecte
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);

  if (error) {
    logger.error('unregisterPushToken:', error);
  }
}

/**
 * Envoie une notification push à un utilisateur via l'Edge Function
 * `send-push-notification`. L'Edge Function lit le `push_token` côté
 * serveur et envoie via l'API Expo Push.
 *
 * Cette fonction fonctionne même sans expo-notifications installé
 * (elle utilise fetch pour appeler l'Edge Function).
 *
 * @param userId Destinataire
 * @param title Titre de la notification
 * @param body Corps du message
 * @param data Données additionnelles (pour deep linking)
 * @returns true si la notification a été envoyée (ou si l'utilisateur n'a pas de token)
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  if (!accessToken) {
    logger.warn('sendPushNotification: utilisateur non authentifié');
    return false;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({ userId, title, body, data }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      logger.error('sendPushNotification: échec API', undefined, {
        status: response.status,
        error: (errorBody as { error?: string }).error,
      });
      return false;
    }

    const result = (await response.json()) as { sent: boolean; reason?: string };
    // sent=false avec reason='no_push_token' n'est pas une erreur :
    // l'utilisateur n'a simplement pas activé les notifications.
    return result.sent || result.reason === 'no_push_token';
  } catch (err) {
    logger.error('sendPushNotification: erreur réseau', err);
    return false;
  }
}
