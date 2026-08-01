// Métadonnées des statuts de livraison — clone du pattern orderStatus.ts

import type { DeliveryStatus } from '@/types/models';
import { colors } from '@/theme';

export interface DeliveryStatusInfo {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  step: number;
  icon: string;
}

export const DELIVERY_STATUS: Record<DeliveryStatus, DeliveryStatusInfo> = {
  pending: {
    label: 'En attente de livreur',
    shortLabel: 'En attente',
    color: colors.warning,
    bgColor: '#FFF8E1',
    step: 0,
    icon: 'clock',
  },
  accepted: {
    label: 'Livreur assigné, en route',
    shortLabel: 'Acceptée',
    color: colors.info,
    bgColor: '#E8F8FF',
    step: 1,
    icon: 'user-check',
  },
  in_progress: {
    label: 'Colis récupéré, en livraison',
    shortLabel: 'En livraison',
    color: colors.primary,
    bgColor: '#FFF0E0',
    step: 2,
    icon: 'navigation',
  },
  delivered: {
    label: 'Livrée',
    shortLabel: 'Livrée',
    color: colors.success,
    bgColor: '#E6F7EE',
    step: 3,
    icon: 'check-circle',
  },
  cancelled: {
    label: 'Annulée',
    shortLabel: 'Annulée',
    color: colors.danger,
    bgColor: '#FDECEC',
    step: -1,
    icon: 'x-circle',
  },
  refunded: {
    label: 'Remboursée',
    shortLabel: 'Remboursée',
    color: colors.textMuted,
    bgColor: '#F1F3F5',
    step: -1,
    icon: 'rotate-ccw',
  },
};

export const getDeliveryStatusInfo = (status: DeliveryStatus): DeliveryStatusInfo =>
  DELIVERY_STATUS[status] ?? DELIVERY_STATUS.pending;

// Suite ordonnée des statuts pour la timeline
export const DELIVERY_TIMELINE: DeliveryStatus[] = [
  'pending',
  'accepted',
  'in_progress',
  'delivered',
];

// Transitions valides selon le rôle
const DRIVER_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['accepted'],
  accepted: ['in_progress'],
  in_progress: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const SELLER_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['cancelled'],
  accepted: ['cancelled'],
  in_progress: ['cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Vérifie qu'une transition de statut est autorisée pour un rôle donné */
export function isValidTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
  role: 'driver' | 'seller',
): boolean {
  const allowed = role === 'driver' ? DRIVER_TRANSITIONS : SELLER_TRANSITIONS;
  return (allowed[from] ?? []).includes(to);
}

/** Une livraison peut-elle être annulée par ce rôle ? */
export function canCancelDelivery(status: DeliveryStatus, _role: 'driver' | 'seller' = 'seller'): boolean {
  return status === 'pending' || status === 'accepted' || status === 'in_progress';
}

/** Un remboursement peut-il être demandé ? (livrée → litige, ou annulée après paiement) */
export function canRefundDelivery(status: DeliveryStatus): boolean {
  return status === 'delivered';
}
