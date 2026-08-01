import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Définition des types de paramètres de navigation

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Search: { query?: string; categoryId?: string; city?: string } | undefined;
  ShopDetail: { shopId: string };
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: { orderId: string };
  OrderConfirmation: { orderId: string };
  ConversationList: undefined;
  Chat: { conversationId: string; shopId?: string; productId?: string };
  Orders: undefined;
  Addresses: undefined;
  Settings: undefined;
  WriteReview: { shopId?: string; productId?: string };
};

export type SellerStackParamList = {
  CreateShop: undefined;
  SellerDashboard: undefined;
  ProductManagement: undefined;
  AddEditProduct: { productId?: string };
  SellerOrders: undefined;
  SellerStats: undefined;
  Promotions: undefined;
  ShopEdit: undefined;
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  ShopValidation: undefined;
  Reports: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Seller: undefined;
  Admin: undefined;
};

// Helpers de typage pour les écrans
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type SellerStackScreenProps<T extends keyof SellerStackParamList> =
  NativeStackScreenProps<SellerStackParamList, T>;

export type AdminStackScreenProps<T extends keyof AdminStackParamList> =
  NativeStackScreenProps<AdminStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
