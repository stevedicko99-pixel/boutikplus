import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getFavoriteProductIds,
  toggleFavoriteRpc,
  getWishlist,
} from '@/lib/favorites';
import type { ProductWithImages } from '@/types/models';
import { useAuth } from './AuthContext';

interface FavoriteContextValue {
  favoriteIds: Set<string>;
  wishlist: ProductWithImages[];
  loadingWishlist: boolean;
  loadingIds: boolean;
  isFav: (id: string) => boolean;
  toggleFavorite: (
    productId: string,
  ) => Promise<{ added?: boolean } | null>;
  refreshWishlist: () => Promise<void>;
  refreshFavoriteIds: () => Promise<void>;
}

const FavoriteContext = createContext<FavoriteContextValue | undefined>(
  undefined,
);

export function FavoriteProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [wishlist, setWishlist] = useState<ProductWithImages[]>([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [loadingWishlist, setLoadingWishlist] = useState(true);

  const refreshFavoriteIds = useCallback(async () => {
    if (!profile?.id) {
      setFavoriteIds(new Set());
      setLoadingIds(false);
      return;
    }
    setLoadingIds(true);
    const ids = await getFavoriteProductIds(profile.id);
    setFavoriteIds(ids);
    setLoadingIds(false);
  }, [profile?.id]);

  const refreshWishlist = useCallback(async () => {
    if (!profile?.id) {
      setWishlist([]);
      setLoadingWishlist(false);
      return;
    }
    setLoadingWishlist(true);
    const items = await getWishlist(profile.id);
    setWishlist(items);
    setLoadingWishlist(false);
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      refreshFavoriteIds();
      refreshWishlist();
    } else {
      setFavoriteIds(new Set());
      setWishlist([]);
      setLoadingIds(false);
      setLoadingWishlist(false);
    }
  }, [profile?.id, refreshFavoriteIds, refreshWishlist]);

  const isFav = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: string): Promise<{ added?: boolean } | null> => {
      const result = await toggleFavoriteRpc(productId);
      if (result) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (result.added) next.add(productId);
          else next.delete(productId);
          return next;
        });
        // Rafraîchir la wishlist en arrière-plan pour garder la liste à jour
        refreshWishlist();
      }
      return result;
    },
    [refreshWishlist],
  );

  return (
    <FavoriteContext.Provider
      value={{
        favoriteIds,
        wishlist,
        loadingWishlist,
        loadingIds,
        isFav,
        toggleFavorite,
        refreshWishlist,
        refreshFavoriteIds,
      }}
    >
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorites(): FavoriteContextValue {
  const ctx = useContext(FavoriteContext);
  if (!ctx)
    throw new Error('useFavorites must be used within FavoriteProvider');
  return ctx;
}
