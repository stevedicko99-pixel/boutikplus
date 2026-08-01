// Tests unitaires — gestion des statuts de livraison
import {
  DELIVERY_STATUS,
  DELIVERY_TIMELINE,
  getDeliveryStatusInfo,
  isValidTransition,
  canCancelDelivery,
  canRefundDelivery,
} from '@/lib/deliveryStatus';
import type { DeliveryStatus } from '@/types/models';

describe('deliveryStatus', () => {
  describe('DELIVERY_STATUS', () => {
    it('définit les 6 statuts attendus', () => {
      const statuses = Object.keys(DELIVERY_STATUS) as DeliveryStatus[];
      expect(statuses).toEqual(
        expect.arrayContaining([
          'pending',
          'accepted',
          'in_progress',
          'delivered',
          'cancelled',
          'refunded',
        ]),
      );
      expect(statuses).toHaveLength(6);
    });

    it('chaque statut a un label, une couleur et un step', () => {
      Object.values(DELIVERY_STATUS).forEach((info) => {
        expect(info.label).toBeTruthy();
        expect(info.shortLabel).toBeTruthy();
        expect(info.color).toMatch(/^#/);
        expect(info.bgColor).toMatch(/^#/);
        expect(info.icon).toBeTruthy();
        expect(typeof info.step).toBe('number');
      });
    });
  });

  describe('getDeliveryStatusInfo', () => {
    it('retourne les infos pour un statut valide', () => {
      const info = getDeliveryStatusInfo('delivered');
      expect(info.label).toBe('Livrée');
      expect(info.step).toBe(3);
    });

    it('retourne pending par défaut pour un statut inconnu', () => {
      const info = getDeliveryStatusInfo('unknown' as DeliveryStatus);
      expect(info.step).toBe(0);
    });
  });

  describe('DELIVERY_TIMELINE', () => {
    it('liste les 4 étapes progressives dans l\'ordre', () => {
      expect(DELIVERY_TIMELINE).toEqual([
        'pending',
        'accepted',
        'in_progress',
        'delivered',
      ]);
    });
  });

  describe('isValidTransition', () => {
    it('autorise le livreur à accepter une livraison en attente', () => {
      expect(isValidTransition('pending', 'accepted', 'driver')).toBe(true);
    });

    it('autorise le livreur à démarrer après acceptation', () => {
      expect(isValidTransition('accepted', 'in_progress', 'driver')).toBe(true);
    });

    it('autorise le livreur à livrer après démarrage', () => {
      expect(isValidTransition('in_progress', 'delivered', 'driver')).toBe(true);
    });

    it('interdit au livreur d\'annuler une livraison livrée', () => {
      expect(isValidTransition('delivered', 'cancelled', 'driver')).toBe(false);
    });

    it('interdit au livreur de sauter l\'acceptation', () => {
      expect(isValidTransition('pending', 'in_progress', 'driver')).toBe(false);
    });

    it('autorise le vendeur à annuler une livraison en attente', () => {
      expect(isValidTransition('pending', 'cancelled', 'seller')).toBe(true);
    });

    it('autorise le vendeur à annuler une livraison acceptée', () => {
      expect(isValidTransition('accepted', 'cancelled', 'seller')).toBe(true);
    });

    it('autorise le vendeur à demander un remboursement après livraison', () => {
      expect(isValidTransition('delivered', 'refunded', 'seller')).toBe(true);
    });

    it('interdit au vendeur d\'accepter lui-même une livraison', () => {
      expect(isValidTransition('pending', 'accepted', 'seller')).toBe(false);
    });

    it('interdit au vendeur de livrer lui-même', () => {
      expect(isValidTransition('in_progress', 'delivered', 'seller')).toBe(false);
    });

    it('interdit toute transition depuis cancelled', () => {
      expect(isValidTransition('cancelled', 'pending', 'driver')).toBe(false);
      expect(isValidTransition('cancelled', 'refunded', 'seller')).toBe(false);
    });

    it('interdit toute transition depuis refunded', () => {
      expect(isValidTransition('refunded', 'pending', 'driver')).toBe(false);
      expect(isValidTransition('refunded', 'delivered', 'seller')).toBe(false);
    });
  });

  describe('canCancelDelivery', () => {
    it('autorise l\'annulation si pending, accepted ou in_progress', () => {
      expect(canCancelDelivery('pending')).toBe(true);
      expect(canCancelDelivery('accepted')).toBe(true);
      expect(canCancelDelivery('in_progress')).toBe(true);
    });

    it('interdit l\'annulation si delivered, cancelled ou refunded', () => {
      expect(canCancelDelivery('delivered')).toBe(false);
      expect(canCancelDelivery('cancelled')).toBe(false);
      expect(canCancelDelivery('refunded')).toBe(false);
    });
  });

  describe('canRefundDelivery', () => {
    it('autorise le remboursement seulement si livrée', () => {
      expect(canRefundDelivery('delivered')).toBe(true);
      expect(canRefundDelivery('pending')).toBe(false);
      expect(canRefundDelivery('cancelled')).toBe(false);
    });
  });
});
