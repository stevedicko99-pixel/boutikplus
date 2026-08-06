// Constantes livraison — Boutikplus
// Types de véhicules, tailles de colis, villes et filtres.

import type { VehicleType, DeliveryStatus } from '@/types/models';
import { CITY_LIST, getCityByName, type Coordinates } from '@/constants/cities';

export { CITY_LIST, getZonesForCity, getZoneById } from '@/constants/cities';

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

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDistanceKm(
  cityA: string,
  cityB: string,
  coordinatesA?: Coordinates | null,
  coordinatesB?: Coordinates | null,
): number {
  const from = coordinatesA ?? getCityByName(cityA)?.center;
  const to = coordinatesB ?? getCityByName(cityB)?.center;
  if (!from || !to) return 0;
  return Math.round(haversineDistanceKm(from, to) * 10) / 10;
}
