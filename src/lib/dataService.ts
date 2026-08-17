// Service de données unifié — Boutikplus
// Bascule automatiquement entre Supabase (si configuré) et les données de démo.

import { supabase, isSupabaseConfigured } from './supabase';
import { getOrSetCache, TTL, cacheKeys } from './cacheService';
import {
  DEMO_CATEGORIES,
  DEMO_SHOPS,
  DEMO_PRODUCTS,
  DEMO_REVIEWS,
  DEMO_PROMOTIONS,
  DEMO_ORDERS,
  DEMO_ADDRESSES,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
} from '@/data/demoData';
import type {
  Category,
  Shop,
  ProductWithImages,
  Product,
  Review,
  Promotion,
  Order,
  OrderItem,
  Payment,
  DeliveryAddress,
  Conversation,
  Message,
  OrderStatus,
  PaymentOperatorId,
  PaymentStatus,
  UserRole,
  ProductStatus,
} from '@/types/models';
import type { Json } from '@/types/database';

const useDemo = !isSupabaseConfigured;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Stock de messages en mémoire pour la démo.
// Au lieu d'être éphémères (perdus à chaque écran), les messages envoyés en mode
// démo sont conservés ici et fusionnés avec DEMO_MESSAGES dans getMessages().
// Cela permet au "Contacter le vendeur" d'afficher immédiatement le message
// d'approche du produit dans le chat.
const demoMessageStore = new Map<string, Message[]>();

export interface ProductFilters {
  query?: string;
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

// ---------- Catégories ----------
export async function getCategories(): Promise<Category[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_CATEGORIES;
  }
  return getOrSetCache<Category[]>(
    cacheKeys.category(),
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) console.error('getCategories:', error.message);
      return (data as Category[]) ?? [];
    },
    { ttlMs: TTL.LONG },
  );
}

// ---------- Boutiques ----------
export async function getShops(filters?: {
  query?: string;
  categoryId?: string;
  city?: string;
  limit?: number;
}): Promise<Shop[]> {
  if (useDemo) {
    await delay(200);
    let result = [...DEMO_SHOPS];
    if (filters?.categoryId)
      result = result.filter((s) => s.category_id === filters.categoryId);
    if (filters?.city) result = result.filter((s) => s.city === filters.city);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q),
      );
    }
    return filters?.limit ? result.slice(0, filters.limit) : result;
  }
  const cacheKey = `shops:${JSON.stringify(filters ?? {})}`;
  return getOrSetCache<Shop[]>(
    cacheKey,
    async () => {
      let query = supabase
        .from('shops')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters?.city) query = query.eq('city', filters.city);
      if (filters?.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (error) console.error('getShops:', error.message);
      return (data as Shop[]) ?? [];
    },
    { ttlMs: TTL.MEDIUM, staleWhileRevalidate: true },
  );
}

export async function getShop(shopId: string): Promise<Shop | null> {
  if (useDemo) {
    await delay(150);
    return DEMO_SHOPS.find((s) => s.id === shopId) ?? null;
  }
  return getOrSetCache<Shop | null>(
    cacheKeys.shop(shopId),
    async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();
      if (error) console.error('getShop:', error.message);
      return data as Shop | null;
    },
    { ttlMs: TTL.LONG, staleWhileRevalidate: true },
  );
}

export async function getShopByOwner(ownerId: string): Promise<Shop | null> {
  if (useDemo) {
    await delay(100);
    return DEMO_SHOPS.find((s) => s.owner_id === ownerId) ?? null;
  }
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getShopByOwner:', error.message);
  return data as Shop | null;
}

// ---------- Produits ----------
function sortProductMedia(product: ProductWithImages): ProductWithImages {
  return {
    ...product,
    images: [...(product.images ?? [])].sort((a, b) => a.position - b.position),
    videos: [...(product.videos ?? [])].sort((a, b) => a.position - b.position),
  };
}

export async function getProducts(
  filters?: ProductFilters,
): Promise<ProductWithImages[]> {
  if (useDemo) {
    await delay(250);
    let result = [...DEMO_PRODUCTS];
    if (filters?.categoryId)
      result = result.filter((p) => p.category_id === filters.categoryId);
    if (filters?.city)
      result = result.filter((p) => p.shop?.city === filters.city);
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    if (filters?.minPrice != null)
      result = result.filter((p) => p.price >= filters.minPrice!);
    if (filters?.maxPrice != null)
      result = result.filter((p) => p.price <= filters.maxPrice!);
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    return result.slice(offset, offset + limit).map(sortProductMedia);
  }
  const cacheKey = cacheKeys.productsList(JSON.stringify(filters ?? {}));
  return getOrSetCache<ProductWithImages[]>(
    cacheKey,
    async () => {
      let query = supabase
        .from('products')
        .select('*, shop:shops(*), images:product_images(*), videos:product_videos(*)')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }
      if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
      if (filters?.minPrice != null) query = query.gte('price', filters.minPrice);
      if (filters?.maxPrice != null) query = query.lte('price', filters.maxPrice);
      const offset = filters?.offset ?? 0;
      const limit = filters?.limit ?? 50;
      query = query.range(offset, offset + limit - 1);
      const { data, error } = await query;
      if (error) console.error('getProducts:', error.message);
      return ((data as ProductWithImages[]) ?? []).map(sortProductMedia);
    },
    { ttlMs: TTL.SHORT, staleWhileRevalidate: true },
  );
}

export async function getProduct(
  productId: string,
): Promise<ProductWithImages | null> {
  if (useDemo) {
    await delay(150);
    return DEMO_PRODUCTS.find((p) => p.id === productId) ?? null;
  }
  return getOrSetCache<ProductWithImages | null>(
    cacheKeys.product(productId),
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, shop:shops(*), images:product_images(*), videos:product_videos(*)')
        .eq('id', productId)
        .single();
      if (error) console.error('getProduct:', error.message);
      return data as ProductWithImages | null;
    },
    { ttlMs: TTL.MEDIUM, staleWhileRevalidate: true },
  );
}

export async function getProductsByShop(
  shopId: string,
): Promise<ProductWithImages[]> {
  if (useDemo) {
    await delay(200);
    return DEMO_PRODUCTS.filter((p) => p.shop_id === shopId);
  }
  return getOrSetCache<ProductWithImages[]>(
    `products:shop:${shopId}`,
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, shop:shops(*), images:product_images(*), videos:product_videos(*)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) console.error('getProductsByShop:', error.message);
      return ((data as ProductWithImages[]) ?? []).map(sortProductMedia);
    },
    { ttlMs: TTL.SHORT, staleWhileRevalidate: true },
  );
}

// ---------- Vues produits ----------

export async function incrementProductView(productId: string): Promise<void> {
  if (useDemo) return;
  const { error } = await supabase
    .rpc('increment_product_view', { p_product_id: productId });
  if (error) console.error('incrementProductView:', error.message);
}

export async function getProductViews(productId: string): Promise<number> {
  if (useDemo) {
    await delay(50);
    const p = DEMO_PRODUCTS.find((p) => p.id === productId);
    return p?.views_count ?? 0;
  }
  const { data, error } = await supabase
    .from('products')
    .select('views_count')
    .eq('id', productId)
    .single();
  if (error) console.error('getProductViews:', error.message);
  return (data as any)?.views_count ?? 0;
}

export async function getTopViewedProducts(shopId: string, limit = 5): Promise<{ product_id: string; product_name: string; view_count: number }[]> {
  if (useDemo) {
    await delay(100);
    return DEMO_PRODUCTS
      .filter((p) => p.shop_id === shopId)
      .sort((a, b) => b.views_count - a.views_count)
      .slice(0, limit)
      .map((p) => ({ product_id: p.id, product_name: p.name, view_count: p.views_count }));
  }
  const { data, error } = await supabase
    .rpc('get_top_viewed_products', { p_shop_id: shopId, p_limit: limit });
  if (error) console.error('getTopViewedProducts:', error.message);
  return (data as any) ?? [];
}

// ---------- Avis ----------
export async function getShopReviews(shopId: string): Promise<Review[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_REVIEWS.filter((r) => r.shop_id === shopId);
  }
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:profiles!reviews_user_id_fkey(id, full_name, avatar_url)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) console.error('getShopReviews:', error.message);
  return (data as Review[]) ?? [];
}

export async function addReview(review: {
  shop_id?: string;
  product_id?: string;
  rating: number;
  comment?: string;
}): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté' };
  const { error } = await supabase.from('reviews').insert({
    user_id: userData.user.id,
    ...review,
  });
  return { error: error?.message ?? null };
}

// ---------- Promotions ----------
export async function getActivePromotions(): Promise<Promotion[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_PROMOTIONS;
  }
  return getOrSetCache<Promotion[]>(
    'promotions:active',
    async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, shop:shops(*), product:products(*, images:product_images(*))')
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());
      if (error) console.error('getActivePromotions:', error.message);
      return (data as unknown as Promotion[]) ?? [];
    },
    { ttlMs: TTL.SHORT, staleWhileRevalidate: true },
  );
}

// ---------- Adresses ----------
export async function getAddresses(userId: string): Promise<DeliveryAddress[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_ADDRESSES.filter((a) => a.user_id === userId);
  }
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) console.error('getAddresses:', error.message);
  return (data as DeliveryAddress[]) ?? [];
}

export async function saveAddress(
  address: Omit<DeliveryAddress, 'id' | 'created_at' | 'user_id'> & {
    id?: string;
    user_id: string;
  },
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
  if (address.id) {
    const { id, ...rest } = address;
    const { error } = await supabase
      .from('delivery_addresses')
      .update(rest)
      .eq('id', id);
    return { error: error?.message ?? null };
  }
  const { id: _ignored, ...insertData } = address;
  const { error } = await supabase.from('delivery_addresses').insert(insertData);
  return { error: error?.message ?? null };
}

export async function deleteAddress(id: string): Promise<void> {
  if (useDemo) return;
  await supabase.from('delivery_addresses').delete().eq('id', id);
}

// ---------- Commandes ----------
export async function getBuyerOrders(
  buyerId: string,
): Promise<(Order & { items: OrderItem[]; payment?: Payment; shop?: Shop })[]> {
  if (useDemo) {
    await delay(200);
    return DEMO_ORDERS.filter((o) => o.buyer_id === buyerId).map((o) => ({
      ...o,
      shop: DEMO_SHOPS.find((s) => s.id === o.items[0]?.product?.shop_id),
    }));
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*, shop:shops(*))), payment:payments(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getBuyerOrders: impossible de charger les commandes acheteur:', error.message);
    return [];
  }
  return ((data as any[]) ?? []).map((order) => ({
    ...order,
    shop: order.items?.[0]?.product?.shop,
  }));
}

export async function getSellerOrders(
  sellerId: string,
): Promise<(Order & { items: OrderItem[]; payment?: Payment })[]> {
  if (useDemo) {
    await delay(200);
    return DEMO_ORDERS.filter((o) => o.seller_id === sellerId);
  }
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), payment:payments(*)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (error) console.error('getSellerOrders:', error.message);
  return (data as any[]) ?? [];
}

export async function createOrder(params: {
  buyerId: string;
  sellerId: string;
  items: { product_id: string; quantity: number; unit_price: number; variant_info?: { model?: string; color?: string } | null }[];
  totalAmount: number;
  addressId: string | null;
  note?: string | null;
  includeDelivery?: boolean;
  deliveryFee?: number;
}): Promise<{ orderId: string | null; error: string | null }> {
  if (useDemo) {
    await delay(300);
    const id = `order-demo-${Date.now()}`;
    return { orderId: id, error: null };
  }
  const { data, error } = await supabase.rpc('create_order_with_items', {
    p_seller_id: params.sellerId,
    p_total_amount: params.totalAmount,
    p_address_id: params.addressId,
    p_note: params.note ?? null,
    p_items: params.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      variant_info: item.variant_info ?? null,
    })),
  });

  return { orderId: data ?? null, error: error?.message ?? null };
}

export interface PaymentProofResult {
  payment_id: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
}

export async function getPaymentProofState(orderId: string): Promise<PaymentProofResult | null> {
  if (useDemo) return { payment_id: `payment-${orderId}`, payment_status: 'pending', order_status: 'proof_uploaded' };
  const { data } = await supabase
    .from('orders')
    .select('status, payment:payments(id,status)')
    .eq('id', orderId)
    .maybeSingle();
  const payment = Array.isArray((data as any)?.payment) ? (data as any).payment[0] : (data as any)?.payment;
  if (!data || !payment) return null;
  return { payment_id: payment.id, payment_status: payment.status, order_status: (data as any).status };
}

export async function uploadPaymentProof(
  orderId: string,
  amount: number,
  operator: PaymentOperatorId,
  proofImageUrl: string,
): Promise<{ data: PaymentProofResult | null; error: string | null; uncertain?: boolean }> {
  if (useDemo) {
    await delay(300);
    return { data: await getPaymentProofState(orderId), error: null };
  }
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase.rpc('submit_payment_proof', {
        p_order_id: orderId,
        p_amount: amount,
        p_operator: operator,
        p_proof_image_url: proofImageUrl,
      });
      if (!error) {
        const result = Array.isArray(data) ? data[0] : data;
        return { data: result as PaymentProofResult, error: null };
      }
      const transient = /network|fetch|timeout|timed out|5\d\d/i.test(error.message ?? '');
      if (!transient) return { data: null, error: error.message };
      const current = await getPaymentProofState(orderId);
      if (current) return { data: current, error: null, uncertain: true };
      if (attempt === 1) return { data: null, error: error.message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/network|fetch|timeout|timed out/i.test(message)) {
      const current = await getPaymentProofState(orderId);
      if (current) return { data: current, error: null, uncertain: true };
    }
    return { data: null, error: message };
  }
  return { data: null, error: 'Envoi de la preuve non confirmé' };
}

export async function validatePayment(
  orderId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error } = await supabase.rpc('validate_order_payment', {
    p_order_id: orderId,
  });
  return { error: error?.message ?? null };
}

export async function rejectPayment(
  orderId: string,
  reason?: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error } = await supabase.rpc('reject_order_payment', {
    p_order_id: orderId,
    p_reason: reason?.trim() || 'Preuve de paiement refusée par le vendeur',
  });
  return { error: error?.message ?? null };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  return { error: error?.message ?? null };
}

// ---------- Messagerie ----------
export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_CONVERSATIONS;
  }
  const { data, error } = await supabase
    .from('conversations')
    .select('*, shop:shops(*), buyer:profiles!buyer_id(*), seller:profiles!seller_id(*)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) console.error('getConversations:', error.message);
  return (data as unknown as Conversation[]) ?? [];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (useDemo) {
    await delay(150);
    // Fusionne les messages statiques DEMO_MESSAGES avec ceux envoyés en session
    // pour cette conversation (stockés en mémoire). L'approche "Contacter le
    // vendeur" est donc visible immédiatement dans le chat.
    const staticMsgs = DEMO_MESSAGES.filter((m) => m.conversation_id === conversationId);
    const sessionMsgs = demoMessageStore.get(conversationId) ?? [];
    return [...staticMsgs, ...sessionMsgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) console.error('getMessages:', error.message);
  return (data as Message[]) ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string | null,
  imageUrl?: string | null,
  audioUrl?: string | null,
  audioDuration?: number | null,
  videoUrl?: string | null,
  videoDuration?: number | null,
  videoThumbnail?: string | null,
): Promise<Message | null> {
  if (useDemo) {
    await delay(100);
    const msg: Message = {
      id: `m-demo-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_url: imageUrl ?? null,
      audio_url: audioUrl ?? null,
      audio_duration: audioDuration ?? null,
      video_url: videoUrl ?? null,
      video_duration: videoDuration ?? null,
      video_thumbnail: videoThumbnail ?? null,
      created_at: new Date().toISOString(),
      read: false,
    };
    // Persister le message en mémoire pour cette conversation (visible sur les
    // autres écrans de la session).
    const existing = demoMessageStore.get(conversationId) ?? [];
    demoMessageStore.set(conversationId, [...existing, msg]);
    return msg;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_url: imageUrl ?? null,
      audio_url: audioUrl ?? null,
      audio_duration: audioDuration ?? null,
      video_url: videoUrl ?? null,
      video_duration: videoDuration ?? null,
      video_thumbnail: videoThumbnail ?? null,
    })
    .select('*')
    .single();
  if (error) console.error('sendMessage:', error.message);
  return data as Message | null;
}

export async function findOrCreateConversation(
  buyerId: string,
  sellerId: string,
  shopId: string,
): Promise<string | null> {
if (useDemo) {
    // En démo, on retourne une conversation propre à chaque boutique
    // (conv-<shopId>). Ainsi "Contacter le vendeur" ouvre une discussion
    // dédiée au produit de cette boutique, avec son message d'approche.
    // On garde conv-1 pour la boutique shop-1 (rétro-compatibilité avec les
    // messages statiques de démonstration).
    if (shopId === 'shop-1') return 'conv-1';
    return `conv-${shopId}`;
  }
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .eq('shop_id', shopId)
    .single();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('conversations')
    .insert({ buyer_id: buyerId, seller_id: sellerId, shop_id: shopId })
    .select('id')
    .single();
  if (error) console.error('findOrCreateConversation:', error.message);
  return data?.id ?? null;
}

// ---------- Vendeur : produits CRUD ----------
export interface ProductImageInput {
  image_url: string;
  image_code?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
}

export async function createProduct(params: {
  shopId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  stock: number;
  imageUrls?: string[];
}): Promise<{ productId: string | null; error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { productId: `product-demo-${Date.now()}`, error: null };
  }
  const { data, error } = await supabase
    .from('products')
    .insert({
      shop_id: params.shopId,
      name: params.name,
      description: params.description,
      price: params.price,
      category_id: params.categoryId,
      stock: params.stock,
      status: params.stock > 0 ? 'available' : 'out_of_stock',
    })
    .select('id')
    .single();
  if (error) return { productId: null, error: error.message };
  if (params.imageUrls?.length) {
    const imageResult = await setProductImages(data.id, params.imageUrls.map((image_url) => ({ image_url })));
    if (imageResult.error) {
      await supabase.from('products').delete().eq('id', data.id);
      return { productId: null, error: imageResult.error };
    }
  }
  return { productId: data.id, error: null };
}

export async function setProductImages(
  productId: string,
  images: ProductImageInput[],
): Promise<{ error: string | null }> {
  if (useDemo) return { error: null };
  const imagePayload: Json = images.map((image) => ({
    image_url: image.image_url,
    image_code: image.image_code ?? null,
    storage_path: image.storage_path ?? null,
    mime_type: image.mime_type ?? null,
    size_bytes: image.size_bytes ?? null,
  }));
  const { error } = await supabase.rpc('set_product_images', {
    p_product_id: productId,
    p_images: imagePayload,
  });
  return { error: error?.message ?? null };
}

export async function deleteProductDraft(productId: string): Promise<void> {
  if (!useDemo) await supabase.from('products').delete().eq('id', productId);
}

export async function updateProduct(
  productId: string,
  params: Partial<{
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    stock: number;
    status: ProductStatus;
    image_urls: string[];
  }>,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
  let imageUrlsErr: string | null = null;
  if (params.image_urls) {
    imageUrlsErr = (await setProductImages(
      productId,
      params.image_urls.map((image_url) => ({ image_url })),
    )).error;
  }
  const payload = { ...params };
  delete payload.image_urls;
  const { error } = await supabase
    .from('products')
    .update(payload as any)
    .eq('id', productId);
  return { error: error?.message ?? imageUrlsErr ?? null };
}

export async function deleteProduct(productId: string): Promise<{ error: string | null }> {
  if (useDemo) return { error: null };
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id');
  if (error) return { error: error.message };
  if (data?.length !== 1) {
    return { error: 'Produit introuvable ou suppression non autorisée' };
  }
  return { error: null };
}

export async function createShop(params: {
  ownerId: string;
  name: string;
  description: string;
  categoryId: string;
  city: string;
  orangeMoneyNumber?: string;
  moovMoneyNumber?: string;
  corisMoneyNumber?: string;
  waveNumber?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  slogan?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  openingHours?: import('@/types/models').ShopOpeningHours | null;
  socialLinks?: import('@/types/models').ShopSocialLinks | null;
}): Promise<{ shopId: string | null; error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { shopId: `shop-demo-${Date.now()}`, error: null };
  }
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: params.ownerId,
      name: params.name,
      description: params.description,
      category_id: params.categoryId,
      city: params.city,
      orange_money_number: params.orangeMoneyNumber ?? null,
      moov_money_number: params.moovMoneyNumber ?? null,
      coris_money_number: params.corisMoneyNumber ?? null,
      wave_number: params.waveNumber ?? null,
      logo_url: params.logoUrl ?? null,
      // La colonne réelle Supabase s'appelle banner_url (pas cover_url).
      // Cohérent avec updateShop qui renomme cover_url -> banner_url.
      banner_url: params.coverUrl ?? null,
      slogan: params.slogan ?? null,
      phone_number: params.phoneNumber ?? null,
      whatsapp_number: params.whatsappNumber ?? null,
      email: params.email ?? null,
      address: params.address ?? null,
      opening_hours: (params.openingHours ?? {}) as Record<string, unknown>,
      social_links: (params.socialLinks ?? {}) as Record<string, unknown>,
    } as any)
    .select('id')
    .single();
  if (error) return { shopId: null, error: error.message };
  return { shopId: data.id, error: null };
}

export async function updateShop(shopId: string, params: {
  name?: string;
  description?: string;
  category_id?: string;
  city?: string;
  orange_money_number?: string | null;
  moov_money_number?: string | null;
  coris_money_number?: string | null;
  wave_number?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  slogan?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  address?: string | null;
  opening_hours?: import('@/types/models').ShopOpeningHours | null;
  social_links?: import('@/types/models').ShopSocialLinks | null;
}): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
// Nettoyage : on ne passe pas les champs undefined à .update()
  // Renommage cover_url -> banner_url (la colonne réelle Supabase s'appelle banner_url)
  const payload: Record<string, unknown> = {};
  (Object.keys(params) as Array<keyof typeof params>).forEach((k) => {
    if (params[k] === undefined) return;
    const col = k === 'cover_url' ? 'banner_url' : k;
    payload[col] = params[k];
  });
  const { error } = await supabase.from('shops').update(payload as any).eq('id', shopId);
  return { error: error?.message ?? null };
}

export async function createPromotion(params: {
  shopId: string;
  productId?: string | null;
  promoText: string;
  endDate: string;
  visibility?: 'home' | 'category';
}): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error } = await supabase.from('promotions').insert({
    shop_id: params.shopId,
    product_id: params.productId ?? null,
    promo_text: params.promoText,
    start_date: new Date().toISOString(),
    end_date: params.endDate,
    visibility: params.visibility ?? 'home',
    status: 'active',
  });
  return { error: error?.message ?? null };
}

// ---------- Admin ----------
export async function updateShopStatus(shopId: string, status: Shop['status']): Promise<{ error: string | null }> {
  if (useDemo) { await delay(200); return { error: null }; }
  const { error } = await supabase
    .from('shops')
    .update({ status, updated_at: new Date().toISOString() } as any)
    .eq('id', shopId);
  return { error: error?.message ?? null };
}

export async function toggleShopVerified(shopId: string, verified: boolean): Promise<{ error: string | null }> {
  if (useDemo) { await delay(200); return { error: null }; }
  const { error } = await supabase
    .from('shops')
    .update({ is_verified: verified, verified_at: verified ? new Date().toISOString() : null, updated_at: new Date().toISOString() } as any)
    .eq('id', shopId);
  return { error: error?.message ?? null };
}

export async function deleteShop(shopId: string): Promise<{ error: string | null }> {
  if (useDemo) { await delay(200); return { error: null }; }
  // Supprimer d'abord les données dépendantes
  await supabase.from('product_videos').delete().in('product_id',
    (await supabase.from('products').select('id').eq('shop_id', shopId)).data?.map(p => p.id) || []);
  await supabase.from('product_images').delete().in('product_id',
    (await supabase.from('products').select('id').eq('shop_id', shopId)).data?.map(p => p.id) || []);
  await supabase.from('products').delete().eq('shop_id', shopId);
  await supabase.from('shop_follows').delete().eq('shop_id', shopId);
  await supabase.from('promotions').delete().eq('shop_id', shopId);
  await supabase.from('share_links').delete().eq('shop_id', shopId);
  await supabase.from('discount_codes').delete().eq('shop_id', shopId);
  await supabase.from('reviews').delete().eq('shop_id', shopId);
  await supabase.from('campaign_events').delete().eq('shop_id', shopId);
  // Enfin, supprimer la boutique (CASCADE supprimera le reste)
  const { error } = await supabase.from('shops').delete().eq('id', shopId);
  return { error: error?.message ?? null };
}

export async function getAllShops(): Promise<Shop[]> {
  if (useDemo) { await delay(200); return DEMO_SHOPS; }
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('getAllShops:', error.message);
  return (data as Shop[]) ?? [];
}

export async function getReports(): Promise<any[]> {
  if (useDemo) {
    await delay(200);
    return [
      { id: 'rep1', target_type: 'product', target_id: 'p2', reason: 'Prix suspect', status: 'pending', created_at: '2026-07-25T10:00:00Z' },
    ];
  }
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('getReports:', error.message);
  return data ?? [];
}

export async function getProductCount(): Promise<number> {
  if (useDemo) {
    await delay(100);
    return DEMO_PRODUCTS.length;
  }
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('getProductCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Compte le nombre total d'utilisateurs (profiles).
 * RLS profiles_select = USING (true) → autorisé pour tout le monde.
 */
export async function getUserCount(): Promise<number> {
  if (useDemo) {
    await delay(100);
    return 0;
  }
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('getUserCount:', error.message);
    return 0;
  }
  return count ?? 0;
}

export { isSupabaseConfigured, useDemo as isDemoMode };
