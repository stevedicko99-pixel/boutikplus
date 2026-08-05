import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { ProductWithImages } from '@/types/models';

export type Favorite = Database['public']['Tables']['favorites']['Row'];

export async function getFavoriteProductIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);
  if (error) {
    console.error('getFavoriteProductIds:', error.message);
    return new Set();
  }
  return new Set(data?.map((row) => row.product_id) ?? []);
}

export async function toggleFavoriteRpc(
  productId: string,
): Promise<{ added: boolean; new_total: number } | null> {
  if (!isSupabaseConfigured) return null;

  // 1. Essayer la RPC d'abord
  const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_favorite', {
    p_product_id: productId,
  });
  if (!rpcError && rpcData) {
    return rpcData as { added: boolean; new_total: number };
  }

  // 2. Fallback : gestion manuelle si la RPC échoue
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  // Vérifier si déjà favori
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    // Supprimer
    const { error: delError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.user.id)
      .eq('product_id', productId);
    if (delError) {
      console.error('toggleFavoriteRpc delete:', delError.message);
      return null;
    }
    return { added: false, new_total: 0 };
  } else {
    // Ajouter
    const { error: insError } = await supabase
      .from('favorites')
      .insert({ user_id: user.user.id, product_id: productId });
    if (insError) {
      console.error('toggleFavoriteRpc insert:', insError.message);
      return null;
    }
    return { added: true, new_total: 1 };
  }
}

export async function getWishlist(userId: string): Promise<ProductWithImages[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      'product:products(id, shop_id, name, description, price, category_id, stock, favorites_count, status, created_at, images:product_images(*), shop:shops(id, owner_id, name, logo_url, city))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('getWishlist:', error.message);
    return [];
  }
  return (
    data
      ?.filter((row) => row.product != null)
      .map((row) => row.product as ProductWithImages) ?? []
  );
}

export async function isFavorite(
  userId: string,
  productId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) {
    console.error('isFavorite:', error.message);
    return false;
  }
  return (count ?? 0) > 0;
}
