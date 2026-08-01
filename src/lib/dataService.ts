// Service de données unifié — Boutikplus
// Bascule automatiquement entre Supabase (si configuré) et les données de démo.

import { supabase, isSupabaseConfigured } from './supabase';
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
  UserRole,
  ProductStatus,
} from '@/types/models';

const useDemo = !isSupabaseConfigured;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

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
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) console.error('getCategories:', error.message);
  return (data as Category[]) ?? [];
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
}

export async function getShop(shopId: string): Promise<Shop | null> {
  if (useDemo) {
    await delay(150);
    return DEMO_SHOPS.find((s) => s.id === shopId) ?? null;
  }
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();
  if (error) console.error('getShop:', error.message);
  return data as Shop | null;
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
    .single();
  if (error) console.error('getShopByOwner:', error.message);
  return data as Shop | null;
}

// ---------- Produits ----------
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
    return result.slice(offset, offset + limit);
  }
  let query = supabase
    .from('products')
    .select('*, shop:shops(*), images:product_images(*), videos:product_videos(*)')
    .eq('status', 'available')
    .order('created_at', { ascending: false });
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);
  const { data, error } = await query;
  if (error) console.error('getProducts:', error.message);
  return (data as ProductWithImages[]) ?? [];
}

export async function getProduct(
  productId: string,
): Promise<ProductWithImages | null> {
  if (useDemo) {
    await delay(150);
    return DEMO_PRODUCTS.find((p) => p.id === productId) ?? null;
  }
  const { data, error } = await supabase
    .from('products')
    .select('*, shop:shops(*), images:product_images(*), videos:product_videos(*)')
    .eq('id', productId)
    .single();
  if (error) console.error('getProduct:', error.message);
  return data as ProductWithImages | null;
}

export async function getProductsByShop(
  shopId: string,
): Promise<ProductWithImages[]> {
  if (useDemo) {
    await delay(200);
    return DEMO_PRODUCTS.filter((p) => p.shop_id === shopId);
  }
  const { data, error } = await supabase
    .from('products')
    .select('*, images:product_images(*), videos:product_videos(*)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) console.error('getProductsByShop:', error.message);
  return (data as ProductWithImages[]) ?? [];
}

// ---------- Avis ----------
export async function getShopReviews(shopId: string): Promise<Review[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_REVIEWS.filter((r) => r.shop_id === shopId);
  }
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user:profiles(id, full_name, avatar_url)')
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
  const { data, error } = await supabase
    .from('promotions')
    .select('*, shop:shops(*), product:products(*)')
    .eq('status', 'active')
    .lte('start_date', new Date().toISOString())
    .gte('end_date', new Date().toISOString());
  if (error) console.error('getActivePromotions:', error.message);
  return (data as Promotion[]) ?? [];
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
    .select('*, items:order_items(*, product:products(*)), payment:payments(*), shop:shops(*)')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false });
  if (error) console.error('getBuyerOrders:', error.message);
  return (data as any[]) ?? [];
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
  items: { product_id: string; quantity: number; unit_price: number }[];
  totalAmount: number;
  addressId: string | null;
  note?: string | null;
}): Promise<{ orderId: string | null; error: string | null }> {
  if (useDemo) {
    await delay(300);
    const id = `order-demo-${Date.now()}`;
    return { orderId: id, error: null };
  }
  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: params.buyerId,
      seller_id: params.sellerId,
      total_amount: params.totalAmount,
      delivery_address_id: params.addressId,
      note: params.note ?? null,
      status: 'pending_payment',
    })
    .select('id')
    .single();
  if (error) return { orderId: null, error: error.message };
  const orderId = data.id;
  const orderItems = params.items.map((it) => ({
    order_id: orderId,
    product_id: it.product_id,
    quantity: it.quantity,
    unit_price: it.unit_price,
  }));
  await supabase.from('order_items').insert(orderItems);
  return { orderId, error: null };
}

export async function uploadPaymentProof(
  orderId: string,
  amount: number,
  operator: PaymentOperatorId,
  proofImageUrl: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error } = await supabase.from('payments').insert({
    order_id: orderId,
    amount,
    operator,
    proof_image_url: proofImageUrl,
    status: 'pending',
  });
  if (error) return { error: error.message };
  await supabase
    .from('orders')
    .update({ status: 'proof_uploaded' })
    .eq('id', orderId);
  return { error: null };
}

export async function validatePayment(
  orderId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error: payErr } = await supabase
    .from('payments')
    .update({ status: 'validated', validated_at: new Date().toISOString() })
    .eq('order_id', orderId);
  if (payErr) return { error: payErr.message };
  const { error: ordErr } = await supabase
    .from('orders')
    .update({ status: 'payment_validated' })
    .eq('id', orderId);
  return { error: ordErr?.message ?? null };
}

export async function rejectPayment(
  orderId: string,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
  }
  const { error } = await supabase
    .from('payments')
    .update({ status: 'rejected' })
    .eq('order_id', orderId);
  if (error) return { error: error.message };
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
  return { error: null };
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
  return (data as Conversation[]) ?? [];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (useDemo) {
    await delay(150);
    return DEMO_MESSAGES.filter((m) => m.conversation_id === conversationId);
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
  content: string,
  imageUrl?: string | null,
): Promise<Message | null> {
  if (useDemo) {
    await delay(100);
    return {
      id: `m-demo-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_url: imageUrl ?? null,
      created_at: new Date().toISOString(),
      read: false,
    };
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      image_url: imageUrl ?? null,
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
  if (useDemo) return DEMO_CONVERSATIONS[0]?.id ?? 'conv-1';
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
export async function createProduct(params: {
  shopId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  stock: number;
  imageUrls: string[];
}): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(300);
    return { error: null };
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
  if (error) return { error: error.message };
  if (params.imageUrls.length) {
    const imgs = params.imageUrls.map((url, i) => ({
      product_id: data.id,
      image_url: url,
      position: i,
    }));
    await supabase.from('product_images').insert(imgs);
  }
  return { error: null };
}

export async function updateProduct(
  productId: string,
  params: Partial<{
    name: string;
    description: string;
    price: number;
    category_id: string;
    stock: number;
    status: ProductStatus;
  }>,
): Promise<{ error: string | null }> {
  if (useDemo) {
    await delay(200);
    return { error: null };
  }
  const { error } = await supabase
    .from('products')
    .update(params)
    .eq('id', productId);
  return { error: error?.message ?? null };
}

export async function deleteProduct(productId: string): Promise<void> {
  if (useDemo) return;
  await supabase.from('product_videos').delete().eq('product_id', productId);
  await supabase.from('product_images').delete().eq('product_id', productId);
  await supabase.from('products').delete().eq('id', productId);
}

export async function createShop(params: {
  ownerId: string;
  name: string;
  description: string;
  categoryId: string;
  city: string;
  orangeMoneyNumber?: string;
  moovMoneyNumber?: string;
  logoUrl?: string | null;
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
      logo_url: params.logoUrl ?? null,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) return { shopId: null, error: error.message };
  return { shopId: data.id, error: null };
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
export async function getPendingShops(): Promise<Shop[]> {
  if (useDemo) {
    await delay(200);
    return DEMO_SHOPS.slice(0, 2);
  }
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('getPendingShops:', error.message);
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

export { isSupabaseConfigured, useDemo as isDemoMode };
