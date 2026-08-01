import type { OrderStatus } from '@/types/models';
import { colors } from '@/theme';

export interface OrderStatusInfo {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  step: number;
}

export const ORDER_STATUS: Record<OrderStatus, OrderStatusInfo> = {
  pending_payment: {
    label: 'En attente de paiement',
    shortLabel: 'À payer',
    color: colors.warning,
    bgColor: '#FFF8E1',
    step: 0,
  },
  proof_uploaded: {
    label: 'Preuve envoyée, en attente de validation',
    shortLabel: 'En validation',
    color: colors.info,
    bgColor: '#E8F8FF',
    step: 1,
  },
  payment_validated: {
    label: 'Paiement confirmé, en préparation',
    shortLabel: 'En préparation',
    color: colors.secondary,
    bgColor: '#F3E8F9',
    step: 2,
  },
  in_delivery: {
    label: 'En livraison',
    shortLabel: 'En livraison',
    color: colors.primary,
    bgColor: '#FFF0E0',
    step: 3,
  },
  delivered: {
    label: 'Livrée',
    shortLabel: 'Livrée',
    color: colors.success,
    bgColor: '#E6F7EE',
    step: 4,
  },
  cancelled: {
    label: 'Annulée',
    shortLabel: 'Annulée',
    color: colors.danger,
    bgColor: '#FDECEC',
    step: -1,
  },
};

export const getOrderStatusInfo = (status: OrderStatus): OrderStatusInfo =>
  ORDER_STATUS[status] ?? ORDER_STATUS.pending_payment;

export const ORDER_TIMELINE: OrderStatus[] = [
  'pending_payment',
  'proof_uploaded',
  'payment_validated',
  'in_delivery',
  'delivered',
];
