export type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

export class SimpleCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private ttl: number; // ms

  constructor(ttl: number = 10_000) {
    this.ttl = ttl;
  }

  set(key: K, value: V): void {
    this.store.set(key, { value, timestamp: Date.now() });
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  clear(): void {
    this.store.clear();
  }
}