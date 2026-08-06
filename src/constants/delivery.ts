// Constantes livraison — Boutikplus
// Types de véhicules, tailles de colis, villes et filtres.

import type { VehicleType, DeliveryStatus } from '@/types/models';

export interface VehicleDef {
  id: VehicleType;
  label: string;
  icon: string; // nom d'icône Feather
  color: string;
  maxWeightKg: number;
  defaultBaseRate: number; // FCFA
  defaultPerKmRate: number; // FCFA
  speedKmH: number;
}

// Frais de livraison standard appliqués par boutique lors du checkout.
export const DELIVERY_FEE_PER_SELLER = 1000;

export const VEHICLE_TYPES: Record<VehicleType, VehicleDef> = {
  moto: {
    id: 'moto',
    label: 'Moto',
    icon: 'navigation',
    color: '#FF6B00',
    maxWeightKg: 20,
    defaultBaseRate: 500,
    defaultPerKmRate: 150,
    speedKmH: 35,
  },
  velo: {
    id: 'velo',
    label: 'Vélo',
    icon: 'circle',
    color: '#00A859',
    maxWeightKg: 10,
    defaultBaseRate: 300,
    defaultPerKmRate: 100,
    speedKmH: 18,
  },
  voiture: {
    id: 'voiture',
    label: 'Voiture',
    icon: 'truck',
    color: '#6B2D8E',
    maxWeightKg: 200,
    defaultBaseRate: 1500,
    defaultPerKmRate: 350,
    speedKmH: 45,
  },
  tricycle: {
    id: 'tricycle',
    label: 'Tricycle',
    icon: 'triangle',
    color: '#0DCAF0',
    maxWeightKg: 150,
    defaultBaseRate: 800,
    defaultPerKmRate: 200,
    speedKmH: 30,
  },
  camion: {
    id: 'camion',
    label: 'Camion',
    icon: 'package',
    color: '#DC3545',
    maxWeightKg: 1500,
    defaultBaseRate: 5000,
    defaultPerKmRate: 600,
    speedKmH: 40,
  },
};

export const VEHICLE_LIST: VehicleDef[] = [
  VEHICLE_TYPES.moto,
  VEHICLE_TYPES.velo,
  VEHICLE_TYPES.voiture,
  VEHICLE_TYPES.tricycle,
  VEHICLE_TYPES.camion,
];

export const getVehicle = (id: VehicleType): VehicleDef => VEHICLE_TYPES[id];
export const getVehicleName = (id: VehicleType): string => VEHICLE_TYPES[id]?.label ?? 'Véhicule';

// Tailles de colis pré-définies
export interface PackageSizeBucket {
  id: 'small' | 'medium' | 'large';
  label: string;
  icon: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  color: string;
}

export const PACKAGE_SIZE_BUCKETS: PackageSizeBucket[] = [
  {
    id: 'small',
    label: 'Petit',
    icon: 'square',
    weightKg: 2,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    color: '#00A859',
  },
  {
    id: 'medium',
    label: 'Moyen',
    icon: 'square',
    weightKg: 8,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    color: '#FFC107',
  },
  {
    id: 'large',
    label: 'Grand',
    icon: 'square',
    weightKg: 20,
    lengthCm: 70,
    widthCm: 50,
    heightCm: 40,
    color: '#FF6B00',
  },
];

// Villes principales du Burkina Faso
export const CITY_LIST: string[] = [
  'Ouagadougou',
  'Bobo-Dioulasso',
  'Koudougou',
  'Ouahigouya',
  'Banfora',
  'Tenkodogo',
  'Fada N\'Gourma',
  'Dédougou',
  'Dori',
  'Gaoua',
];

// Créneaux horaires disponibles
export const TIME_SLOTS: string[] = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
];

// Filtres de statut pour la liste des livraisons
export interface DeliveryFilterDef {
  id: DeliveryStatus | 'all';
  label: string;
}

export const DELIVERY_FILTERS: DeliveryFilterDef[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'accepted', label: 'Acceptées' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
];

// Estimation de distance (km) entre deux villes — table simplifiée Burkina
const CITY_DISTANCES: Record<string, number> = {
  'Ouagadougou|Bobo-Dioulasso': 360,
  'Ouagadougou|Koudougou': 100,
  'Ouagadougou|Ouahigouya': 180,
  'Ouagadougou|Banfora': 420,
  'Ouagadougou|Tenkodogo': 190,
  'Bobo-Dioulasso|Banfora': 85,
  'Bobo-Dioulasso|Koudougou': 280,
};

export function estimateDistanceKm(cityA: string, cityB: string): number {
  if (cityA === cityB) return 5; // intra-ville
  const key1 = `${cityA}|${cityB}`;
  const key2 = `${cityB}|${cityA}`;
  return CITY_DISTANCES[key1] ?? CITY_DISTANCES[key2] ?? 50;
}
