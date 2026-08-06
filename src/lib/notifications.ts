// Service de notifications — Boutikplus
// Gère la création, lecture et persistance des notifications.

import type { AppNotification } from '@/types/models';
import { supabase, isSupabaseConfigured } from './supabase';

const useDemo = !isSupabaseConfigured;

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: 'demo-seller',
    type: 'new_order',
    title: 'Nouvelle commande 🎉',
    body: 'Vous avez reçu une commande de 12 500 FCFA',
    data: { orderId: 'order-demo-1' },
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'demo-seller',
    type: 'proof_uploaded',
    title: 'Preuve de paiement envoyée',
    body: 'Un acheteur a envoyé sa preuve de paiement. À valider !',
    data: { orderId: 'order-demo-2' },
    read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'notif-3',
    user_id: 'demo-seller',
    type: 'new_review',
    title: 'Nouvel avis reçu ⭐',
    body: 'Un client a laissé 5 étoiles sur votre boutique',
    data: { shopId: 'shop-1' },
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif-4',
    user_id: 'demo-buyer',
    type: 'payment_validated',
    title: 'Paiement validé ✓',
    body: 'Votre commande est confirmée et en préparation',
    data: { orderId: 'order-demo-3' },
    read: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'notif-5',
    user_id: 'demo-buyer',
    type: 'stock_low',
    title: 'Bientôt épuisé',
    body: 'Le produit "Robe wax moderne" n\'a plus que 2 en stock',
    data: { productId: 'p-1' },
    read: false,
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// Cache en mémoire pour le mode démo
let demoCache: AppNotification[] = [...DEMO_NOTIFICATIONS];

export async function getUserNotifications(userId: string): Promise<AppNotification[]> {
  if (useDemo) {
    await delay(200);
    return demoCache
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('getUserNotifications:', error.message);
  return (data as AppNotification[]) ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (useDemo) {
    await delay(100);
    return demoCache.filter((n) => n.user_id === userId && !n.read).length;
  }
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) console.error('getUnreadCount:', error.message);
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (useDemo) {
    await delay(100);
    demoCache = demoCache.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n,
    );
    return;
  }
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (useDemo) {
    await delay(100);
    demoCache = demoCache.map((n) =>
      n.user_id === userId ? { ...n, read: true } : n,
    );
    return;
  }
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function createNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  if (useDemo) {
    await delay(100);
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    demoCache = [newNotif, ...demoCache];
    return;
  }
  const { error } = await supabase.from('notifications').insert({
    ...notification,
    read: false,
    created_at: new Date().toISOString(),
  });
  if (error) console.error('createNotification:', error.message);
}

// ---------- Triggers métier ----------

export const NotificationType = {
  NEW_ORDER: 'new_order',
  PROOF_UPLOADED: 'proof_uploaded',
  PAYMENT_VALIDATED: 'payment_validated',
  NEW_MESSAGE: 'new_message',
  STOCK_LOW: 'stock_low',
  ABANDONED_CART: 'abandoned_cart',
  NEW_REVIEW: 'new_review',
  PRICE_SUGGESTION: 'price_suggestion',
  REFERRAL_BONUS: 'referral_bonus',
  // Livraison intra-plateforme
  DELIVERY_REQUESTED: 'delivery_requested',
  DELIVERY_ACCEPTED: 'delivery_accepted',
  DELIVERY_STATUS: 'delivery_status',
  DELIVERY_PAYMENT_UPLOADED: 'delivery_payment_uploaded',
  DELIVERY_PAYMENT_VALIDATED: 'delivery_payment_validated',
  DELIVERY_CANCELLED: 'delivery_cancelled',
} as const;

export type NotificationTypeKey = (typeof NotificationType)[keyof typeof NotificationType];

/** Déclenche une notification après création de commande */
export async function notifyNewOrder(sellerId: string, orderId: string, amount: number): Promise<void> {
  await createNotification({
    user_id: sellerId,
    type: NotificationType.NEW_ORDER,
    title: 'Nouvelle commande 🎉',
    body: `Vous avez reçu une commande de ${formatCompactFCFA(amount)}`,
    data: { orderId },
  });
}

/** Déclenche une notification après envoi de preuve de paiement */
export async function notifyProofUploaded(sellerId: string, orderId: string): Promise<void> {
  await createNotification({
    user_id: sellerId,
    type: NotificationType.PROOF_UPLOADED,
    title: 'Preuve de paiement envoyée',
    body: 'Un acheteur a envoyé sa preuve de paiement. À valider !',
    data: { orderId },
  });
}

/** Déclenche une notification après validation de paiement */
export async function notifyPaymentValidated(buyerId: string, orderId: string): Promise<void> {
  await createNotification({
    user_id: buyerId,
    type: NotificationType.PAYMENT_VALIDATED,
    title: 'Paiement validé ✓',
    body: 'Votre commande est confirmée et en préparation',
    data: { orderId },
  });
}

/** Déclenche une notification pour nouveau message */
export async function notifyNewMessage(userId: string, conversationId: string, preview: string): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NotificationType.NEW_MESSAGE,
    title: 'Nouveau message 💬',
    body: preview.length > 60 ? preview.slice(0, 57) + '…' : preview,
    data: { conversationId },
  });
}

/** Déclenche une alerte de stock faible */
export async function notifyStockLow(sellerId: string, productId: string, productName: string, stock: number): Promise<void> {
  await createNotification({
    user_id: sellerId,
    type: NotificationType.STOCK_LOW,
    title: 'Stock faible ⚠️',
    body: `"${productName}" n'a plus que ${stock} en stock`,
    data: { productId },
  });
}

/** Rappel panier abandonné */
export async function notifyAbandonedCart(buyerId: string, cartItems: number): Promise<void> {
  await createNotification({
    user_id: buyerId,
    type: NotificationType.ABANDONED_CART,
    title: 'Votre panier vous attend 🛒',
    body: `Vous avez ${cartItems} article(s) dans votre panier. Finalisez votre commande !`,
    data: {},
  });
}

/** Nouvel avis reçu */
export async function notifyNewReview(sellerId: string, shopId: string, rating: number): Promise<void> {
  const stars = '⭐'.repeat(rating);
  await createNotification({
    user_id: sellerId,
    type: NotificationType.NEW_REVIEW,
    title: 'Nouvel avis reçu ' + stars,
    body: `Un client a laissé ${rating} étoiles sur votre boutique`,
    data: { shopId },
  });
}

/** Bonus de parrainage */
export async function notifyReferralBonus(sellerId: string, invitedShopName: string): Promise<void> {
  await createNotification({
    user_id: sellerId,
    type: NotificationType.REFERRAL_BONUS,
    title: 'Bonus de parrainage 🎁',
    body: `${invitedShopName} a rejoint la plateforme grâce à vous ! Vous gagnez une mise en avant gratuite.`,
    data: {},
  });
}

function formatCompactFCFA(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M FCFA`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K FCFA`;
  return `${amount} FCFA`;
}

// ============================================================
// Notifications livraison (livreurs intra-plateforme)
// ============================================================

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  accepted: 'acceptée',
  in_progress: 'en cours',
  delivered: 'livrée',
  refunded: 'remboursée',
};

/**
 * Notifie les livreurs disponibles qu'une nouvelle demande de livraison
 * a été créée dans leur ville. En mode démo, on notifie le vendeur démo
 * (qui est aussi livreur) ; en production, cette fonction est appelée
 * côté serveur (trigger) ou par une Cloud Function.
 */
export async function notifyDeliveryRequested(
  pickupCity: string,
  deliveryId: string,
  price: number,
): Promise<void> {
  if (useDemo) {
    // En démo, on notifie le vendeur-démo qui est aussi livreur
    await createNotification({
      user_id: 'demo-seller',
      type: NotificationType.DELIVERY_REQUESTED,
      title: 'Nouvelle demande de livraison 📦',
      body: `Une livraison depuis ${pickupCity} est disponible (${formatCompactFCFA(price)})`,
      data: { deliveryId, pickupCity },
    });
    return;
  }
  // En production : récupérer les livreurs disponibles de la ville et les notifier
  const { data: drivers } = await supabase
    .from('driver_profiles')
    .select('user_id')
    .eq('is_available', true)
    .eq('city', pickupCity);
  if (!drivers?.length) return;
  await Promise.all(
    drivers.map((d: { user_id: string }) =>
      createNotification({
        user_id: d.user_id,
        type: NotificationType.DELIVERY_REQUESTED,
        title: 'Nouvelle demande de livraison 📦',
        body: `Une livraison depuis ${pickupCity} est disponible (${formatCompactFCFA(price)})`,
        data: { deliveryId, pickupCity },
      }),
    ),
  );
}

/** Notifie le vendeur qu'un livreur a accepté sa demande */
export async function notifyDeliveryAccepted(
  sellerId: string,
  deliveryId: string,
): Promise<void> {
  await createNotification({
    user_id: sellerId,
    type: NotificationType.DELIVERY_ACCEPTED,
    title: 'Livreur trouvé ✓',
    body: 'Un livreur a accepté votre demande de livraison. Il arrive bientôt !',
    data: { deliveryId },
  });
}

/** Notifie un changement de statut de livraison */
export async function notifyDeliveryStatusChanged(
  userId: string,
  deliveryId: string,
  status: string,
): Promise<void> {
  const label = DELIVERY_STATUS_LABELS[status] ?? status;
  const titles: Record<string, string> = {
    in_progress: 'Colis récupéré 🛵',
    delivered: 'Livraison terminée ✅',
    refunded: 'Remboursement traité 💰',
  };
  const bodies: Record<string, string> = {
    in_progress: 'Le livreur a récupéré le colis et est en route',
    delivered: 'Votre colis a été livré avec succès',
    refunded: 'Le remboursement de votre livraison a été traité',
  };
  await createNotification({
    user_id: userId,
    type: NotificationType.DELIVERY_STATUS,
    title: titles[status] ?? `Livraison ${label}`,
    body: bodies[status] ?? `Le statut de votre livraison est maintenant : ${label}`,
    data: { deliveryId, status },
  });
}

/** Notifie le livreur qu'une preuve de paiement a été envoyée */
export async function notifyDeliveryPaymentUploaded(
  deliveryId: string,
): Promise<void> {
  if (useDemo) {
    // En démo, notifier le livreur démo (driver-user-1)
    await createNotification({
      user_id: 'driver-user-1',
      type: NotificationType.DELIVERY_PAYMENT_UPLOADED,
      title: 'Paiement de livraison reçu 💳',
      body: 'Le vendeur a envoyé la preuve de paiement de la livraison. À vérifier !',
      data: { deliveryId },
    });
    return;
  }
  // En production : récupérer le livreur de cette livraison
  const { data: delivery } = await supabase
    .from('delivery_requests')
    .select('driver_id')
    .eq('id', deliveryId)
    .single();
  if (!delivery?.driver_id) return;
  await createNotification({
    user_id: delivery.driver_id,
    type: NotificationType.DELIVERY_PAYMENT_UPLOADED,
    title: 'Paiement de livraison reçu 💳',
    body: 'Le vendeur a envoyé la preuve de paiement de la livraison. À vérifier !',
    data: { deliveryId },
  });
}

/** Notifie le vendeur que le paiement de la livraison a été validé */
export async function notifyDeliveryPaymentValidated(
  deliveryId: string,
): Promise<void> {
  if (useDemo) {
    await createNotification({
      user_id: 'demo-seller',
      type: NotificationType.DELIVERY_PAYMENT_VALIDATED,
      title: 'Paiement de livraison validé ✓',
      body: 'Le paiement de votre livraison a été confirmé par le livreur',
      data: { deliveryId },
    });
    return;
  }
  const { data: delivery } = await supabase
    .from('delivery_requests')
    .select('seller_id')
    .eq('id', deliveryId)
    .single();
  if (!delivery?.seller_id) return;
  await createNotification({
    user_id: delivery.seller_id,
    type: NotificationType.DELIVERY_PAYMENT_VALIDATED,
    title: 'Paiement de livraison validé ✓',
    body: 'Le paiement de votre livraison a été confirmé par le livreur',
    data: { deliveryId },
  });
}

/** Notifie qu'une livraison a été annulée */
export async function notifyDeliveryCancelled(
  userId: string,
  deliveryId: string,
  reason: string | null,
): Promise<void> {
  await createNotification({
    user_id: userId,
    type: NotificationType.DELIVERY_CANCELLED,
    title: 'Livraison annulée ❌',
    body: reason
      ? `Livraison annulée : ${reason}`
      : 'La livraison a été annulée',
    data: { deliveryId, reason },
  });
}
