import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

export interface CacheOptions {
  ttlMs?: number;
  persist?: boolean;
  staleWhileRevalidate?: boolean;
}

export type CacheKey = string;

export const TTL = {
  SHORT: 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 60 * 60 * 1000,
  VERY_LONG: 24 * 60 * 60 * 1000,
} as const;

const STORAGE_PREFIX = 'boutikplus.cache.v1::';
const memoryStore = new Map<string, { value: any; expiresAt: number }>();

interface StorageEntry<T> {
  v: T;
  e: number;
}

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getStorageKey(key: CacheKey): string {
  return `${STORAGE_PREFIX}${key}`;
}

function extractCacheKey(storageKey: string): string | null {
  if (!storageKey.startsWith(STORAGE_PREFIX)) return null;
  return storageKey.slice(STORAGE_PREFIX.length);
}

/**
 * Récupère une valeur depuis le cache.
 * Vérifie d'abord le cache mémoire (rapide), puis AsyncStorage si miss.
 * Réchauffe le cache mémoire en cas de hit sur AsyncStorage.
 * Retourne null si la clé est absente ou expirée.
 */
export async function getCache<T = unknown>(key: CacheKey): Promise<T | null> {
  try {
    const memoryEntry = memoryStore.get(key);
    const now = Date.now();

    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) {
        return memoryEntry.value as T;
      }
      memoryStore.delete(key);
    }

    const storageKey = getStorageKey(key);
    const raw = await AsyncStorage.getItem(storageKey);

    if (raw == null) return null;

    let parsed: StorageEntry<T>;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      logger.warn(`cacheService.getCache: JSON corrupt for key ${key}`, { error: parseErr instanceof Error ? parseErr.message : String(parseErr) });
      try {
        await AsyncStorage.removeItem(storageKey);
      } catch { /* noop */ }
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || parsed.e == null) {
      try {
        await AsyncStorage.removeItem(storageKey);
      } catch { /* noop */ }
      return null;
    }

    if (parsed.e <= now) {
      try {
        await AsyncStorage.removeItem(storageKey);
      } catch { /* noop */ }
      return null;
    }

    memoryStore.set(key, { value: parsed.v, expiresAt: parsed.e });
    return parsed.v as T;
  } catch (err) {
    logger.warn(`cacheService.getCache error for ${key}`, { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Écrit une valeur dans le cache.
 * @param key Clé de cache
 * @param value Valeur à stocker (doit être sérialisable JSON)
 * @param opts Options : ttlMs (défaut TTL.MEDIUM), persist (défaut true)
 */
export async function setCache<T = unknown>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void> {
  try {
    const ttlMs = opts?.ttlMs ?? TTL.MEDIUM;
    const persist = opts?.persist ?? true;
    const expiresAt = Date.now() + ttlMs;

    memoryStore.set(key, { value, expiresAt });

    if (persist) {
      const storageKey = getStorageKey(key);
      const entry: StorageEntry<T> = { v: value, e: expiresAt };
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    }
  } catch (err) {
    logger.warn(`cacheService.setCache error for ${key}`, { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Supprime une entrée du cache (mémoire + AsyncStorage).
 */
export async function deleteCache(key: CacheKey): Promise<void> {
  try {
    memoryStore.delete(key);
    const storageKey = getStorageKey(key);
    await AsyncStorage.removeItem(storageKey);
  } catch (err) {
    logger.warn(`cacheService.deleteCache error for ${key}`, { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Vide le cache.
 * @param prefix Si fourni, supprime uniquement les entrées dont la clé commence par ce préfixe.
 *               Si vide/undefined, vide TOUT le cache.
 */
export async function clearCache(prefix?: string): Promise<void> {
  try {
    if (prefix) {
      for (const k of Array.from(memoryStore.keys())) {
        if (k.startsWith(prefix)) {
          memoryStore.delete(k);
        }
      }
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const toRemove: string[] = [];
        for (const sk of allKeys) {
          const ck = extractCacheKey(sk);
          if (ck && ck.startsWith(prefix)) {
            toRemove.push(sk);
          }
        }
        if (toRemove.length > 0) {
          await AsyncStorage.multiRemove(toRemove);
        }
      } catch { /* noop */ }
    } else {
      memoryStore.clear();
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
      } catch { /* noop */ }
    }
  } catch (err) {
    logger.warn(`cacheService.clearCache error`, { error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * Stratégie get-or-fetch avec support stale-while-revalidate.
 * - Si cache valide : retourne immédiatement
 * - Si stale et staleWhileRevalidate : retourne la valeur périmée, lance le fetcher en arrière-plan,
 *   appelle onRefresh avec la nouvelle valeur
 * - Si cache absent : exécute le fetcher, stocke le résultat, le retourne
 *
 * @param key Clé de cache
 * @param fetcher Fonction asynchrone qui produit la valeur en cas de miss/stale
 * @param opts CacheOptions + onRefresh callback pour SWR
 */
export async function getOrSetCache<T = unknown>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  opts?: CacheOptions & { onRefresh?: (newVal: T) => void },
): Promise<T> {
  const now = Date.now();
  const ttlMs = opts?.ttlMs ?? TTL.MEDIUM;
  const persist = opts?.persist ?? true;
  const swr = opts?.staleWhileRevalidate ?? false;
  const onRefresh = opts?.onRefresh;

  try {
    const memoryEntry = memoryStore.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > now) {
        return memoryEntry.value as T;
      }
      if (swr) {
        (async () => {
          try {
            const fresh = await fetcher();
            await setCache(key, fresh, { ttlMs, persist });
            if (onRefresh) onRefresh(fresh);
          } catch (fetchErr) {
            logger.warn(`cacheService.getOrSetCache SWR background fetch failed for ${key}`, {
              error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            });
          }
        })();
        return memoryEntry.value as T;
      }
      memoryStore.delete(key);
    }
  } catch { /* noop, fall through */ }

  try {
    const storageKey = getStorageKey(key);
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw != null) {
      try {
        const parsed = JSON.parse(raw) as StorageEntry<T>;
        if (parsed && typeof parsed === 'object' && parsed.e != null) {
          if (parsed.e > now) {
            memoryStore.set(key, { value: parsed.v, expiresAt: parsed.e });
            return parsed.v as T;
          }
          if (swr) {
            (async () => {
              try {
                const fresh = await fetcher();
                await setCache(key, fresh, { ttlMs, persist });
                if (onRefresh) onRefresh(fresh);
              } catch (fetchErr) {
                logger.warn(`cacheService.getOrSetCache SWR background fetch failed for ${key}`, {
                  error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
                });
              }
            })();
            return parsed.v as T;
          }
          try {
            await AsyncStorage.removeItem(storageKey);
          } catch { /* noop */ }
        }
      } catch { /* corrupt entry, ignore */ }
    }
  } catch { /* noop, fall through */ }

  const fresh = await fetcher();
  await setCache(key, fresh, { ttlMs, persist });
  return fresh;
}

/**
 * Utilitaires de construction de clés typées pour les entités métier courantes.
 * Utilise hashString() pour compresser les filtres longs (recherche, listes de produits).
 */
export const cacheKeys = {
  product: (id: string) => `product:${id}`,
  productsList: (filterKey: string) => `products:${hashString(filterKey)}`,
  shop: (id: string) => `shop:${id}`,
  category: () => `categories:v1`,
  ai: (hash: string) => `ai:${hashString(hash)}`,
  search: (queryHash: string) => `search:${hashString(queryHash)}`,
} as const;

export { hashString };
