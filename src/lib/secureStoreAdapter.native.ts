// Adaptateur natif : utilise expo-secure-store avec fallback AsyncStorage.
// ⚠️ SUR ANDROID CERTAINS APPAREILS (Samsung, Huawei, Xiaomi, Android Go) ont
// un keystore corrompu ou verrouillé qui fait throw expo-secure-store à la
// PREMIÈRE UTILISATION. Sans garde ici, ça throw dans le flux signIn/signUp,
// mais PIRE : si expo-secure-store throw au moment du require() (rare mais
// possible), tout le module supabase.ts crash → page blanche APRÈS splash.
//
// Stratégie : lazy-load expo-secure-store, test immédiat, fallback permanent
// vers AsyncStorage si le keystore natif est KO.

// #region debug-point D:secure-native-top
(() => { try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:2','SS0: secureStoreAdapter module évalué'); } catch {} })();
// #endregion
// AsyncStorage est toujours disponible (peer dependency Expo).
// #region debug-point D:asyncstorage-require
(() => { try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:6','SS1: require AsyncStorage pré-import'); } catch {} })();
// #endregion
import AsyncStorage from '@react-native-async-storage/async-storage';
// #region debug-point D:asyncstorage-imported
(() => { try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:10','SS2: AsyncStorage imported OK (pas de crash require)'); } catch {} })();
// #endregion

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
      // #region debug-point D:require-expo-secure-store
      try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:44','SS3: require(expo-secure-store) about to run'); } catch {}
      // #endregion
      const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
      // #region debug-point D:expo-secure-store-required
      try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:48','SS4: require(expo-secure-store) OK (no throw)'); } catch {}
      // #endregion
      if (!SecureStore || typeof SecureStore.getItemAsync !== 'function') {
        try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:51','SS4.1: expo-secure-store API missing, fallback AsyncStorage'); } catch {}
        return buildAsyncStorageAdapter();
      }
      // Test réel : un grand nombre d'appareils Android passent le require()
      // mais throw au PREMIER appel getItemAsync (keystore locked / corrompu).
      const PROBE_KEY = '__btik_secure_probe__';
      try {
        try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:60','SS5: probe SecureStore.getItemAsync()'); } catch {}
        await SecureStore.getItemAsync(PROBE_KEY);
        try { (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:63','SS6: SecureStore probe OK — keystore accessible'); } catch {}
      } catch (probeErr) {
        try {
          (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:66','SS6-FAIL: SecureStore probe throw', { err: probeErr instanceof Error ? probeErr.message : String(probeErr) });
        } catch {}
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
      try {
        (globalThis as any).__dbg?.('D','secureStoreAdapter.native.ts:84','SS4-REQUIRE-ERR: require(expo-secure-store) throw', {
          err: requireErr instanceof Error ? requireErr.message : String(requireErr),
        });
      } catch {}
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
