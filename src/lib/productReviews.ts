import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_REVIEWS } from '@/data/demoData';
import type { Database } from '@/types/database';
import type { Product } from '@/types/models';

export type ProductReview = Database['public']['Tables']['reviews']['Row'] & {
  user?: { id: string; full_name: string; avatar_url: string | null; is_verified: boolean } | null;
  review_images?: { id: string; image_url: string }[];
  liked?: boolean;
  likes_count: number;
};

interface ReviewStats {
  total_reviews: number;
  avg_rating: number;
  stars_1: number;
  stars_2: number;
  stars_3: number;
  stars_4: number;
  stars_5: number;
}

export async function getProductReviewStats(productId: string): Promise<ReviewStats | null> {
  // Mode démo : calculer les stats depuis DEMO_REVIEWS (Supabase non configuré)
  if (!isSupabaseConfigured) {
    const reviews = DEMO_REVIEWS.filter((r) => r.product_id === productId);
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const countStars = (n: number) => reviews.filter((r) => Math.round(r.rating) === n).length;
    return {
      total_reviews: total,
      avg_rating: avg,
      stars_1: countStars(1),
      stars_2: countStars(2),
      stars_3: countStars(3),
      stars_4: countStars(4),
      stars_5: countStars(5),
    };
  }
  try {
    const { data, error } = await supabase.rpc('get_product_review_stats', { p_product_id: productId });
    if (error) {
      console.error('getProductReviewStats RPC error:', error.message);
    }
    if (data && Array.isArray(data) && data.length > 0) {
      const row = data[0] as any;
      return {
        total_reviews: Number(row.total_reviews ?? 0),
        avg_rating: Number(row.avg_rating ?? 0),
        stars_1: Number(row.stars_1 ?? 0),
        stars_2: Number(row.stars_2 ?? 0),
        stars_3: Number(row.stars_3 ?? 0),
        stars_4: Number(row.stars_4 ?? 0),
        stars_5: Number(row.stars_5 ?? 0),
      };
    }

    const { data: reviews, error: qError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);
    if (qError) {
      console.error('getProductReviewStats fallback error:', qError.message);
      return null;
    }
    const list = reviews ?? [];
    const total = list.length;
    const avg = total > 0 ? list.reduce((s, r) => s + r.rating, 0) / total : 0;
    const countStars = (n: number) => list.filter((r) => Math.round(r.rating) === n).length;
    return {
      total_reviews: total,
      avg_rating: avg,
      stars_1: countStars(1),
      stars_2: countStars(2),
      stars_3: countStars(3),
      stars_4: countStars(4),
      stars_5: countStars(5),
    };
  } catch (e) {
    console.error('getProductReviewStats error:', e);
    return null;
  }
}

export async function getProductReviews(productId: string, userId?: string | null): Promise<ProductReview[]> {
  // Mode démo : retourner les avis de démo pour ce produit
  if (!isSupabaseConfigured) {
    return DEMO_REVIEWS
      .filter((r) => r.product_id === productId)
      .map((r) => ({
        ...r,
        seller_reply: null,
        seller_replied_at: null,
        is_anonymous: false,
        user: null,
        review_images: [],
        liked: false,
        likes_count: 0,
      })) as unknown as ProductReview[];
  }
  try {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, is_verified),
        review_images(*)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (error) {
      console.error('getProductReviews error:', error.message);
      return [];
    }

    const rows = (data as any[]) ?? [];
    const reviewIds = rows.map((r) => r.id);

    let likedMap: Record<string, boolean> = {};
    if (userId && reviewIds.length > 0) {
      const { data: likes, error: lError } = await supabase
        .from('review_likes')
        .select('review_id')
        .eq('user_id', userId)
        .in('review_id', reviewIds);
      if (!lError && likes) {
        likes.forEach((l) => {
          likedMap[(l as any).review_id] = true;
        });
      }
    }

    return rows.map((row) => ({
      ...row,
      user: row.is_anonymous ? null : row.user ?? null,
      liked: userId ? Boolean(likedMap[row.id]) : false,
      likes_count: Number(row.likes_count ?? 0),
    }));
  } catch (e) {
    console.error('getProductReviews exception:', e);
    return [];
  }
}

export async function createProductReview(params: {
  productId: string;
  rating: number;
  comment?: string;
  isAnonymous?: boolean;
  imageUrls?: string[];
}): Promise<{ success: boolean; reviewId?: string; message?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { success: false, message: 'Utilisateur non connecté' };
    }

    const { data: productRow, error: pError } = await supabase
      .from('products')
      .select('shop_id')
      .eq('id', params.productId)
      .single();

    if (pError) {
      console.error('createProductReview product fetch error:', pError.message);
    }

    const shopId = (productRow as any)?.shop_id ?? null;

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userData.user.id,
        product_id: params.productId,
        shop_id: shopId,
        rating: Math.max(1, Math.min(5, params.rating)),
        comment: params.comment?.trim() || null,
        is_anonymous: Boolean(params.isAnonymous),
      })
      .select('id')
      .single();

    if (error) {
      console.error('createProductReview insert error:', error.message);
      return { success: false, message: error.message };
    }

    const reviewId = (data as any).id;

    if (params.imageUrls && params.imageUrls.length > 0) {
      const imageRows = params.imageUrls.map((url, idx) => ({
        review_id: reviewId,
        image_url: url,
        position: idx,
      }));
      const { error: imgError } = await supabase.from('review_images').insert(imageRows);
      if (imgError) {
        console.error('createProductReview images error:', imgError.message);
      }
    }

    return { success: true, reviewId };
  } catch (e: any) {
    console.error('createProductReview exception:', e);
    return { success: false, message: e?.message ?? 'Erreur inconnue' };
  }
}

export async function toggleReviewLike(reviewId: string): Promise<{ liked: boolean } | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const userId = userData.user.id;

    const { data: existing, error: chkError } = await supabase
      .from('review_likes')
      .select('review_id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .maybeSingle();

    if (chkError) {
      console.error('toggleReviewLike check error:', chkError.message);
      return null;
    }

    if (existing) {
      const { error: delError } = await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);
      if (delError) {
        console.error('toggleReviewLike delete error:', delError.message);
        return null;
      }
      return { liked: false };
    } else {
      const { error: insError } = await supabase
        .from('review_likes')
        .insert({ review_id: reviewId, user_id: userId });
      if (insError) {
        console.error('toggleReviewLike insert error:', insError.message);
        return null;
      }
      return { liked: true };
    }
  } catch (e) {
    console.error('toggleReviewLike exception:', e);
    return null;
  }
}

export async function replyToReview(reviewId: string, reply: string): Promise<boolean> {
  try {
    const trimmed = reply.trim();
    if (!trimmed) return false;

    const { error } = await supabase
      .from('reviews')
      .update({
        seller_reply: trimmed,
        seller_replied_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      console.error('replyToReview error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('replyToReview exception:', e);
    return false;
  }
}
