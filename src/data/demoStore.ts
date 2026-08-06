// Store de démonstration mutable — Boutikplus
//
// Les constantes de `demoData` sont immuables : toute écriture (créer, modifier,
// supprimer) restait sans effet en mode démo, ce qui donnait l'impression que
// l'app ne fonctionnait pas. Ce store garde des copies modifiables en mémoire
// pour la durée de la session, afin que les écrans reflètent les actions
// réellement effectuées.

import {
  DEMO_SHOPS,
  DEMO_PRODUCTS,
  DEMO_ORDERS,
  DEMO_ADDRESSES,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_PROMOTIONS,
} from './demoData';
import type {
  Conversation,
  DeliveryAddress,
  Message,
  Order,
  OrderItem,
  Payment,
  Product,
  ProductWithImages,
  Promotion,
  Shop,
} from '@/types/models';

export type DemoOrder = Order & {
  items: OrderItem[];
  payment?: Payment;
  shop?: Shop;
};

interface DemoStore {
  shops: Shop[];
  products: ProductWithImages[];
  orders: DemoOrder[];
  addresses: DeliveryAddress[];
  conversations: Conversation[];
  messages: Message[];
  promotions: Promotion[];
}

export const demoStore: DemoStore = {
  shops: DEMO_SHOPS.map((s) => ({ ...s })),
  products: DEMO_PRODUCTS.map((p) => ({ ...p })),
  orders: DEMO_ORDERS.map((o) => ({ ...o, items: [...o.items] })),
  addresses: DEMO_ADDRESSES.map((a) => ({ ...a })),
  conversations: DEMO_CONVERSATIONS.map((c) => ({ ...c })),
  messages: DEMO_MESSAGES.map((m) => ({ ...m })),
  promotions: DEMO_PROMOTIONS.map((p) => ({ ...p })),
};

export function demoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function demoUpdateProduct(
  productId: string,
  changes: Partial<Product>,
): boolean {
  const index = demoStore.products.findIndex((p) => p.id === productId);
  if (index < 0) return false;
  demoStore.products[index] = { ...demoStore.products[index], ...changes };
  return true;
}

export function demoDeleteProduct(productId: string): boolean {
  const before = demoStore.products.length;
  demoStore.products = demoStore.products.filter((p) => p.id !== productId);
  return demoStore.products.length < before;
}

export function demoUpdateShop(shopId: string, changes: Partial<Shop>): boolean {
  const index = demoStore.shops.findIndex((s) => s.id === shopId);
  if (index < 0) return false;
  demoStore.shops[index] = { ...demoStore.shops[index], ...changes };
  return true;
}

export function demoDeleteShop(shopId: string): boolean {
  const before = demoStore.shops.length;
  demoStore.shops = demoStore.shops.filter((s) => s.id !== shopId);
  demoStore.products = demoStore.products.filter((p) => p.shop_id !== shopId);
  return demoStore.shops.length < before;
}
