// ============================================================
// Service de notifications push — STUB WEB
// ============================================================
// Sur web, expo-notifications et expo-device n'ont pas d'implémentation
// fonctionnelle (pas de push natif). Ce stub évite d'importer ces modules
// natifs au démarrage de l'app web, ce qui provoquait l'erreur runtime
// "Requiring unknown module '1085'".
//
// Metro résout automatiquement pushNotificationService.web.ts sur web
// à la place de pushNotificationService.ts.
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

export function isPushAvailable(): boolean {
  return false;
}

export function setupForegroundNotificationHandler(): () => void {
  return () => {};
}

export async function requestPushPermissions(): Promise<boolean> {
  return false;
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function registerPushToken(_userId: string): Promise<boolean> {
  return false;
}

export async function unregisterPushToken(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', userId);
  if (error) logger.error('unregisterPushToken:', error);
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) return false;

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
    if (!response.ok) return false;
    const result = (await response.json()) as { sent: boolean; reason?: string };
    return result.sent || result.reason === 'no_push_token';
  } catch (err) {
    logger.error('sendPushNotification: erreur réseau', err);
    return false;
  }
}
