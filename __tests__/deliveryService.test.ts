// Tests d'intégration — service de livraison (mode démo)
import {
  searchDrivers,
  getDriverByUser,
  getDriverById,
  createDriverProfile,
  updateDriverProfile,
  setDriverAvailability,
  getPendingDeliveriesForDriver,
  getDriverActiveDeliveries,
  getDriverDeliveryHistory,
  getSellerDeliveries,
  getDeliveryById,
  createDeliveryRequest,
  updateDeliveryStatus,
  acceptDelivery,
  startDelivery,
  completeDelivery,
  cancelDelivery,
  requestRefund,
  getDeliveryPayment,
  uploadDeliveryPayment,
  validateDeliveryPayment,
  rejectDeliveryPayment,
  getDeliveryReviews,
  getDriverReviews,
  addDeliveryReview,
  getDriverStats,
  estimateDeliveryPrice,
  canDriverHandle,
  formatFCFA,
} from '@/lib/deliveryService';
import type { DriverProfile, VehicleType } from '@/types/models';

// Les tests s'exécutent en mode démo (Supabase non configuré en test)
describe('deliveryService (mode démo)', () => {
  // ============================================================
  // 1. Recherche & filtrage des livreurs
  // ============================================================
  describe('searchDrivers', () => {
    it('retourne une liste de livreurs', async () => {
      const drivers = await searchDrivers();
      expect(drivers.length).toBeGreaterThan(0);
    });

    it('filtre par ville', async () => {
      const drivers = await searchDrivers({ city: 'Ouagadougou' });
      expect(drivers.length).toBeGreaterThan(0);
      drivers.forEach((d) => expect(d.city).toBe('Ouagadougou'));
    });

    it('filtre par disponibilité', async () => {
      const drivers = await searchDrivers({ availableOnly: true });
      drivers.forEach((d) => expect(d.is_available).toBe(true));
    });

    it('filtre par type de véhicule', async () => {
      const drivers = await searchDrivers({ vehicleType: 'moto' });
      drivers.forEach((d) => expect(d.vehicle_type).toBe('moto'));
    });

    it('filtre par note minimum', async () => {
      const drivers = await searchDrivers({ minRating: 4.5 });
      drivers.forEach((d) => expect(d.rating).toBeGreaterThanOrEqual(4.5));
    });

    it('filtre par poids maximum supporté', async () => {
      const drivers = await searchDrivers({ minWeight: 100 });
      drivers.forEach((d) => expect(d.max_weight).toBeGreaterThanOrEqual(100));
    });

    it('trie par note décroissante par défaut', async () => {
      const drivers = await searchDrivers({ sortBy: 'rating' });
      for (let i = 1; i < drivers.length; i++) {
        expect(drivers[i].rating).toBeLessThanOrEqual(drivers[i - 1].rating);
      }
    });

    it('trie par prix croissant', async () => {
      const drivers = await searchDrivers({ sortBy: 'price_asc' });
      for (let i = 1; i < drivers.length; i++) {
        expect(drivers[i].base_rate).toBeGreaterThanOrEqual(drivers[i - 1].base_rate);
      }
    });

    it('respecte la limite', async () => {
      const drivers = await searchDrivers({ limit: 2 });
      expect(drivers.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getDriverByUser / getDriverById', () => {
    it('récupère un livreur par user_id', async () => {
      const driver = await getDriverByUser('demo-seller');
      expect(driver).toBeTruthy();
      expect(driver?.user_id).toBe('demo-seller');
    });

    it('retourne null pour un user_id inexistant', async () => {
      const driver = await getDriverByUser('inexistant');
      expect(driver).toBeNull();
    });

    it('récupère un livreur par id', async () => {
      const driver = await getDriverById('driver-1');
      expect(driver).toBeTruthy();
      expect(driver?.id).toBe('driver-1');
    });
  });

  // ============================================================
  // 2. CRUD profil livreur
  // ============================================================
  describe('createDriverProfile', () => {
    it('crée un profil livreur valide', async () => {
      const { driverId, error } = await createDriverProfile({
        userId: 'new-driver-user',
        vehicleType: 'moto',
        city: 'Ouagadougou',
        baseRate: 500,
        perKmRate: 150,
        maxWeight: 20,
        orangeMoneyNumber: '70000000',
      });
      expect(error).toBeNull();
      expect(driverId).toBeTruthy();

      const driver = await getDriverByUser('new-driver-user');
      expect(driver).toBeTruthy();
      expect(driver?.city).toBe('Ouagadougou');
      expect(driver?.is_available).toBe(true);
    });
  });

  describe('updateDriverProfile / setDriverAvailability', () => {
    it('met à jour la disponibilité', async () => {
      const before = await getDriverByUser('driver-user-1');
      expect(before?.is_available).toBe(true);

      const { error } = await setDriverAvailability('driver-1', false);
      expect(error).toBeNull();

      const after = await getDriverByUser('driver-user-1');
      expect(after?.is_available).toBe(false);

      // Restaurer
      await setDriverAvailability('driver-1', true);
    });

    it('met à jour la ville', async () => {
      const { error } = await updateDriverProfile('driver-1', { city: 'Koudougou' });
      expect(error).toBeNull();
      const driver = await getDriverByUser('driver-user-1');
      expect(driver?.city).toBe('Koudougou');
      // Restaurer
      await updateDriverProfile('driver-1', { city: 'Ouagadougou' });
    });
  });

  // ============================================================
  // 3. Création de demande de livraison (avec validation)
  // ============================================================
  describe('createDeliveryRequest — validation', () => {
    const validParams = {
      sellerId: 'demo-seller',
      pickupAddress: 'Gounghin',
      pickupCity: 'Ouagadougou',
      destinationAddress: 'Wemtenga',
      destinationCity: 'Ouagadougou',
      packageWeight: 3,
      packageLength: 30,
      packageWidth: 20,
      packageHeight: 15,
      preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      preferredTime: '10:00 - 12:00',
      description: 'Test',
      price: 1250,
      distanceKm: 5,
    };

    it('crée une demande valide', async () => {
      const { deliveryId, error } = await createDeliveryRequest(validParams);
      expect(error).toBeNull();
      expect(deliveryId).toBeTruthy();
    });

    it('rejette une adresse de prise en charge vide', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        pickupAddress: '',
      });
      expect(error).toContain('prise en charge');
    });

    it('rejette un poids nul', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        packageWeight: 0,
      });
      expect(error).toContain('poids');
    });

    it('rejette un poids excessif', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        packageWeight: 2000,
      });
      expect(error).toContain('Poids');
    });

    it('rejette des dimensions nulles', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        packageLength: 0,
      });
      expect(error).toContain('dimensions');
    });

    it('rejette une date passée', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        preferredDate: '2020-01-01',
      });
      expect(error).toContain('passé');
    });

    it('rejette un prix négatif', async () => {
      const { error } = await createDeliveryRequest({
        ...validParams,
        price: -100,
      });
      expect(error).toContain('prix');
    });
  });

  // ============================================================
  // 4. Cycle de vie d'une livraison
  // ============================================================
  describe('Cycle de vie d\'une livraison', () => {
    let deliveryId: string;

    beforeEach(async () => {
      const result = await createDeliveryRequest({
        sellerId: 'demo-seller',
        pickupAddress: 'Gounghin',
        pickupCity: 'Ouagadougou',
        destinationAddress: 'Wemtenga',
        destinationCity: 'Ouagadougou',
        packageWeight: 2,
        packageLength: 20,
        packageWidth: 15,
        packageHeight: 10,
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        preferredTime: '10:00 - 12:00',
        description: 'Cycle test',
        price: 800,
        distanceKm: 5,
      });
      expect(result.error).toBeNull();
      deliveryId = result.deliveryId!;
    });

    it('démarre en statut pending', async () => {
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('pending');
      expect(d?.driver_id).toBeNull();
    });

    it('un livreur peut accepter la demande', async () => {
      const { error } = await acceptDelivery(deliveryId, 'driver-user-4');
      expect(error).toBeNull();
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('accepted');
      expect(d?.driver_id).toBe('driver-user-4');
      expect(d?.accepted_at).toBeTruthy();
    });

    it('le livreur peut démarrer la livraison', async () => {
      await acceptDelivery(deliveryId, 'driver-user-4');
      const { error } = await startDelivery(deliveryId);
      expect(error).toBeNull();
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('in_progress');
    });

    it('le livreur peut terminer la livraison', async () => {
      await acceptDelivery(deliveryId, 'driver-user-4');
      await startDelivery(deliveryId);
      const { error } = await completeDelivery(deliveryId);
      expect(error).toBeNull();
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('delivered');
      expect(d?.delivered_at).toBeTruthy();
    });

    it('le vendeur peut annuler une livraison en attente', async () => {
      const { error } = await cancelDelivery(deliveryId, 'seller', 'Plus besoin');
      expect(error).toBeNull();
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('cancelled');
      expect(d?.cancellation_reason).toBe('Plus besoin');
    });

    it('le vendeur ne peut pas accepter lui-même (transition refusée)', async () => {
      const { error } = await updateDeliveryStatus(deliveryId, 'accepted', 'seller', {
        driverId: 'driver-user-4',
      });
      expect(error).toContain('non autorisée');
    });

    it('le livreur ne peut pas livrer sans accepter au préalable', async () => {
      const { error } = await updateDeliveryStatus(deliveryId, 'in_progress', 'driver');
      expect(error).toContain('non autorisée');
    });

    it('retourne une erreur pour une livraison inexistante', async () => {
      const { error } = await updateDeliveryStatus('inexistant', 'accepted', 'driver');
      expect(error).toContain('introuvable');
    });

    it('le vendeur peut demander un remboursement après livraison', async () => {
      await acceptDelivery(deliveryId, 'driver-user-4');
      await startDelivery(deliveryId);
      await completeDelivery(deliveryId);
      const { error } = await requestRefund(deliveryId, 'Litige');
      expect(error).toBeNull();
      const d = await getDeliveryById(deliveryId);
      expect(d?.status).toBe('refunded');
    });

    it('le vendeur ne peut pas demander de remboursement sur une livraison en attente', async () => {
      const { error } = await requestRefund(deliveryId);
      expect(error).toContain('non autorisée');
    });
  });

  // ============================================================
  // 5. Listes de livraisons
  // ============================================================
  describe('getSellerDeliveries', () => {
    it('retourne les livraisons du vendeur démo', async () => {
      const list = await getSellerDeliveries('demo-seller');
      expect(list.length).toBeGreaterThan(0);
      list.forEach((d) => expect(d.seller_id).toBe('demo-seller'));
    });

    it('filtre par statut', async () => {
      const list = await getSellerDeliveries('demo-seller', 'delivered');
      list.forEach((d) => expect(d.status).toBe('delivered'));
    });

    it('retourne un tableau vide pour un vendeur inexistant', async () => {
      const list = await getSellerDeliveries('inexistant');
      expect(list).toEqual([]);
    });

    it('trie par date de mise à jour décroissante', async () => {
      const list = await getSellerDeliveries('demo-seller');
      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i].updated_at).getTime()).toBeLessThanOrEqual(
          new Date(list[i - 1].updated_at).getTime(),
        );
      }
    });
  });

  describe('getPendingDeliveriesForDriver', () => {
    it('retourne les livraisons en attente', async () => {
      const list = await getPendingDeliveriesForDriver('driver-user-4');
      list.forEach((d) => expect(d.status).toBe('pending'));
      // N'inclut pas les livraisons du livreur lui-même
      list.forEach((d) => expect(d.seller_id).not.toBe('driver-user-4'));
    });

    it('retourne un tableau vide pour un non-livreur', async () => {
      const list = await getPendingDeliveriesForDriver('inexistant');
      expect(list).toEqual([]);
    });
  });

  describe('getDriverActiveDeliveries', () => {
    it('retourne les livraisons acceptées ou en cours du livreur', async () => {
      // Le livreur démo (driver-user-1) a deliv-1 en in_progress
      const list = await getDriverActiveDeliveries('driver-user-1');
      list.forEach((d) =>
        expect(['accepted', 'in_progress']).toContain(d.status),
      );
    });
  });

  describe('getDriverDeliveryHistory', () => {
    it('retourne les livraisons terminées/annulées/remboursées', async () => {
      const list = await getDriverDeliveryHistory('driver-user-4');
      list.forEach((d) =>
        expect(['delivered', 'cancelled', 'refunded']).toContain(d.status),
      );
    });
  });

  // ============================================================
  // 6. Paiements de livraison
  // ============================================================
  describe('Paiements de livraison', () => {
    let deliveryId: string;

    beforeEach(async () => {
      const result = await createDeliveryRequest({
        sellerId: 'demo-seller',
        pickupAddress: 'Test',
        pickupCity: 'Ouagadougou',
        destinationAddress: 'Test',
        destinationCity: 'Ouagadougou',
        packageWeight: 2,
        packageLength: 20,
        packageWidth: 15,
        packageHeight: 10,
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        preferredTime: '10:00 - 12:00',
        price: 800,
        distanceKm: 5,
      });
      deliveryId = result.deliveryId!;
    });

    it('upload une preuve de paiement', async () => {
      const { error } = await uploadDeliveryPayment(
        deliveryId,
        800,
        'orange_money',
        'https://example.com/proof.jpg',
      );
      expect(error).toBeNull();
      const payment = await getDeliveryPayment(deliveryId);
      expect(payment).toBeTruthy();
      expect(payment?.amount).toBe(800);
      expect(payment?.status).toBe('pending');
    });

    it('valide un paiement', async () => {
      await uploadDeliveryPayment(deliveryId, 800, 'orange_money', 'https://example.com/proof.jpg');
      const { error } = await validateDeliveryPayment(deliveryId);
      expect(error).toBeNull();
      const payment = await getDeliveryPayment(deliveryId);
      expect(payment?.status).toBe('validated');
      expect(payment?.validated_at).toBeTruthy();
    });

    it('rejette un paiement', async () => {
      await uploadDeliveryPayment(deliveryId, 800, 'orange_money', 'https://example.com/proof.jpg');
      const { error } = await rejectDeliveryPayment(deliveryId);
      expect(error).toBeNull();
      const payment = await getDeliveryPayment(deliveryId);
      expect(payment?.status).toBe('rejected');
    });

    it('rejette un montant nul', async () => {
      const { error } = await uploadDeliveryPayment(
        deliveryId,
        0,
        'orange_money',
        'https://example.com/proof.jpg',
      );
      expect(error).toContain('montant');
    });

    it('rejette une preuve manquante', async () => {
      const { error } = await uploadDeliveryPayment(deliveryId, 800, 'orange_money', '');
      expect(error).toContain('Preuve');
    });
  });

  // ============================================================
  // 7. Avis sur les livraisons
  // ============================================================
  describe('Avis de livraison', () => {
    it('ajoute un avis valide', async () => {
      const { error } = await addDeliveryReview({
        deliveryId: 'deliv-3',
        reviewerId: 'demo-seller',
        rating: 5,
        comment: 'Excellent',
      });
      expect(error).toBeNull();
      const reviews = await getDeliveryReviews('deliv-3');
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0].rating).toBe(5);
    });

    it('rejette une note hors borne', async () => {
      const { error } = await addDeliveryReview({
        deliveryId: 'deliv-3',
        reviewerId: 'demo-seller',
        rating: 6,
      });
      expect(error).toContain('note');
    });

    it('rejette une note nulle', async () => {
      const { error } = await addDeliveryReview({
        deliveryId: 'deliv-3',
        reviewerId: 'demo-seller',
        rating: 0,
      });
      expect(error).toContain('note');
    });

    it('récupère les avis d\'un livreur', async () => {
      const reviews = await getDriverReviews('driver-user-4');
      // Le livreur démo driver-user-4 a deliv-3 avec un avis
      expect(reviews).toBeDefined();
    });
  });

  // ============================================================
  // 8. Statistiques livreur
  // ============================================================
  describe('getDriverStats', () => {
    it('retourne des statistiques cohérentes', async () => {
      const stats = await getDriverStats('driver-user-1');
      expect(stats).toBeTruthy();
      expect(stats.totalDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.completedDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.cancelledDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.activeDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.totalEarnings).toBeGreaterThanOrEqual(0);
      // La somme des statuts ne dépasse pas le total
      expect(
        stats.completedDeliveries +
          stats.cancelledDeliveries +
          stats.activeDeliveries,
      ).toBeLessThanOrEqual(stats.totalDeliveries);
    });

    it('les gains correspondent aux livraisons terminées', async () => {
      const stats = await getDriverStats('driver-user-4');
      const history = await getDriverDeliveryHistory('driver-user-4');
      const delivered = history.filter((d) => d.status === 'delivered');
      const expectedEarnings = delivered.reduce((sum, d) => sum + d.price, 0);
      expect(stats.totalEarnings).toBe(expectedEarnings);
    });

    it('retourne des zéros pour un livreur inexistant', async () => {
      const stats = await getDriverStats('inexistant');
      expect(stats.totalDeliveries).toBe(0);
      expect(stats.totalEarnings).toBe(0);
    });
  });

  // ============================================================
  // 9. Utilitaires
  // ============================================================
  describe('estimateDeliveryPrice', () => {
    it('calcule le prix = base + per_km × distance', () => {
      const price = estimateDeliveryPrice(
        { base_rate: 500, per_km_rate: 150 },
        10,
      );
      expect(price).toBe(500 + 150 * 10);
    });

    it('applique le tarif de base comme minimum', () => {
      const price = estimateDeliveryPrice(
        { base_rate: 500, per_km_rate: 150 },
        0,
      );
      expect(price).toBe(500);
    });

    it('gère une distance négative (sécurité)', () => {
      const price = estimateDeliveryPrice(
        { base_rate: 500, per_km_rate: 150 },
        -5,
      );
      expect(price).toBe(500);
    });
  });

  describe('canDriverHandle', () => {
    const driver: Pick<DriverProfile, 'max_weight' | 'is_available' | 'city'> = {
      max_weight: 20,
      is_available: true,
      city: 'Ouagadougou',
    };

    it('accepte un colis compatible', () => {
      expect(canDriverHandle(driver, 10, 'Ouagadougou').ok).toBe(true);
    });

    it('rejette un livreur indisponible', () => {
      expect(
        canDriverHandle({ ...driver, is_available: false }, 10, 'Ouagadougou').ok,
      ).toBe(false);
    });

    it('rejette un colis trop lourd', () => {
      const result = canDriverHandle(driver, 50, 'Ouagadougou');
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Poids');
    });

    it('rejette un livreur dans une autre ville', async () => {
      const result = canDriverHandle(driver, 10, 'Bobo-Dioulasso');
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Bobo-Dioulasso');
    });

    it('ignore la ville si non spécifiée', () => {
      expect(canDriverHandle(driver, 10).ok).toBe(true);
    });
  });

  describe('formatFCFA', () => {
    it('formate un montant simple', () => {
      expect(formatFCFA(500)).toBe('500 FCFA');
    });

    it('formate un montant avec séparateur de milliers', () => {
      expect(formatFCFA(12500)).toBe('12 500 FCFA');
    });

    it('formate un montant avec séparateur de millions', () => {
      expect(formatFCFA(1500000)).toBe('1 500 000 FCFA');
    });

    it('arrondit les décimales', () => {
      expect(formatFCFA(1250.7)).toBe('1 251 FCFA');
    });

    it('gère zéro', () => {
      expect(formatFCFA(0)).toBe('0 FCFA');
    });
  });
});
