import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProductWithImages, Shop, VariantInfo } from '@/types/models';
import { formatFCFA } from '@/lib/format';
import { logger } from '@/lib/logger';

export interface CartLine {
  product: ProductWithImages;
  quantity: number;
  variant_info?: VariantInfo;
}

export interface CartSellerGroup {
  sellerId: string;
  shop: Shop | undefined;
  lines: CartLine[];
  subtotal: number;
}

interface CartContextValue {
  items: CartLine[];
  count: number;
  total: number;
  sellerGroups: CartSellerGroup[];
  addItem: (product: ProductWithImages, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateVariant: (productId: string, variant: VariantInfo) => void;
  clear: () => void;
  hasProduct: (productId: string) => boolean;
  formattedTotal: string;
  /** Fusionne le panier anonyme stocké localement avec le panier en cours.
   *  Appelé après login/register pour ne pas perdre les articles ajoutés en invité. */
  mergeAnonymousCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Clé de stockage pour le panier anonyme (invité non connecté).
// Utilise AsyncStorage sur natif, localStorage sur Web (simulé via AsyncStorage web).
const CART_STORAGE_KEY = '@boutikplus:anonymous_cart_v1';

/**
 * Sauvegarde atomique dans AsyncStorage, silencieuse en cas d'erreur
 * (le panier reste fonctionnel en mémoire, seule la persistance tombe).
 */
async function persist(items: CartLine[]) {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    logger.warn('[CartContext] persist failed', { error: String(e) });
  }
}

async function restore(): Promise<CartLine[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validation basique : on ne garde que les lignes valides.
    return parsed.filter(
      (l: any) =>
        l &&
        typeof l === 'object' &&
        l.product &&
        typeof l.product.id === 'string' &&
        typeof l.quantity === 'number' &&
        l.quantity > 0,
    );
  } catch (e) {
    logger.warn('[CartContext] restore failed', { error: String(e) });
    return [];
  }
}

async function wipe() {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  } catch (e) {
    logger.warn('[CartContext] wipe failed', { error: String(e) });
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 1) Au montage : recharger le panier anonyme depuis le stockage local.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await restore();
      if (!cancelled && stored.length > 0) setItems(stored);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Chaque mutation → persister. Après hydration uniquement pour éviter
  //    d'écraser le stockage par un tableau vide avant le premier chargement.
  useEffect(() => {
    if (!hydrated) return;
    persist(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, hydrated]);

  const addItem = useCallback((product: ProductWithImages, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, product.stock || 999) }
            : l,
        );
      }
      return [
        ...prev,
        { product, quantity: Math.min(quantity, product.stock || 999) },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) return prev.filter((l) => l.product.id !== productId);
        return prev.map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.min(quantity, l.product.stock || 999) }
            : l,
        );
      });
    },
    [],
  );

  const updateVariant = useCallback(
    (productId: string, variant: VariantInfo) => {
      setItems((prev) =>
        prev.map((l) =>
          l.product.id === productId ? { ...l, variant_info: variant } : l,
        ),
      );
    },
    [],
  );

  const clear = useCallback(() => {
    setItems([]);
    wipe().catch(() => {});
  }, []);

  const hasProduct = useCallback(
    (productId: string) => items.some((l) => l.product.id === productId),
    [items],
  );

  /**
   * Fusionne le panier anonyme (stocké localement) avec le panier en mémoire :
   * - Pour chaque ligne stockée, si le produit n'est pas déjà présent, on l'ajoute
   *   (quantités additionnées si doublon via addItem).
   * - Puis on efface le stockage anonyme (désormais rattaché à l'utilisateur connecté).
   */
  const mergeAnonymousCart = useCallback(async () => {
    const stored = await restore();
    if (stored.length === 0) return;
    setItems((prev) => {
      const merged = [...prev];
      for (const line of stored) {
        const idx = merged.findIndex((l) => l.product.id === line.product.id);
        if (idx >= 0) {
          const existing = merged[idx];
          merged[idx] = {
            ...existing,
            quantity: Math.min(
              existing.quantity + line.quantity,
              existing.product.stock || 999,
            ),
          };
        } else {
          merged.push(line);
        }
      }
      return merged;
    });
    await wipe();
  }, []);

  const count = items.reduce((sum, l) => sum + l.quantity, 0);
  const total = items.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  // Regroupement par vendeur (pour le paiement Mobile Money individuel)
  const sellerGroups: CartSellerGroup[] = [];
  const groupMap = new Map<string, CartSellerGroup>();
  for (const line of items) {
    const sellerId = line.product.shop?.owner_id ?? 'unknown';
    if (!groupMap.has(sellerId)) {
      const group: CartSellerGroup = {
        sellerId,
        shop: line.product.shop,
        lines: [],
        subtotal: 0,
      };
      groupMap.set(sellerId, group);
      sellerGroups.push(group);
    }
    const g = groupMap.get(sellerId)!;
    g.lines.push(line);
    g.subtotal += line.product.price * line.quantity;
  }

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        sellerGroups,
        addItem,
        removeItem,
        updateQuantity,
        updateVariant,
        clear,
        hasProduct,
        formattedTotal: formatFCFA(total),
        mergeAnonymousCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
