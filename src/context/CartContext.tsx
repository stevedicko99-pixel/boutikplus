import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ProductWithImages, Shop } from '@/types/models';
import { formatFCFA } from '@/lib/format';

export interface CartLine {
  product: ProductWithImages;
  quantity: number;
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
  clear: () => void;
  hasProduct: (productId: string) => boolean;
  formattedTotal: string;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem = useCallback((product: ProductWithImages, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, product.stock) }
            : l,
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock) }];
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
            ? { ...l, quantity: Math.min(quantity, l.product.stock) }
            : l,
        );
      });
    },
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const hasProduct = useCallback(
    (productId: string) => items.some((l) => l.product.id === productId),
    [items],
  );

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
        clear,
        hasProduct,
        formattedTotal: formatFCFA(total),
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
