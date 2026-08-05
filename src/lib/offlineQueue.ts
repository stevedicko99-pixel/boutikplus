import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@boutikplus/offline_queue';
const TIMESTAMP_KEY = '@boutikplus/offline_queue_timestamp';

export interface OfflineProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: string[];
  createdAt: string;
}

/**
 * File d'attente hors-ligne : les vendeurs peuvent ajouter des produits
 * sans réseau. La synchronisation se fait automatiquement au retour du réseau.
 */
export const offlineQueue = {
  /** Ajoute un produit à la file d'attente offline */
  async add(product: Omit<OfflineProduct, 'id' | 'createdAt'>): Promise<void> {
    const queue = await this.getAll();
    const entry: OfflineProduct = {
      ...product,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    await AsyncStorage.setItem(TIMESTAMP_KEY, new Date().toISOString());
  },

  /** Récupère tous les produits en attente */
  async getAll(): Promise<OfflineProduct[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  },

  /** Renvoie le nombre de produits en attente */
  async count(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  },

  /** Supprime un produit de la file (après synchronisation réussie) */
  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((p) => p.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    if (filtered.length === 0) {
      await AsyncStorage.removeItem(TIMESTAMP_KEY);
    }
  },

  /** Vide la file après synchronisation complète */
  async flush(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    await AsyncStorage.removeItem(TIMESTAMP_KEY);
  },

  /** Ajoute un hook à appeler quand le réseau revient */
  async syncAll(
    uploadFn: (product: OfflineProduct) => Promise<void>,
  ): Promise<{ success: number; failed: number }> {
    const queue = await this.getAll();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (const product of queue) {
      uploadFn(product).then(() => {
        this.remove(product.id);
        success++;
      }).catch((err) => {
        console.error(`[OfflineQueue] Échec sync "${product.name}":`, err);
        failed++;
      });
    }

    return { success, failed };
  },
};
