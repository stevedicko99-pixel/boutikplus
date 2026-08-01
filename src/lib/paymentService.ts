// ============================================================
// Service de paiement — Boutikplus
// ============================================================
// Gère l'intégration avec CinetPay via l'Edge Function
// `create-checkout-session` et le fallback par preuve (capture d'écran).
//
// Deux modes de paiement :
//  1. Checkout CinetPay (automatisé) — via Edge Function + webhook
//  2. Preuve Mobile Money (manuel) — upload capture, validation vendeur
//
// Le mode checkout n'est disponible que si Supabase ET CinetPay sont
// configurés. Sinon, l'app utilise le mode preuve (par défaut).
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

export interface CheckoutSessionResult {
  paymentUrl: string;
  transactionId: string;
}

export interface CheckoutSessionParams {
  orderId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
}

/**
 * Indique si le paiement automatisé (checkout en ligne) est disponible.
 *
 * STRATÉGIE : le paiement manuel (Mobile Money + preuve + validation vendeur)
 * est le mode par défaut et prioritaire. Le checkout automatisé (CinetPay /
 * Genius Code) sera activé ultérieurement, une fois les secrets serveur
 * configurés et le prestataire intégré.
 *
 * Nécessite pour activation : Supabase configuré + Edge Function déployée
 * + secrets du prestataire de paiement (CINETPAY_API_KEY / CINETPAY_SITE_ID
 * ou équivalent Genius Code).
 */
export function isCheckoutAvailable(): boolean {
  // Paiement manuel prioritaire — checkout automatisé désactivé tant que
  // Genius Code n'est pas intégré. Mettre à `true` (et vérifier la présence
  // des secrets côté serveur) pour réactiver le checkout en ligne.
  return false;
}

/**
 * Crée une session de paiement CinetPay en appelant l'Edge Function
 * `create-checkout-session`. L'utilisateur est ensuite redirigé vers
 * la page de paiement CinetPay, puis le webhook confirme le paiement.
 *
 * Sécurité : l'Edge Function vérifie que la commande appartient bien
 * à l'utilisateur connecté (JWT) et que le montant est cohérent.
 *
 * @returns L'URL de paiement CinetPay et l'ID de transaction
 * @throws Error si la session ne peut pas être créée
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams,
): Promise<CheckoutSessionResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré — paiement automatisé indisponible');
  }

  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;

  if (!accessToken) {
    throw new Error('Utilisateur non authentifié');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({
      orderId: params.orderId,
      amount: params.amount,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { error?: string }).error ??
      `Erreur ${response.status}: ${response.statusText}`;
    logger.error('createCheckoutSession: échec', { status: response.status, message });
    throw new Error(message);
  }

  const data = (await response.json()) as {
    paymentUrl: string;
    transactionId: string;
  };

  if (!data.paymentUrl || !data.transactionId) {
    throw new Error('Réponse invalide de l\'Edge Function de paiement');
  }

  return {
    paymentUrl: data.paymentUrl,
    transactionId: data.transactionId,
  };
}

/**
 * Vérifie le statut d'une commande après retour de CinetPay.
 * Le webhook met à jour `orders.status = 'payment_validated'`,
 * mais cette fonction permet une vérification proactive côté client
 * (au cas où le webhook aurait un délai).
 *
 * @returns Le statut actuel de la commande
 */
export async function checkOrderPaymentStatus(
  orderId: string,
): Promise<'pending_payment' | 'proof_uploaded' | 'payment_validated' | 'cancelled'> {
  if (!isSupabaseConfigured) {
    return 'pending_payment';
  }

  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (error || !data) {
    logger.error('checkOrderPaymentStatus:', error?.message ?? 'Commande introuvable');
    return 'pending_payment';
  }

  return data.status as 'pending_payment' | 'proof_uploaded' | 'payment_validated' | 'cancelled';
}
