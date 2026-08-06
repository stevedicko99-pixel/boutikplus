import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { updateDriverLocation } from './deliveryService';

let watcher: LocationSubscription | null = null;
let activeDeliveryId: string | null = null;

export async function startDeliveryLocationTracking(
  deliveryId: string,
): Promise<{ error: string | null }> {
  if (watcher && activeDeliveryId === deliveryId) return { error: null };
  stopDeliveryLocationTracking();

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { error: 'Autorisez la localisation pour partager votre position pendant la livraison.' };
  }

  activeDeliveryId = deliveryId;
  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10_000,
      distanceInterval: 15,
    },
    async ({ coords, timestamp }) => {
      if (activeDeliveryId !== deliveryId) return;
      await updateDriverLocation({
        deliveryId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyM: coords.accuracy,
        heading: coords.heading,
        speedMps: coords.speed,
        recordedAt: new Date(timestamp).toISOString(),
      });
    },
  );
  return { error: null };
}

export function stopDeliveryLocationTracking(): void {
  watcher?.remove();
  watcher = null;
  activeDeliveryId = null;
}
