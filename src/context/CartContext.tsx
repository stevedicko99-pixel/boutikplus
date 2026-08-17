import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
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
  shopId: string;
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
  // ─── Sélection d'articles ───
  /** true = mode "tout sélectionné" (par défaut). */
  allSelected: boolean;
  /** Identifiants des produits cochés pour paiement (seulement si allSelected=false). */
  selectedIds: Set<string>;
  /** Inverser la sélection d'un article. */
  toggleSelected: (productId: string) => void;
  /** Tout sélectionner / Tout désélectionner. */
  setAllSelected: (selected: boolean) => void;
  /** true si le panier contient au moins un article sélectionné. */
  hasSelection: boolean;
  /** Nombre de lignes articles sélectionnées. */
  selectedLineCount: number;
  /** Groupes vendeurs FILTRÉS : ne contient que les lignes sélectionnées. */
  selectedSellerGroups: CartSellerGroup[];
  /** Total uniquement pour les articles sélectionnés. */
  selectedTotal: number;
  // ─── Option livraison ───
  /** true = livraison demandée (par défaut: true). */
  includeDelivery: boolean;
  /** Basculer l'option livraison. */
  setIncludeDelivery: (v: boolean) => void;
  /** Retire du panier uniquement les articles qui viennent d'être payés
   *  (ceux présents dans selectedIds à la fin du tunnel de paiement). */
  clearSelectedOnly: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Clé de stockage pour le panier anonyme (invité non connecté).
// Utilise AsyncStorage sur natif, localStorage sur Web (simulé via AsyncStorage web).
export const CART_STORAGE_KEY = '@boutikplus:anonymous_cart_v1';
const CART_STORAGE_VERSION = 2;

export interface PersistedCartState {
  version: typeof CART_STORAGE_VERSION;
  items: CartLine[];
  selectedIds: string[];
  allSelected: boolean;
  includeDelivery: boolean;
}

function validLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (line: any) =>
      line &&
      typeof line === 'object' &&
      line.product &&
      typeof line.product.id === 'string' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0,
  );
}

export function parsePersistedCart(raw: string | null): PersistedCartState {
  const defaults: PersistedCartState = {
    version: CART_STORAGE_VERSION,
    items: [],
    selectedIds: [],
    allSelected: true,
    includeDelivery: true,
  };
  if (!raw) return defaults;

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return { ...defaults, items: validLines(parsed) };
  if (!parsed || typeof parsed !== 'object') return defaults;

  const items = validLines(parsed.items);
  const itemIds = new Set(items.map((line) => line.product.id));
  const allSelected = typeof parsed.allSelected === 'boolean' ? parsed.allSelected : true;
  const selectedIds: string[] = allSelected || !Array.isArray(parsed.selectedIds)
    ? []
    : [...new Set<string>(parsed.selectedIds.filter((id: unknown): id is string => typeof id === 'string' && itemIds.has(id)))];

  return {
    version: CART_STORAGE_VERSION,
    items,
    selectedIds,
    allSelected,
    includeDelivery: typeof parsed.includeDelivery === 'boolean' ? parsed.includeDelivery : true,
  };
}

async function persist(state: Omit<PersistedCartState, 'version'>) {
  try {
    await AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: CART_STORAGE_VERSION, ...state }),
    );
  } catch (e) {
    logger.warn('[CartContext] persist failed', { error: String(e) });
  }
}

async function restore(): Promise<PersistedCartState> {
  try {
    return parsePersistedCart(await AsyncStorage.getItem(CART_STORAGE_KEY));
  } catch (e) {
    logger.warn('[CartContext] restore failed', { error: String(e) });
    return parsePersistedCart(null);
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
  // ─── Sélection d'articles (approche explicite sans convention ambigue) ───
  // true = TOUS sélectionnés (par défaut au premier chargement du panier)
  // false = le Set selectedIds définit quels articles sont cochés
  const [allSelected, setAllSelectedState] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeDelivery, setIncludeDeliveryState] = useState(true);

  // 1) Au montage : recharger le panier anonyme depuis le stockage local.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await restore();
      if (!cancelled) {
        setItems(stored.items);
        setAllSelectedState(stored.allSelected);
        setSelectedIds(new Set(stored.selectedIds));
        setIncludeDeliveryState(stored.includeDelivery);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Chaque mutation → persister. Après hydration uniquement pour éviter
  //    d'écraser le stockage par un tableau vide avant le premier chargement.
  useEffect(() => {
    if (!hydrated) return;
    persist({
      items,
      selectedIds: allSelected ? [] : [...selectedIds],
      allSelected,
      includeDelivery,
    });
  }, [items, selectedIds, allSelected, includeDelivery, hydrated]);

  useEffect(() => {
    if (!hydrated || allSelected) return;
    const itemIds = new Set(items.map((line) => line.product.id));
    setSelectedIds((current) => {
      const reconciled = new Set([...current].filter((id) => itemIds.has(id)));
      if (reconciled.size === current.size) return current;
      return reconciled;
    });
  }, [items, allSelected, hydrated]);

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
    setAllSelectedState(true);
    setSelectedIds(new Set());
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
    if (stored.items.length === 0) return;
    setItems((prev) => {
      const merged = [...prev];
      for (const line of stored.items) {
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

  // ─── Sélection d'articles ────────────────────────────────────────────────
  const isSelected = (productId: string) =>
    allSelected ? true : selectedIds.has(productId);

  const toggleSelected = useCallback((productId: string) => {
    if (allSelected) {
      // On passe en mode manuel : on commence avec tous les articles SAUF celui qu'on décoche
      const newSet = new Set<string>();
      items.forEach((l) => {
        if (l.product.id !== productId) newSet.add(l.product.id);
      });
      setAllSelectedState(false);
      setSelectedIds(newSet);
    } else {
      const next = new Set(selectedIds);
      if (next.has(productId)) {
        next.delete(productId);
        // Si plus rien après suppression, désactiver allSelected = false mais 0 sélectionné = 0
      } else {
        next.add(productId);
        // Si après ajout TOUS les items sont présents, repasser en mode allSelected=true
        if (next.size === items.length) {
          setAllSelectedState(true);
          setSelectedIds(new Set());
          return;
        }
      }
      setSelectedIds(next);
    }
  }, [allSelected, selectedIds, items]);

  const setAllSelected = useCallback((selected: boolean) => {
    setAllSelectedState(selected);
    setSelectedIds(new Set());
  }, []);

  const count = items.reduce((sum, l) => sum + l.quantity, 0);
  const total = items.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  // Regroupement par boutique (pour le paiement Mobile Money individuel)
  const sellerGroups: CartSellerGroup[] = [];
  const groupMap = new Map<string, CartSellerGroup>();
  for (const line of items) {
    const shopId = line.product.shop_id;
    const sellerId = line.product.shop?.owner_id ?? 'unknown';
    if (!groupMap.has(shopId)) {
      const group: CartSellerGroup = {
        sellerId,
        shopId,
        shop: line.product.shop,
        lines: [],
        subtotal: 0,
      };
      groupMap.set(shopId, group);
      sellerGroups.push(group);
    }
    const g = groupMap.get(shopId)!;
    g.lines.push(line);
    g.subtotal += line.product.price * line.quantity;
  }

  // ─── FILTRÉS (sélectionnés seulement) ────────────────────────────────────
  const filteredLines = items.filter((l) => isSelected(l.product.id));
  const selectedTotal = filteredLines.reduce(
    (sum, l) => sum + l.product.price * l.quantity,
    0,
  );
  const selectedLineCount = filteredLines.length;
  const hasSelection = selectedLineCount > 0;
  const selectedSellerGroups: CartSellerGroup[] = [];
  const selMap = new Map<string, CartSellerGroup>();
  for (const line of filteredLines) {
    const shopId = line.product.shop_id;
    const sellerId = line.product.shop?.owner_id ?? 'unknown';
    if (!selMap.has(shopId)) {
      const group: CartSellerGroup = {
        sellerId,
        shopId,
        shop: line.product.shop,
        lines: [],
        subtotal: 0,
      };
      selMap.set(shopId, group);
      selectedSellerGroups.push(group);
    }
    const g = selMap.get(shopId)!;
    g.lines.push(line);
    g.subtotal += line.product.price * line.quantity;
  }

  // ─── Livraison ────────────────────────────────────────────────────────────
  const setIncludeDelivery = useCallback((v: boolean) => setIncludeDeliveryState(v), []);
  const clearSelectedOnly = useCallback(() => {
    setItems((prev) => prev.filter((l) => !isSelected(l.product.id)));
    // Réinitialiser la sélection à "tout sélectionné"
    setAllSelectedState(true);
    setSelectedIds(new Set());
  }, [items, allSelected, selectedIds]);

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
        allSelected,
        selectedIds,
        toggleSelected,
        setAllSelected,
        hasSelection,
        selectedLineCount,
        selectedSellerGroups,
        selectedTotal,
        includeDelivery,
        setIncludeDelivery,
        clearSelectedOnly,
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
