// Types de domaine — Boutikplus
// Multi-rôles : un utilisateur peut cumuler plusieurs casquettes
// (acheteur + vendeur + livreur). Admin et super_admin restent des rôles de confiance.
export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';

export type ShopStatus = 'active' | 'paused' | 'pending' | 'rejected';

export type ProductStatus = 'available' | 'out_of_stock';

// Flux de commande Mobile Money manuel
export type OrderStatus =
  | 'pending_payment' // En attente de paiement
  | 'proof_uploaded' // Preuve envoyée, en attente de validation
  | 'payment_validated' // Paiement confirmé, en préparation
  | 'in_delivery' // En livraison
  | 'delivered' // Livrée
  | 'cancelled'; // Annulée

export type PaymentOperatorId = 'orange_money' | 'moov_money' | 'coris_money' | 'wave';

export type PaymentStatus = 'pending' | 'validated' | 'rejected';

export type PromotionVisibility = 'home' | 'category';

export type PromotionStatus = 'active' | 'expired' | 'paused';

export type ReportTargetType = 'shop' | 'product';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  /** @deprecated Utiliser primary_role (ou roles[0] pour multi-rôles). Conservé pour compatibilité ascendante. */
  role: UserRole;
  /** Tableau de tous les rôles possédés par l'utilisateur (ex: ['buyer', 'seller', 'driver']). */
  roles?: UserRole[];
  /** Rôle actif / principal (celui utilisé pour la navigation et les droits). */
  primary_role?: UserRole;
  avatar_url: string | null;
  is_verified?: boolean;
  verified_at?: string | null;
  verification_method?: string | null;
  social_links?: Record<string, unknown> | null;
  bio?: string | null;
  updated_at?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

// Horaires d'ouverture d'une journée (format "HH:MM").
export interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

// Horaires d'ouverture par jour de la semaine.
// Clés ISO : lun=mon, mar=tue, mer=wed, jeu=thu, ven=fri, sam=sat, dim=sun.
export type ShopOpeningHours = {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
};

// Réseaux sociaux d'une boutique (handles ou URLs).
export interface ShopSocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  snapchat?: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  slogan: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_id: string;
  city: string;
  address: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  opening_hours: ShopOpeningHours | null;
  social_links: ShopSocialLinks | null;
  orange_money_number: string | null;
  moov_money_number: string | null;
  coris_money_number: string | null;
  wave_number: string | null;
  is_verified?: boolean;
  verified_at?: string | null;
  rejection_reason?: string | null;
  status: ShopStatus;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  stock: number;
  favorites_count: number;
  views_count: number;
  status: ProductStatus;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

// Type de vidéo produit : upload natif (fichier téléversé) ou lien externe
// (TikTok / YouTube / Snapchat — les vendeurs ont déjà leurs vidéos sociales).
export type ProductVideoType = 'upload' | 'external';

// Source d'une vidéo externe (déduite de l'URL).
export type ExternalVideoSource = 'tiktok' | 'youtube' | 'snapchat' | 'other';

export interface ProductVideo {
  id: string;
  product_id: string;
  type: ProductVideoType; // 'upload' = fichier hébergé, 'external' = lien TikTok/YouTube/Snapchat
  url: string; // URL publique (upload) ou lien externe
  source: ExternalVideoSource | null; // null pour les uploads, sinon tiktok/youtube/...
  thumbnail_url: string | null; // miniature (pour uploads : frame extraite ; pour externes : og:image idéalement)
  duration_sec: number | null; // durée en secondes (uploads uniquement)
  position: number; // ordre d'affichage dans le carrousel média
  created_at: string;
}

export interface ProductWithImages extends Product {
  shop?: Shop;
  images?: ProductImage[];
  videos?: ProductVideo[];
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: ProductWithImages;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  delivery_address_id: string | null;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: ProductWithImages;
}

export interface OrderWithItems extends Order {
  items?: OrderItem[];
  payment?: Payment;
  shop?: Shop;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  operator: PaymentOperatorId;
  proof_image_url: string | null;
  status: PaymentStatus;
  created_at: string;
  validated_at: string | null;
}

export interface DeliveryAddress {
  id: string;
  user_id: string;
  city: string;
  district: string;
  instructions: string | null;
  contact_phone: string;
  is_default: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  shop_id: string | null;
  product_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

// Type de promotion — étend le modèle existant pour supporter codes promo & offres
export type PromotionType = 'announcement' | 'special_offer' | 'discount_code';

// Statut étendu d'un code de réduction (plus précis que PromotionStatus)
export type DiscountCodeStatus = 'active' | 'expired' | 'paused' | 'exhausted';

// Source / canal d'un lien de partage (UTM-like)
export type ShareLinkSource =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'snapchat'
  | 'qr_code'
  | 'direct'
  | 'other';

// Support (type de support) d'un lien de partage
export type ShareLinkMedium =
  | 'social'
  | 'qr'
  | 'link'
  | 'flyer'
  | 'sms';

// Type d'événement de campagne (entonnoir de conversion)
export type CampaignEventType = 'view' | 'click' | 'conversion';

export interface Promotion {
  id: string;
  shop_id: string;
  product_id: string | null;
  promo_text: string;
  start_date: string;
  end_date: string;
  visibility: PromotionVisibility;
  status: PromotionStatus;
  // Champs optionnels rétro-compatibles (promotions étendues)
  promotion_type?: PromotionType;
  discount_code_id?: string | null;
  share_link_id?: string | null;
  image_url?: string | null;
  original_price?: number | null;
  discounted_price?: number | null;
  shop?: Shop;
  product?: ProductWithImages;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  shop_id: string;
  created_at: string;
  last_message?: Message;
  buyer?: Profile;
  seller?: Profile;
  shop?: Shop;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  read: boolean;
}

export interface ShopFollow {
  user_id: string;
  shop_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

// ============================================================
// Livreurs & livraisons intra-plateforme
// ============================================================

// Statut d'une demande de livraison
export type DeliveryStatus =
  | 'pending' // En attente d'acceptation par un livreur
  | 'accepted' // Livreur assigné, en route vers l'enlèvement
  | 'in_progress' // Colis récupéré, en livraison
  | 'delivered' // Livrée
  | 'cancelled' // Annulée
  | 'refunded'; // Remboursée

// Type de véhicule du livreur
export type VehicleType = 'moto' | 'velo' | 'voiture' | 'tricycle' | 'camion';

// Profil livreur (1:1 avec profiles — un vendeur peut aussi être livreur)
export interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  city: string;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  base_rate: number; // tarif de base en FCFA
  per_km_rate: number; // tarif par km en FCFA
  max_weight: number; // poids max en kg
  orange_money_number: string | null;
  moov_money_number: string | null;
  coris_money_number?: string | null;
  wave_number?: string | null;
  current_lat: number | null;
  current_lng: number | null;
  license_number: string | null;
  created_at: string;
  profile?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'>;
}

// Demande de livraison créée par un vendeur
export interface DeliveryRequest {
  id: string;
  seller_id: string;
  driver_id: string | null;
  pickup_address: string;
  pickup_city: string;
  destination_address: string;
  destination_city: string;
  package_weight: number; // kg
  package_length: number; // cm
  package_width: number; // cm
  package_height: number; // cm
  preferred_date: string; // ISO date
  preferred_time: string; // créneau "08:00 - 10:00"
  description: string | null;
  price: number; // montant total en FCFA (devient le prix fixé par le livreur à l'acceptation)
  distance_km: number;
  status: DeliveryStatus;
  cancellation_reason: string | null;
  /** Prix proposé par le livreur à l'acceptation (null tant qu'il n'a pas fait son offre). */
  driver_offer_price?: number | null;
  /** Qui a fixé le prix final : 'seller' (estimation initiale) | 'driver' (livreur a fixé son tarif). */
  price_set_by?: 'seller' | 'driver';
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
  driver?: DriverProfile & { profile?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'> };
  seller?: Pick<Profile, 'id' | 'full_name' | 'phone' | 'avatar_url' | 'city'>;
  payment?: DeliveryPayment;
}

// Paiement Mobile Money d'une livraison (table séparée de payments)
export interface DeliveryPayment {
  id: string;
  delivery_id: string;
  amount: number;
  operator: PaymentOperatorId;
  proof_image_url: string | null;
  status: PaymentStatus;
  created_at: string;
  validated_at: string | null;
}

// Avis sur une livraison / un livreur
export interface DeliveryReview {
  id: string;
  delivery_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

// ============================================================
// Promotion de boutique — liens de partage, codes promo, analytics
// ============================================================

// Lien de partage traçable (unique par vendeur, durable, avec paramètres UTM)
export interface ShareLink {
  id: string;
  shop_id: string;
  owner_id: string;
  slug: string; // identifiant court unique -> /s/{slug}
  label: string | null; // libellé libre du vendeur ("Campagne Ramadan")
  source: ShareLinkSource; // canal d'origine
  medium: ShareLinkMedium; // type de support
  campaign: string | null; // nom de campagne optionnel
  target_url: string; // URL complète construite (avec params de suivi)
  is_active: boolean;
  created_at: string;
  // Agrégats pré-calculés (mis à jour par le service de tracking)
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  revenue_total: number;
}

// Code de réduction (pourcentage ou montant fixe)
export interface DiscountCode {
  id: string;
  shop_id: string;
  code: string; // ex: WAX20 — unique par boutique
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // % (1-100) ou montant FCFA
  min_order_amount: number; // montant minimum du panier pour activer le code
  max_uses: number; // 0 = illimité
  uses_count: number;
  expires_at: string; // ISO datetime
  status: DiscountCodeStatus;
  created_at: string;
}

// Événement de campagne (vue / clic / conversion) — entonnoir de mesure
export interface CampaignEvent {
  id: string;
  shop_id: string;
  share_link_id: string | null;
  promotion_id: string | null;
  discount_code_id: string | null;
  event_type: CampaignEventType;
  buyer_id: string | null; // null = visiteur anonyme (tracking web)
  amount: number | null; // montant FCFA (uniquement pour les conversions)
  order_id: string | null;
  city: string | null;
  source: ShareLinkSource | null;
  medium: ShareLinkMedium | null;
  created_at: string;
}

// Synthèse agrégée des performances d'une campagne / boutique
export interface CampaignAnalyticsSummary {
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number; // conversions / clicks (0-1)
  click_through_rate: number; // clicks / views (0-1)
  total_revenue: number;
  by_medium: {
    medium: ShareLinkMedium;
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
  }[];
  timeseries: {
    date: string; // YYYY-MM-DD
    views: number;
    clicks: number;
    conversions: number;
  }[];
}

// Comparaison entre campagnes / liens (pour le tableau de bord)
export interface CampaignComparison {
  id: string;
  label: string;
  type: 'share_link' | 'discount_code' | 'promotion';
  views: number;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
}

// Résultat de validation d'un code promo au checkout
export interface DiscountValidationResult {
  valid: boolean;
  discount_amount: number; // montant de la réduction en FCFA
  new_total: number; // nouveau total après réduction
  error: string | null;
  discount_code?: DiscountCode;
}
