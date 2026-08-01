// Tests unitaires — constantes de livraison
import {
  VEHICLE_TYPES,
  VEHICLE_LIST,
  getVehicle,
  getVehicleName,
  PACKAGE_SIZE_BUCKETS,
  CITY_LIST,
  TIME_SLOTS,
  DELIVERY_FILTERS,
  estimateDistanceKm,
  type PackageSizeBucket,
} from '@/constants/delivery';

describe('delivery constants', () => {
  describe('VEHICLE_TYPES', () => {
    it('définit les 5 types de véhicules attendus', () => {
      const types = Object.keys(VEHICLE_TYPES);
      expect(types).toEqual(
        expect.arrayContaining(['moto', 'velo', 'voiture', 'tricycle', 'camion']),
      );
      expect(types).toHaveLength(5);
    });

    it('chaque véhicule a un tarif de base et par km positifs', () => {
      Object.values(VEHICLE_TYPES).forEach((v) => {
        expect(v.defaultBaseRate).toBeGreaterThan(0);
        expect(v.defaultPerKmRate).toBeGreaterThan(0);
        expect(v.maxWeightKg).toBeGreaterThan(0);
        expect(v.speedKmH).toBeGreaterThan(0);
        expect(v.label).toBeTruthy();
        expect(v.icon).toBeTruthy();
        expect(v.color).toMatch(/^#/);
      });
    });

    it('la moto est moins chère que le camion', () => {
      expect(VEHICLE_TYPES.moto.defaultBaseRate).toBeLessThan(
        VEHICLE_TYPES.camion.defaultBaseRate,
      );
    });

    it('le camion supporte le plus de poids', () => {
      expect(VEHICLE_TYPES.camion.maxWeightKg).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('VEHICLE_LIST', () => {
    it('contient les 5 véhicules', () => {
      expect(VEHICLE_LIST).toHaveLength(5);
    });
  });

  describe('getVehicle / getVehicleName', () => {
    it('retourne la définition d\'un véhicule', () => {
      const moto = getVehicle('moto');
      expect(moto.id).toBe('moto');
      expect(moto.label).toBe('Moto');
    });

    it('retourne le nom d\'un véhicule', () => {
      expect(getVehicleName('voiture')).toBe('Voiture');
    });
  });

  describe('PACKAGE_SIZE_BUCKETS', () => {
    it('définit 3 tailles (small, medium, large)', () => {
      const ids = PACKAGE_SIZE_BUCKETS.map((b) => b.id);
      expect(ids).toEqual(['small', 'medium', 'large']);
    });

    it('les tailles sont ordonnées par poids croissant', () => {
      const weights = PACKAGE_SIZE_BUCKETS.map((b) => b.weightKg);
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThan(weights[i - 1]);
      }
    });

    it('chaque taille a des dimensions positives', () => {
      PACKAGE_SIZE_BUCKETS.forEach((b: PackageSizeBucket) => {
        expect(b.lengthCm).toBeGreaterThan(0);
        expect(b.widthCm).toBeGreaterThan(0);
        expect(b.heightCm).toBeGreaterThan(0);
        expect(b.weightKg).toBeGreaterThan(0);
      });
    });
  });

  describe('CITY_LIST', () => {
    it('inclut les grandes villes du Burkina Faso', () => {
      expect(CITY_LIST).toContain('Ouagadougou');
      expect(CITY_LIST).toContain('Bobo-Dioulasso');
      expect(CITY_LIST).toContain('Koudougou');
    });

    it('contient au moins 8 villes', () => {
      expect(CITY_LIST.length).toBeGreaterThanOrEqual(8);
    });

    it('n\'a pas de doublons', () => {
      const unique = new Set(CITY_LIST);
      expect(unique.size).toBe(CITY_LIST.length);
    });
  });

  describe('TIME_SLOTS', () => {
    it('définit des créneaux sur la journée', () => {
      expect(TIME_SLOTS.length).toBeGreaterThanOrEqual(4);
      TIME_SLOTS.forEach((slot) => {
        expect(slot).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
      });
    });
  });

  describe('DELIVERY_FILTERS', () => {
    it('inclut le filtre "all" et les statuts principaux', () => {
      const ids = DELIVERY_FILTERS.map((f) => f.id);
      expect(ids).toContain('all');
      expect(ids).toContain('pending');
      expect(ids).toContain('delivered');
      expect(ids).toContain('cancelled');
    });
  });

  describe('estimateDistanceKm', () => {
    it('retourne 5 km pour une livraison intra-ville', () => {
      expect(estimateDistanceKm('Ouagadougou', 'Ouagadougou')).toBe(5);
    });

    it('retourne la distance entre Ouaga et Bobo', () => {
      expect(estimateDistanceKm('Ouagadougou', 'Bobo-Dioulasso')).toBe(360);
    });

    it('est symétrique (A→B = B→A)', () => {
      expect(estimateDistanceKm('Bobo-Dioulasso', 'Ouagadougou')).toBe(
        estimateDistanceKm('Ouagadougou', 'Bobo-Dioulasso'),
      );
    });

    it('retourne une valeur par défaut pour les villes non listées', () => {
      expect(estimateDistanceKm('Ouagadougou', 'Dori')).toBe(50);
    });

    it('retourne une valeur positive', () => {
      expect(estimateDistanceKm('Koudougou', 'Banfora')).toBeGreaterThan(0);
    });
  });
});
