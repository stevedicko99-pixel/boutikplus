// Service de livraison — Boutikplus
// Gère livreurs, demandes de livraison, paiements et avis.
// Bascule automatiquement entre Supabase (si configuré) et les données de démo.

import { supabase, isSupabaseConfigured } from './supabase';
import { isValidTransition } from './deliveryStatus';
import {
  notifyDeliveryRequested,
  notifyDeliveryAccepted,
  notifyDeliveryStatusChanged,
  notifyDeliveryPaymentUploaded,
  notifyDeliveryPaymentValidated,
  notifyDeliveryCancelled,
} from './notifications';
import {
  DEMO_DRIVER_PROFILES,
  DEMO_DELIVERY_REQUESTS,
  DEMO_DRIVER_REVIEWS,
} from '@/data/demoData';
import type {
  DriverProfile,
  DeliveryRequest,
  DeliveryPayment,
  DeliveryReview,
  DeliveryStatus,
  VehicleType,
  PaymentOperatorId,
  Profile,
} from '@/types/models';
import type { Database } from '@/types/database';

const useDemo = !isSupabaseConfigured;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Cache en mémoire pour le mode démo (mutations locales)
let demoDrivers: DriverProfile[] = [...DEMO_DRIVER_PROFILES];
let demoRequests: (DeliveryRequest & {
  driver?: DriverProfile & { profile?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'> };
  seller?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'>;
  payment?: DeliveryPayment;
})[] = [...DEMO_DELIVERY_REQUESTS];
let demoReviews: DeliveryReview[] = [...DEMO_DRIVER_REVIEWS];
let demoPayments: DeliveryPayment[] = [
  ...(DEMO_DELIVERY_REQUESTS.map((d) => d.payment).filter(Boolean) as DeliveryPayment[]),
];

// ============================================================
// Filtres de recherche de livreurs
// ============================================================
export interface DriverFilters {
  city?: string;
  vehicleType?: VehicleType;
  availableOnly?: boolean;
  minRating?: number;
  maxBaseRate?: number;
  maxPerKmRate?: number;
  minWeight?: number; // poids min supporté par le livreur
  query?: string; // recherche par nom
  sortBy?: 'rating' | 'deliveries' | 'price_asc' | 'price_desc' | 'distance';
  limit?: number;
}

// ============================================================
// Paramètres de création d'une demande de livraison
// ============================================================
export interface CreateDeliveryParams {
  sellerId: string;
  pickupAddress: string;
  pickupCity: string;
  destinationAddress: string;
  destinationCity: string;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  preferredDate: string;
  preferredTime: string;
  description?: string | null;
  price: number;
  distanceKm: number;
}

// ============================================================
// 1. Recherche & filtrage des livreurs
// ============================================================
export async function searchDrivers(
  filters?: DriverFilters,
): Promise<DriverProfile[]> {
  if (useDemo) {
    await delay(200);
    let result = [...demoDrivers];
    if (filters?.availableOnly)
      result = result.filter((d) => d.is_available);
    if (filters?.city)
      result = result.filter((d) => d.city === filters.city);
    if (filters?.vehicleType)
      result = result.filter((d) => d.vehicle_type === filters.vehicleType);
    if (filters?.minRating != null)
      result = result.filter((d) => d.rating >= filters.minRating!);
    if (filters?.maxBaseRate != null)
      result = result.filter((d) => d.base_rate <= filters.maxBaseRate!);
    if (filters?.maxPerKmRate != null)
      result = result.filter((d) => d.per_km_rate <= filters.maxPerKmRate!);
    if (filters?.minWeight != null)
      result = result.filter((d) => d.max_weight >= filters.minWeight!);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (d) =>
          d.profile?.full_name?.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q),
      );
    }
    // Tri
    const sortBy = filters?.sortBy ?? 'rating';
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'deliveries':
          return b.total_deliveries - a.total_deliveries;
        case 'price_asc':
          return a.base_rate - b.base_rate;
        case 'price_desc':
          return b.base_rate - a.base_rate;
        default:
          return b.rating - a.rating;
      }
    });
    // On utilise `!= null` pour qu'un limit explicite de 0 retourne bien un tableau vide
    // (0 est falsy et serait sinon interprété comme "pas de limite").
    return filters?.limit != null ? result.slice(0, filters.limit) : result;
  }

  let query = supabase
    .from('driver_profiles')
    .select('*, profile:profiles(id, full_name, phone, avatar_url, city)')
    .order('rating', { ascending: false });

  if (filters?.availableOnly) query = query.eq('is_available', true);
  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.vehicleType) query = query.eq('vehicle_type', filters.vehicleType);
  if (filters?.minRating != null) query = query.gte('rating', filters.minRating);
  if (filters?.maxBaseRate != null) query = query.lte('base_rate', filters.maxBaseRate);
  if (filters?.maxPerKmRate != null) query = query.lte('per_km_rate', filters.maxPerKmRate);
  if (filters?.minWeight != null) query = query.gte('max_weight', filters.minWeight);
  if (filters?.limit != null) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) console.error('searchDrivers:', error.message);
  return (data as DriverProfile[]) ?? [];
}

export async function getDriverByUser(
  userId: string,
): Promise<DriverProfile | null> {
  if (useDemo) {
    await delay(150);
    return demoDrivers.find((d) => d.user_id === userId) ?? null;
  }
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*, profile:profiles(id, full_name, phone, avatar_url, city)')
    .eq('user_id', userId)
    .single();
  if (error) console.error('getDriverByUser:', error.message);
  return data as DriverProfile | null;
}

export async function getDriverById(
  driverId: string,
): Promise<DriverProfile | null> {
  if (useDemo) {
    await delay(150);
    return demoDrivers.find((d) => d.id === driverId) ?? null;
  }
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*, profile:profiles(id, full_name, phone, avatar_url, city)')
    .eq('id', driverId)
    .single();
  if (error) console.error('getDriverById:', error.message);
  return data as DriverProfile | null;
}

// ============================================================
// 2. CRUD profil livreur
// ============================================================
export async function createDriverProfile(params: {
  userId: string;
  vehicleType: VehicleType;
  city: string;
  baseRate: number;
  perKmRate: number;
  maxWeight: number;
  orangeMoneyNumber?: string | null;
  moovMoneyNumber?: string | null;
  licenseNumber?: string | null;
}): Promise<{ driverId: string | null; error: string | null }> {
  if (useDemo) {
    await delay(300);
    const newDriver: DriverProfile = {
      id: `driver-demo-${Date.now()}`,
      user_id: params.userId,
      vehicle_type: params.vehicleType,
      city: params.city,
      is_available: true,
      rating: 0,
      total_deliveries: 0,
      base_rate: params.baseRate,
      per_km_rate: params.perKmRate,
      max_weight: params.maxWeight,
      orange_money_number: params.orangeMoneyNumber ?? null,
      moov_money_number: params.moovMoneyNumber ?? null,
      current_lat: null,
      current_lng: null,
      license_number: params.licenseNumber ?? null,
      created_at: new Date().toISOString(),
    };
    demoDrivers = [...demoDrivers, newDriver];
    return { driverId: newDriver.id, error: null };
  }
  const { data, error } = await supabase
    .from('driver_profiles')
    .insert({
      user_id: params.userId,
      vehicle_type: params.vehicleType,
      city: params.city,
      base_rate: params.baseRate,
      per_km_rate: params.perKmRate,
      max_weight: params.maxWeight,
      orange_money_number: params.orangeMoneyNumber ?? null,
      moov_money_number: params.moovMoneyNumber ?? null,
      license_number: params.licenseNumber ?? null,
      is_available: true,
    })
    .select('id')
    .single();
  if (error) return { driverId: null, error: error.message };
  return { driverId: data.id, error: null };
}

export async function updateDriverProfile(
  driverId: string,
  updates: Partial<{
    vehicle_type: VehicleType;
    city: string;
    is_available: boolean;
    base_rate: number;
    per_km_rate: number;
    max_weight: number;
    orange_money_number: string | null;
    moov_money_number: string | null;
    license_number: string | null;
    current_lat: number | null;
    current_lng: number | null;
  }>,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    demoDrivers = demoDrivers.map((d) =>
      d.id === driverId ? { ...d, ...updates } : d,
    );
    return { error: null };
  }
  const { error } = await supabase
    .from('driver_profiles')
    .update(updates)
    .eq('id', driverId);
  return { error: error?.message ?? null };
}

export async function setDriverAvailability(
  driverId: string,
  isAvailable: boolean,
): Promise<{ error: string | null }> {
  return updateDriverProfile(driverId, { is_available: isAvailable });
}

// ============================================================
// 3. Demandes de livraison
// ============================================================

/** Demandes en attente visibles par les livreurs (pour le tableau de bord livreur) */
export async function getPendingDeliveriesForDriver(
  driverUserId: string,
): Promise<DeliveryRequest[]> {
  if (useDemo) {
    await delay(200);
    const driver = demoDrivers.find((d) => d.user_id === driverUserId);
    if (!driver) return [];
    return demoRequests.filter(
      (r) =>
        r.status === 'pending' &&
        r.seller_id !== driverUserId &&
        r.package_weight <= driver.max_weight,
    );
  }
  const { data, error } = await supabase
    .from('delivery_requests')
    .select('*, seller:profiles!seller_id(id, full_name, phone, avatar_url, city)')
    .eq('status', 'pending')
    .neq('seller_id', driverUserId)
    .order('created_at', { ascending: false });
  if (error) console.error('getPendingDeliveriesForDriver:', error.message);
  return (data as DeliveryRequest[]) ?? [];
}

/** Livraisons actives du livreur (acceptées / en cours) */
export async function getDriverActiveDeliveries(
  driverUserId: string,
): Promise<DeliveryRequest[]> {
  if (useDemo) {
    await delay(200);
    return demoRequests.filter(
      (r) =>
        r.driver_id === driverUserId &&
        (r.status === 'accepted' || r.status === 'in_progress'),
    );
  }
  const { data, error } = await supabase
    .from('delivery_requests')
    .select('*, seller:profiles!seller_id(id, full_name, phone, avatar_url, city)')
    .eq('driver_id', driverUserId)
    .in('status', ['accepted', 'in_progress'])
    .order('updated_at', { ascending: false });
  if (error) console.error('getDriverActiveDeliveries:', error.message);
  return (data as DeliveryRequest[]) ?? [];
}

/** Historique des livraisons d'un livreur */
export async function getDriverDeliveryHistory(
  driverUserId: string,
): Promise<DeliveryRequest[]> {
  if (useDemo) {
    await delay(200);
    return demoRequests
      .filter(
        (r) =>
          r.driver_id === driverUserId &&
          (r.status === 'delivered' ||
            r.status === 'cancelled' ||
            r.status === 'refunded'),
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
  }
  const { data, error } = await supabase
    .from('delivery_requests')
    .select('*, seller:profiles!seller_id(id, full_name, phone, avatar_url, city)')
    .eq('driver_id', driverUserId)
    .in('status', ['delivered', 'cancelled', 'refunded'])
    .order('updated_at', { ascending: false });
  if (error) console.error('getDriverDeliveryHistory:', error.message);
  return (data as DeliveryRequest[]) ?? [];
}

/** Toutes les livraisons d'un vendeur (filtre par statut optionnel) */
export async function getSellerDeliveries(
  sellerId: string,
  statusFilter?: DeliveryStatus | 'all',
): Promise<DeliveryRequest[]> {
  if (useDemo) {
    await delay(200);
    let result = demoRequests.filter((r) => r.seller_id === sellerId);
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }
  let query = supabase
    .from('delivery_requests')
    .select(
      '*, driver:driver_profiles(*, profile:profiles(id, full_name, phone, avatar_url, city)), payment:delivery_payments(*)',
    )
    .eq('seller_id', sellerId);
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) console.error('getSellerDeliveries:', error.message);
  return (data as unknown as DeliveryRequest[]) ?? [];
}

export async function getDeliveryById(
  deliveryId: string,
): Promise<DeliveryRequest | null> {
  if (useDemo) {
    await delay(150);
    return demoRequests.find((r) => r.id === deliveryId) ?? null;
  }
  const { data, error } = await supabase
    .from('delivery_requests')
    .select(
      '*, seller:profiles!seller_id(id, full_name, phone, avatar_url, city), driver:driver_profiles(*, profile:profiles(id, full_name, phone, avatar_url, city)), payment:delivery_payments(*)',
    )
    .eq('id', deliveryId)
    .single();
  if (error) console.error('getDeliveryById:', error.message);
  return data as DeliveryRequest | null;
}

// ============================================================
// 4. Création & cycle de vie d'une demande
// ============================================================
export async function createDeliveryRequest(
  params: CreateDeliveryParams,
): Promise<{ deliveryId: string | null; error: string | null }> {
  // Validation des données
  const validation = validateDeliveryParams(params);
  if (validation) return { deliveryId: null, error: validation };

  if (useDemo) {
    await delay(300);
    const now = new Date().toISOString();
    const newId = `deliv-demo-${Date.now()}`;
    const newRequest = {
      id: newId,
      seller_id: params.sellerId,
      driver_id: null,
      pickup_address: params.pickupAddress,
      pickup_city: params.pickupCity,
      destination_address: params.destinationAddress,
      destination_city: params.destinationCity,
      package_weight: params.packageWeight,
      package_length: params.packageLength,
      package_width: params.packageWidth,
      package_height: params.packageHeight,
      preferred_date: params.preferredDate,
      preferred_time: params.preferredTime,
      description: params.description ?? null,
      price: params.price,
      distance_km: params.distanceKm,
      status: 'pending' as DeliveryStatus,
      cancellation_reason: null,
      created_at: now,
      updated_at: now,
      accepted_at: null,
      delivered_at: null,
      seller: {
        id: 'demo-seller',
        full_name: 'Ibrahim Ouédraogo',
        phone: '66 98 76 54',
        avatar_url: null,
        city: 'Ouagadougou',
      },
    };
    demoRequests = [newRequest, ...demoRequests];
    // Notifier les livreurs disponibles dans la ville de départ (simulé en démo)
    return { deliveryId: newId, error: null };
  }

  const { data, error } = await supabase
    .from('delivery_requests')
    .insert({
      seller_id: params.sellerId,
      pickup_address: params.pickupAddress,
      pickup_city: params.pickupCity,
      destination_address: params.destinationAddress,
      destination_city: params.destinationCity,
      package_weight: params.packageWeight,
      package_length: params.packageLength,
      package_width: params.packageWidth,
      package_height: params.packageHeight,
      preferred_date: params.preferredDate,
      preferred_time: params.preferredTime,
      description: params.description ?? null,
      price: params.price,
      distance_km: params.distanceKm,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) return { deliveryId: null, error: error.message };

  // Notifier les livreurs disponibles de la ville de prise en charge
  await notifyDeliveryRequested(params.pickupCity, data.id, params.price);
  return { deliveryId: data.id, error: null };
}

/** Validation métier des paramètres de création */
function validateDeliveryParams(p: CreateDeliveryParams): string | null {
  if (!p.sellerId) return 'Vendeur requis';
  if (!p.pickupAddress?.trim()) return "L'adresse de prise en charge est requise";
  if (!p.pickupCity?.trim()) return "La ville de prise en charge est requise";
  if (!p.destinationAddress?.trim()) return "L'adresse de destination est requise";
  if (!p.destinationCity?.trim()) return 'La ville de destination est requise';
  if (p.packageWeight <= 0) return 'Le poids doit être supérieur à 0';
  if (p.packageWeight > 1500) return 'Poids maximal dépassé (1500 kg)';
  if (p.packageLength <= 0 || p.packageWidth <= 0 || p.packageHeight <= 0)
    return 'Les dimensions doivent être positives';
  if (!p.preferredDate) return 'La date préférée est requise';
  if (!p.preferredTime) return "Le créneau horaire est requis";
  if (p.price < 0) return 'Le prix ne peut pas être négatif';
  if (p.distanceKm < 0) return 'La distance ne peut pas être négative';
  // Date dans le passé interdite. `preferredDate` est une date (YYYY-MM-DD) et non un
  // datetime : on compare donc au niveau du jour pour autoriser "aujourd'hui" quel que
  // soit l'heure courante (comparaison lexicographique sûre sur le format ISO).
  const todayStr = new Date().toISOString().split('T')[0];
  if (p.preferredDate < todayStr) return 'La date ne peut pas être dans le passé';
  return null;
}

/**
 * Met à jour le statut d'une livraison en respectant les transitions valides.
 * `actorRole` : 'driver' ou 'seller' selon qui déclenche l'action.
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: DeliveryStatus,
  actorRole: 'driver' | 'seller',
  options?: { driverId?: string; cancellationReason?: string },
): Promise<{ error: string | null }> {
  // Récupérer l'état courant
  const current = await getDeliveryById(deliveryId);
  if (!current) return { error: 'Livraison introuvable' };

  // Vérifier la transition
  if (!isValidTransition(current.status, newStatus, actorRole)) {
    return {
      error: `Transition non autorisée : ${current.status} → ${newStatus} pour le rôle ${actorRole}`,
    };
  }

  const now = new Date().toISOString();
  const updates: Database['public']['Tables']['delivery_requests']['Update'] = {
    status: newStatus,
    updated_at: now,
  };
  if (newStatus === 'accepted' && options?.driverId) {
    updates.driver_id = options.driverId;
    updates.accepted_at = now;
  }
  if (newStatus === 'delivered') {
    updates.delivered_at = now;
  }
  if (newStatus === 'cancelled' && options?.cancellationReason) {
    updates.cancellation_reason = options.cancellationReason;
  }

  if (useDemo) {
    await delay(200);
    demoRequests = demoRequests.map((r) =>
      r.id === deliveryId ? { ...r, ...updates } as typeof r : r,
    );
    // Notifications
    await sendStatusNotifications(current, newStatus, options);
    return { error: null };
  }

  const { error } = await supabase
    .from('delivery_requests')
    .update(updates)
    .eq('id', deliveryId);
  if (error) return { error: error.message };

  await sendStatusNotifications(current, newStatus, options);
  return { error: null };
}

/** Déclenche les notifications appropriées selon le changement de statut */
async function sendStatusNotifications(
  current: DeliveryRequest,
  newStatus: DeliveryStatus,
  options?: { driverId?: string; cancellationReason?: string },
): Promise<void> {
  const driverId = current.driver_id ?? options?.driverId;
  switch (newStatus) {
    case 'accepted':
      // Notifier le vendeur que le livreur a accepté
      if (current.seller_id) {
        await notifyDeliveryAccepted(current.seller_id, current.id);
      }
      break;
    case 'in_progress':
      if (current.seller_id) {
        await notifyDeliveryStatusChanged(
          current.seller_id,
          current.id,
          'in_progress',
        );
      }
      break;
    case 'delivered':
      if (current.seller_id) {
        await notifyDeliveryStatusChanged(
          current.seller_id,
          current.id,
          'delivered',
        );
      }
      break;
    case 'cancelled':
      // Notifier l'autre partie
      if (current.seller_id) {
        await notifyDeliveryCancelled(
          current.seller_id,
          current.id,
          options?.cancellationReason ?? null,
        );
      }
      if (driverId) {
        await notifyDeliveryCancelled(
          driverId,
          current.id,
          options?.cancellationReason ?? null,
        );
      }
      break;
    case 'refunded':
      if (current.seller_id) {
        await notifyDeliveryStatusChanged(
          current.seller_id,
          current.id,
          'refunded',
        );
      }
      break;
  }
}

/** Raccourci : un livreur accepte une livraison en attente */
export async function acceptDelivery(
  deliveryId: string,
  driverUserId: string,
): Promise<{ error: string | null }> {
  return updateDeliveryStatus(deliveryId, 'accepted', 'driver', {
    driverId: driverUserId,
  });
}

/** Raccourci : le livreur a récupéré le colis */
export async function startDelivery(
  deliveryId: string,
): Promise<{ error: string | null }> {
  return updateDeliveryStatus(deliveryId, 'in_progress', 'driver');
}

/** Raccourci : le livreur a livré le colis */
export async function completeDelivery(
  deliveryId: string,
): Promise<{ error: string | null }> {
  return updateDeliveryStatus(deliveryId, 'delivered', 'driver');
}

/** Raccourci : annulation par le vendeur ou le livreur */
export async function cancelDelivery(
  deliveryId: string,
  actorRole: 'driver' | 'seller',
  reason?: string,
): Promise<{ error: string | null }> {
  return updateDeliveryStatus(deliveryId, 'cancelled', actorRole, {
    cancellationReason: reason,
  });
}

/** Raccourci : demande de remboursement par le vendeur (après livraison) */
export async function requestRefund(
  deliveryId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  // Le remboursement est une transition vendeur delivered → refunded
  return updateDeliveryStatus(deliveryId, 'refunded', 'seller', {
    cancellationReason: reason,
  });
}

// ============================================================
// 5. Paiements de livraison
// ============================================================
export async function getDeliveryPayment(
  deliveryId: string,
): Promise<DeliveryPayment | null> {
  if (useDemo) {
    await delay(150);
    return demoPayments.find((p) => p.delivery_id === deliveryId) ?? null;
  }
  const { data, error } = await supabase
    .from('delivery_payments')
    .select('*')
    .eq('delivery_id', deliveryId)
    .single();
  if (error) console.error('getDeliveryPayment:', error.message);
  return data as DeliveryPayment | null;
}

export async function uploadDeliveryPayment(
  deliveryId: string,
  amount: number,
  operator: PaymentOperatorId,
  proofImageUrl: string,
): Promise<{ error: string | null }> {
  if (amount <= 0) return { error: 'Le montant doit être positif' };
  if (!proofImageUrl) return { error: 'Preuve de paiement requise' };

  if (useDemo) {
    await delay(300);
    const newPayment: DeliveryPayment = {
      id: `dpay-demo-${Date.now()}`,
      delivery_id: deliveryId,
      amount,
      operator,
      proof_image_url: proofImageUrl,
      status: 'pending',
      created_at: new Date().toISOString(),
      validated_at: null,
    };
    demoPayments = [...demoPayments, newPayment];
    // Lier le paiement à la demande
    demoRequests = demoRequests.map((r) =>
      r.id === deliveryId ? { ...r, payment: newPayment } : r,
    );
    await notifyDeliveryPaymentUploaded(deliveryId);
    return { error: null };
  }

  const { error } = await supabase.from('delivery_payments').insert({
    delivery_id: deliveryId,
    amount,
    operator,
    proof_image_url: proofImageUrl,
    status: 'pending',
  });
  if (error) return { error: error.message };
  await notifyDeliveryPaymentUploaded(deliveryId);
  return { error: null };
}

export async function validateDeliveryPayment(
  deliveryId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    demoPayments = demoPayments.map((p) =>
      p.delivery_id === deliveryId
        ? { ...p, status: 'validated', validated_at: new Date().toISOString() }
        : p,
    );
    demoRequests = demoRequests.map((r) =>
      r.id === deliveryId && r.payment
        ? {
            ...r,
            payment: {
              ...r.payment,
              status: 'validated',
              validated_at: new Date().toISOString(),
            },
          }
        : r,
    );
    await notifyDeliveryPaymentValidated(deliveryId);
    return { error: null };
  }
  const { error } = await supabase
    .from('delivery_payments')
    .update({ status: 'validated', validated_at: new Date().toISOString() })
    .eq('delivery_id', deliveryId);
  if (error) return { error: error.message };
  await notifyDeliveryPaymentValidated(deliveryId);
  return { error: null };
}

export async function rejectDeliveryPayment(
  deliveryId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    demoPayments = demoPayments.map((p) =>
      p.delivery_id === deliveryId ? { ...p, status: 'rejected' } : p,
    );
    demoRequests = demoRequests.map((r) =>
      r.id === deliveryId && r.payment
        ? { ...r, payment: { ...r.payment, status: 'rejected' } }
        : r,
    );
    return { error: null };
  }
  const { error } = await supabase
    .from('delivery_payments')
    .update({ status: 'rejected' })
    .eq('delivery_id', deliveryId);
  return { error: error?.message ?? null };
}

// ============================================================
// 6. Avis sur les livraisons
// ============================================================
export async function getDeliveryReviews(
  deliveryId: string,
): Promise<DeliveryReview[]> {
  if (useDemo) {
    await delay(150);
    return demoReviews.filter((r) => r.delivery_id === deliveryId);
  }
  const { data, error } = await supabase
    .from('delivery_reviews')
    .select('*, reviewer:profiles(id, full_name, avatar_url)')
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: false });
  if (error) console.error('getDeliveryReviews:', error.message);
  return (data as DeliveryReview[]) ?? [];
}

export async function getDriverReviews(
  driverUserId: string,
): Promise<DeliveryReview[]> {
  if (useDemo) {
    await delay(150);
    // En démo, on retourne tous les avis des livraisons de ce livreur
    const driverDeliveries = demoRequests.filter(
      (r) => r.driver_id === driverUserId,
    );
    const deliveryIds = new Set(driverDeliveries.map((d) => d.id));
    return demoReviews.filter((r) => deliveryIds.has(r.delivery_id));
  }
  const { data, error } = await supabase
    .from('delivery_reviews')
    .select(
      '*, delivery:delivery_requests!inner(driver_id), reviewer:profiles(id, full_name, avatar_url)',
    )
    .eq('delivery.driver_id', driverUserId)
    .order('created_at', { ascending: false });
  if (error) console.error('getDriverReviews:', error.message);
  return (data as DeliveryReview[]) ?? [];
}

export async function addDeliveryReview(params: {
  deliveryId: string;
  reviewerId: string;
  rating: number;
  comment?: string | null;
}): Promise<{ error: string | null }> {
  if (params.rating < 1 || params.rating > 5) {
    return { error: 'La note doit être comprise entre 1 et 5' };
  }
  if (useDemo) {
    await delay(200);
    const newReview: DeliveryReview = {
      id: `drev-demo-${Date.now()}`,
      delivery_id: params.deliveryId,
      reviewer_id: params.reviewerId,
      rating: params.rating,
      comment: params.comment ?? null,
      created_at: new Date().toISOString(),
      reviewer: {
        id: params.reviewerId,
        full_name: 'Utilisateur',
        avatar_url: null,
      },
    };
    demoReviews = [newReview, ...demoReviews];
    return { error: null };
  }
  const { error } = await supabase.from('delivery_reviews').insert({
    delivery_id: params.deliveryId,
    reviewer_id: params.reviewerId,
    rating: params.rating,
    comment: params.comment ?? null,
  });
  return { error: error?.message ?? null };
}

// ============================================================
// 7. Statistiques livreur (pour le tableau de bord)
// ============================================================
export interface DriverStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  activeDeliveries: number;
  averageRating: number;
  totalEarnings: number;
  thisMonthDeliveries: number;
  thisMonthEarnings: number;
}

export async function getDriverStats(
  driverUserId: string,
): Promise<DriverStats> {
  if (useDemo) {
    await delay(200);
    const mine = demoRequests.filter((r) => r.driver_id === driverUserId);
    const completed = mine.filter((r) => r.status === 'delivered');
    const cancelled = mine.filter((r) => r.status === 'cancelled');
    const active = mine.filter(
      (r) => r.status === 'accepted' || r.status === 'in_progress',
    );
    const driver = demoDrivers.find((d) => d.user_id === driverUserId);
    const earnings = completed.reduce((sum, r) => sum + r.price, 0);
    const now = new Date();
    const thisMonth = mine.filter((r) => {
      const d = new Date(r.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const thisMonthCompleted = thisMonth.filter(
      (r) => r.status === 'delivered',
    );
    return {
      totalDeliveries: mine.length,
      completedDeliveries: completed.length,
      cancelledDeliveries: cancelled.length,
      activeDeliveries: active.length,
      averageRating: driver?.rating ?? 0,
      totalEarnings: earnings,
      thisMonthDeliveries: thisMonthCompleted.length,
      thisMonthEarnings: thisMonthCompleted.reduce(
        (sum, r) => sum + r.price,
        0,
      ),
    };
  }
  const { data, error } = await supabase
    .from('delivery_requests')
    .select('status, price, created_at')
    .eq('driver_id', driverUserId);
  if (error) console.error('getDriverStats:', error.message);
  const list = data ?? [];
  const completed = list.filter((r: any) => r.status === 'delivered');
  const cancelled = list.filter((r: any) => r.status === 'cancelled');
  const active = list.filter(
    (r: any) => r.status === 'accepted' || r.status === 'in_progress',
  );
  const earnings = completed.reduce(
    (sum: number, r: any) => sum + (r.price ?? 0),
    0,
  );
  const now = new Date();
  const thisMonth = list.filter((r: any) => {
    const d = new Date(r.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthCompleted = thisMonth.filter(
    (r: any) => r.status === 'delivered',
  );
  const driver = await getDriverByUser(driverUserId);
  return {
    totalDeliveries: list.length,
    completedDeliveries: completed.length,
    cancelledDeliveries: cancelled.length,
    activeDeliveries: active.length,
    averageRating: driver?.rating ?? 0,
    totalEarnings: earnings,
    thisMonthDeliveries: thisMonthCompleted.length,
    thisMonthEarnings: thisMonthCompleted.reduce(
      (sum: number, r: any) => sum + (r.price ?? 0),
      0,
    ),
  };
}

// ============================================================
// 8. Souscription temps réel (Supabase uniquement — no-op en démo)
// ============================================================
export function subscribeToDeliveryUpdates(
  deliveryId: string,
  callback: (delivery: DeliveryRequest) => void,
): () => void {
  if (useDemo) {
    // En démo, pas de temps réel — on retourne un désabonnement no-op
    return () => {};
  }
  const sub = supabase
    .channel(`delivery-${deliveryId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'delivery_requests',
        filter: `id=eq.${deliveryId}`,
      },
      (payload) => {
        callback(payload.new as DeliveryRequest);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(sub);
  };
}

export function subscribeToDriverInbox(
  driverUserId: string,
  callback: (delivery: DeliveryRequest) => void,
): () => void {
  if (useDemo) return () => {};
  const sub = supabase
    .channel(`driver-inbox-${driverUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_requests',
        filter: `status=eq.pending`,
      },
      (payload) => {
        callback(payload.new as DeliveryRequest);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(sub);
  };
}

// ============================================================
// 9. Utilitaires
// ============================================================

/** Estime le prix d'une livraison selon le profil du livreur et la distance */
export function estimateDeliveryPrice(
  driver: Pick<DriverProfile, 'base_rate' | 'per_km_rate'>,
  distanceKm: number,
): number {
  return Math.max(driver.base_rate, driver.base_rate + driver.per_km_rate * Math.max(0, distanceKm));
}

/** Vérifie qu'un livreur peut transporter un colis donné */
export function canDriverHandle(
  driver: Pick<DriverProfile, 'max_weight' | 'is_available' | 'city'>,
  packageWeight: number,
  pickupCity?: string,
): { ok: boolean; reason?: string } {
  if (!driver.is_available) {
    return { ok: false, reason: 'Livreur non disponible actuellement' };
  }
  if (packageWeight > driver.max_weight) {
    return {
      ok: false,
      reason: `Poids (${packageWeight}kg) supérieur à la capacité (${driver.max_weight}kg)`,
    };
  }
  if (pickupCity && driver.city !== pickupCity) {
    return {
      ok: false,
      reason: `Livreur à ${driver.city}, prise en charge à ${pickupCity}`,
    };
  }
  return { ok: true };
}

/** Formate un montant FCFA */
export function formatFCFA(amount: number): string {
  // Normalise les espaces insécables (U+202F, U+00A0) produits par Intl en espaces simples
  // pour un rendu déterministe quel que soit l'environnement (Node / locale).
  return (
    new Intl.NumberFormat('fr-FR').format(Math.round(amount)).replace(/[\u202F\u00A0]/g, ' ') +
    ' FCFA'
  );
}

export { isSupabaseConfigured, useDemo as isDemoMode };
