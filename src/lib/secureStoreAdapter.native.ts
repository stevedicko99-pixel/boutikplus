// Adaptateur natif : utilise expo-secure-store avec fallback AsyncStorage.
// ⚠️ SUR ANDROID CERTAINS APPAREILS (Samsung, Huawei, Xiaomi, Android Go) ont
// un keystore corrompu ou verrouillé qui fait throw expo-secure-store à la
// PREMIÈRE UTILISATION. Sans garde ici, ça throw dans le flux signIn/signUp,
// mais PIRE : si expo-secure-store throw au moment du require() (rare mais
// possible), tout le module supabase.ts crash → page blanche APRÈS splash.
//
// Stratégie : lazy-load expo-secure-store, test immédiat, fallback permanent
// vers AsyncStorage si le keystore natif est KO.

// AsyncStorage est toujours disponible (peer dependency Expo).
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdapterImpl = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let implPromise: Promise<AdapterImpl> | null = null;

function buildAsyncStorageAdapter(): AdapterImpl {
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value).then(() => {}),
    removeItem: (key) => AsyncStorage.removeItem(key).then(() => {}),
  };
}

function resolveImpl(): Promise<AdapterImpl> {
  if (implPromise) return implPromise;
  implPromise = (async (): Promise<AdapterImpl> => {
    try {
      // 🚨 Lazy-load : si le require throw (module natif cassé), on fallback
      // directement sans laisser l'erreur se propager au require de supabase.
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      if (!SecureStore || typeof SecureStore.getItemAsync !== 'function') {
        return buildAsyncStorageAdapter();
      }
      // Test réel : un grand nombre d'appareils Android passent le require()
      // mais throw au PREMIER appel getItemAsync (keystore locked / corrompu).
      const PROBE_KEY = '__btik_secure_probe__';
      try {
        await SecureStore.getItemAsync(PROBE_KEY);
      } catch (probeErr) {
        // Keystore indisponible. Fallback vers AsyncStorage pour toute la session.
        console.warn(
          '[secureStoreAdapter] expo-secure-store keystore indisponible (appareil: keystore locked/corrompu). Fallback AsyncStorage.',
          probeErr instanceof Error ? probeErr.message : probeErr,
        );
        return buildAsyncStorageAdapter();
      }
      // Passé : utiliser SecureStore normalement.
      return {
        getItem: (key) => SecureStore.getItemAsync(key).catch(() => AsyncStorage.getItem(key)),
        setItem: (key, value) =>
          SecureStore.setItemAsync(key, value)
            .then(() => {})
            .catch(() => AsyncStorage.setItem(key, value).then(() => {})),
        removeItem: (key) =>
          SecureStore.deleteItemAsync(key)
            .then(() => {})
            .catch(() => AsyncStorage.removeItem(key).then(() => {})),
      };
    } catch (requireErr) {
      // Module natif indisponible. Fallback AsyncStorage.
      console.warn(
        '[secureStoreAdapter] require(expo-secure-store) échoué. Fallback AsyncStorage.',
        requireErr instanceof Error ? requireErr.message : requireErr,
      );
      return buildAsyncStorageAdapter();
    }
  })();
  return implPromise;
}

export const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const impl = await resolveImpl();
    return impl.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const impl = await resolveImpl();
    return impl.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    const impl = await resolveImpl();
    return impl.removeItem(key);
  },
};
