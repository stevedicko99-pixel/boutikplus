// Types générés pour le schéma Supabase.
// Ces types reflètent les tables définies dans supabase/schema.sql
// NOTE: `Relationships: []` est requis sur chaque table pour que le client Supabase
// (postgrest-js) reconnaisse le schéma via GenericTable/GenericSchema. Sans ce champ,
// le générique `Schema` résout à `never` et toutes les requêtes perdent leur typage.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          city: string | null;
          role: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
          /** Tableau des rôles de l'utilisateur (V4 — un user peut cumuler acheteur + vendeur + livreur). */
          roles: string[];
          /** Rôle actif après connexion (V4). Détermine le tableau de bord affiché. */
          primary_role: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
          avatar_url: string | null;
          push_token: string | null;
          is_verified: boolean;
          verified_at: string | null;
          verification_method: string | null;
          social_links: Record<string, unknown>;
          bio: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone: string;
          city?: string | null;
          role?: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
          roles?: string[];
          primary_role?: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
          avatar_url?: string | null;
          push_token?: string | null;
          is_verified?: boolean;
          verified_at?: string | null;
          verification_method?: string | null;
          social_links?: Record<string, unknown>;
          bio?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          sort_order: number;
        };
        Insert: Database['public']['Tables']['categories']['Row'];
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      shops: {
        Row: {
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
          opening_hours: import('@/types/models').ShopOpeningHours | null;
          social_links: import('@/types/models').ShopSocialLinks | null;
          orange_money_number: string | null;
          moov_money_number: string | null;
          status: 'active' | 'paused' | 'pending';
          created_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          description?: string | null;
          slogan?: string | null;
          logo_url?: string | null;
          banner_url?: string | null;
          category_id: string;
          city: string;
          address?: string | null;
          phone_number?: string | null;
          whatsapp_number?: string | null;
          email?: string | null;
          opening_hours?: import('@/types/models').ShopOpeningHours | null;
          social_links?: import('@/types/models').ShopSocialLinks | null;
          orange_money_number?: string | null;
          moov_money_number?: string | null;
          status?: 'active' | 'paused' | 'pending';
        };
        Update: Partial<Database['public']['Tables']['shops']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'shops_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shops_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          price: number;
          category_id: string;
          stock: number;
          favorites_count: number;
          views_count: number;
          status: 'available' | 'out_of_stock';
          created_at: string;
        };
        Insert: {
          shop_id: string;
          name: string;
          description?: string | null;
          price: number;
          category_id: string;
          stock: number;
          favorites_count?: number;
          views_count?: number;
          status?: 'available' | 'out_of_stock';
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'products_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Record<string, unknown> | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          title: string;
          body: string;
          data?: Record<string, unknown> | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      // Tables de la fonctionnalité de livraison (livreurs)
      driver_profiles: {
        Row: {
          id: string;
          user_id: string;
          vehicle_type: 'moto' | 'velo' | 'voiture' | 'tricycle' | 'camion';
          city: string;
          is_available: boolean;
          rating: number;
          total_deliveries: number;
          base_rate: number;
          per_km_rate: number;
          max_weight: number;
          orange_money_number: string | null;
          moov_money_number: string | null;
          current_lat: number | null;
          current_lng: number | null;
          license_number: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          vehicle_type?: 'moto' | 'velo' | 'voiture' | 'tricycle' | 'camion';
          city: string;
          is_available?: boolean;
          rating?: number;
          total_deliveries?: number;
          base_rate?: number;
          per_km_rate?: number;
          max_weight?: number;
          orange_money_number?: string | null;
          moov_money_number?: string | null;
          current_lat?: number | null;
          current_lng?: number | null;
          license_number?: string | null;
        };
        Update: Partial<Database['public']['Tables']['driver_profiles']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'driver_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_requests: {
        Row: {
          id: string;
          seller_id: string;
          driver_id: string | null;
          pickup_address: string;
          pickup_city: string;
          destination_address: string;
          destination_city: string;
          package_weight: number;
          package_length: number;
          package_width: number;
          package_height: number;
          preferred_date: string;
          preferred_time: string;
          description: string | null;
          price: number;
          distance_km: number;
          status:
            | 'pending'
            | 'accepted'
            | 'in_progress'
            | 'delivered'
            | 'cancelled'
            | 'refunded';
          cancellation_reason: string | null;
          driver_offer_price: number | null;
          price_set_by: 'seller' | 'driver';
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          seller_id: string;
          driver_id?: string | null;
          pickup_address: string;
          pickup_city: string;
          destination_address: string;
          destination_city: string;
          package_weight: number;
          package_length: number;
          package_width: number;
          package_height: number;
          preferred_date: string;
          preferred_time: string;
          description?: string | null;
          price: number;
          distance_km?: number;
          status?:
            | 'pending'
            | 'accepted'
            | 'in_progress'
            | 'delivered'
            | 'cancelled'
            | 'refunded';
          cancellation_reason?: string | null;
          driver_offer_price?: number | null;
          price_set_by?: 'seller' | 'driver';
        };
        Update: Partial<Database['public']['Tables']['delivery_requests']['Insert']> & {
          // Champs gérés durant le cycle de vie (non présents dans Insert)
          accepted_at?: string | null;
          delivered_at?: string | null;
          updated_at?: string;
          driver_offer_price?: number | null;
          price_set_by?: 'seller' | 'driver';
        };
        Relationships: [
          {
            foreignKeyName: 'delivery_requests_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_requests_driver_id_fkey';
            columns: ['driver_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_payments: {
        Row: {
          id: string;
          delivery_id: string;
          amount: number;
          operator: 'orange_money' | 'moov_money';
          proof_image_url: string | null;
          status: 'pending' | 'validated' | 'rejected';
          created_at: string;
          validated_at: string | null;
        };
        Insert: {
          delivery_id: string;
          amount: number;
          operator: 'orange_money' | 'moov_money';
          proof_image_url?: string | null;
          status?: 'pending' | 'validated' | 'rejected';
          validated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['delivery_payments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'delivery_payments_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_reviews: {
        Row: {
          id: string;
          delivery_id: string;
          reviewer_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          delivery_id: string;
          reviewer_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: Partial<Database['public']['Tables']['delivery_reviews']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'delivery_reviews_delivery_id_fkey';
            columns: ['delivery_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_requests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'delivery_reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      // Tables de la fonctionnalité de promotion de boutique
      promotions: {
        Row: {
          id: string;
          shop_id: string;
          product_id: string | null;
          promo_text: string;
          start_date: string;
          end_date: string;
          visibility: 'home' | 'category';
          status: 'active' | 'expired' | 'paused';
          promotion_type: 'announcement' | 'special_offer' | 'discount_code' | null;
          discount_code_id: string | null;
          share_link_id: string | null;
          image_url: string | null;
          original_price: number | null;
          discounted_price: number | null;
          created_at: string;
        };
        Insert: {
          shop_id: string;
          product_id?: string | null;
          promo_text: string;
          start_date?: string;
          end_date: string;
          visibility?: 'home' | 'category';
          status?: 'active' | 'expired' | 'paused';
          promotion_type?: 'announcement' | 'special_offer' | 'discount_code' | null;
          discount_code_id?: string | null;
          share_link_id?: string | null;
          image_url?: string | null;
          original_price?: number | null;
          discounted_price?: number | null;
        };
        Update: Partial<Database['public']['Tables']['promotions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'promotions_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotions_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotions_discount_code_id_fkey';
            columns: ['discount_code_id'];
            isOneToOne: false;
            referencedRelation: 'discount_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'promotions_share_link_id_fkey';
            columns: ['share_link_id'];
            isOneToOne: false;
            referencedRelation: 'share_links';
            referencedColumns: ['id'];
          },
        ];
      };
      share_links: {
        Row: {
          id: string;
          shop_id: string;
          owner_id: string;
          slug: string;
          label: string | null;
          source: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'qr_code' | 'direct' | 'other';
          medium: 'social' | 'qr' | 'link' | 'flyer' | 'sms';
          campaign: string | null;
          target_url: string;
          is_active: boolean;
          views_count: number;
          clicks_count: number;
          conversions_count: number;
          revenue_total: number;
          created_at: string;
        };
        Insert: {
          shop_id: string;
          owner_id: string;
          slug: string;
          label?: string | null;
          source?: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'qr_code' | 'direct' | 'other';
          medium?: 'social' | 'qr' | 'link' | 'flyer' | 'sms';
          campaign?: string | null;
          target_url: string;
          is_active?: boolean;
          views_count?: number;
          clicks_count?: number;
          conversions_count?: number;
          revenue_total?: number;
        };
        Update: Partial<Database['public']['Tables']['share_links']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'share_links_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'share_links_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      discount_codes: {
        Row: {
          id: string;
          shop_id: string;
          code: string;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order_amount: number;
          max_uses: number;
          uses_count: number;
          expires_at: string;
          status: 'active' | 'expired' | 'paused' | 'exhausted';
          created_at: string;
        };
        Insert: {
          shop_id: string;
          code: string;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          min_order_amount?: number;
          max_uses?: number;
          uses_count?: number;
          expires_at: string;
          status?: 'active' | 'expired' | 'paused' | 'exhausted';
        };
        Update: Partial<Database['public']['Tables']['discount_codes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'discount_codes_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
        ];
      };
      campaign_events: {
        Row: {
          id: string;
          shop_id: string;
          share_link_id: string | null;
          promotion_id: string | null;
          discount_code_id: string | null;
          event_type: 'view' | 'click' | 'conversion';
          buyer_id: string | null;
          amount: number | null;
          order_id: string | null;
          city: string | null;
          source: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'qr_code' | 'direct' | 'other' | null;
          medium: 'social' | 'qr' | 'link' | 'flyer' | 'sms' | null;
          created_at: string;
        };
        Insert: {
          shop_id: string;
          share_link_id?: string | null;
          promotion_id?: string | null;
          discount_code_id?: string | null;
          event_type: 'view' | 'click' | 'conversion';
          buyer_id?: string | null;
          amount?: number | null;
          order_id?: string | null;
          city?: string | null;
          source?: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'qr_code' | 'direct' | 'other' | null;
          medium?: 'social' | 'qr' | 'link' | 'flyer' | 'sms' | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaign_events']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'campaign_events_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_events_share_link_id_fkey';
            columns: ['share_link_id'];
            isOneToOne: false;
            referencedRelation: 'share_links';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_events_promotion_id_fkey';
            columns: ['promotion_id'];
            isOneToOne: false;
            referencedRelation: 'promotions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_events_discount_code_id_fkey';
            columns: ['discount_code_id'];
            isOneToOne: false;
            referencedRelation: 'discount_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_events_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      // Vidéos produit (upload natif ou lien externe TikTok/YouTube/Snapchat)
      product_videos: {
        Row: {
          id: string;
          product_id: string;
          type: 'upload' | 'external';
          url: string;
          source: 'tiktok' | 'youtube' | 'snapchat' | 'other' | null;
          thumbnail_url: string | null;
          duration_sec: number | null;
          position: number;
          created_at: string;
        };
        Insert: {
          product_id: string;
          type?: 'upload' | 'external';
          url: string;
          source?: 'tiktok' | 'youtube' | 'snapchat' | 'other' | null;
          thumbnail_url?: string | null;
          duration_sec?: number | null;
          position?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_videos']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'product_videos_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      // Tables commerce (commandes, paiements, panier, adresses, messagerie, etc.)
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          position: number;
        };
        Insert: {
          product_id: string;
          image_url: string;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['product_images']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          quantity?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cart_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'cart_items_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cart_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          total_amount: number;
          delivery_address_id: string | null;
          status:
            | 'pending_payment'
            | 'proof_uploaded'
            | 'payment_validated'
            | 'in_delivery'
            | 'delivered'
            | 'cancelled';
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          seller_id: string;
          total_amount: number;
          delivery_address_id?: string | null;
          status?:
            | 'pending_payment'
            | 'proof_uploaded'
            | 'payment_validated'
            | 'in_delivery'
            | 'delivered'
            | 'cancelled';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'orders_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_delivery_address_id_fkey';
            columns: ['delivery_address_id'];
            isOneToOne: false;
            referencedRelation: 'delivery_addresses';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          amount: number;
          operator: 'orange_money' | 'moov_money';
          proof_image_url: string | null;
          status: 'pending' | 'validated' | 'rejected';
          created_at: string;
          validated_at: string | null;
        };
        Insert: {
          order_id: string;
          amount: number;
          operator: 'orange_money' | 'moov_money';
          proof_image_url?: string | null;
          status?: 'pending' | 'validated' | 'rejected';
          created_at?: string;
          validated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      delivery_addresses: {
        Row: {
          id: string;
          user_id: string;
          city: string;
          district: string;
          instructions: string | null;
          contact_phone: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          city: string;
          district: string;
          instructions?: string | null;
          contact_phone: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['delivery_addresses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'delivery_addresses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string | null;
          product_id: string | null;
          rating: number;
          comment: string | null;
          likes_count: number;
          seller_reply: string | null;
          seller_replied_at: string | null;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          shop_id?: string | null;
          product_id?: string | null;
          rating: number;
          comment?: string | null;
          likes_count?: number;
          seller_reply?: string | null;
          seller_replied_at?: string | null;
          is_anonymous?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          shop_id: string;
          created_at: string;
        };
        Insert: {
          buyer_id: string;
          seller_id: string;
          shop_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'conversations_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          image_url: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          image_url?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shop_follows: {
        Row: {
          user_id: string;
          shop_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          shop_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shop_follows']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'shop_follows_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shop_follows_shop_id_fkey';
            columns: ['shop_id'];
            isOneToOne: false;
            referencedRelation: 'shops';
            referencedColumns: ['id'];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      review_images: {
        Row: {
          id: string;
          review_id: string;
          image_url: string;
          position: number;
        };
        Insert: {
          review_id: string;
          image_url: string;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['review_images']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'review_images_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
        ];
      };
      review_likes: {
        Row: {
          review_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          review_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['review_likes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'review_likes_review_id_fkey';
            columns: ['review_id'];
            isOneToOne: false;
            referencedRelation: 'reviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'review_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'shop' | 'product';
          target_id: string;
          reason: string;
          status: 'pending' | 'reviewed' | 'resolved';
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: 'shop' | 'product';
          target_id: string;
          reason: string;
          status?: 'pending' | 'reviewed' | 'resolved';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      validate_discount_code: {
        Args: {
          p_code: string;
          p_shop_id: string;
          p_cart_amount: number;
        };
        Returns: {
          valid: boolean;
          discount_amount: number;
          discount_type: string | null;
          discount_value: number;
          message: string;
        };
      };
      get_shop_analytics: {
        Args: { p_shop_id: string; p_days: number };
        Returns: {
          total_views: number;
          total_clicks: number;
          total_conversions: number;
          revenue_total: number;
          conversion_rate: number;
          active_share_links: number;
          active_discount_codes: number;
        };
      };
      get_seller_dashboard_stats: {
        Args: { p_seller_id: string };
        Returns: {
          total_products: number;
          active_products: number;
          total_orders: number;
          pending_orders: number;
          total_revenue: number;
          avg_rating: number;
          total_reviews: number;
          shop_id: string;
        };
      };
      search_products: {
        Args: {
          p_query?: string | null;
          p_category_id?: string | null;
          p_city?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          product_id: string;
          product_name: string;
          product_price: number;
          shop_id: string;
          shop_name: string;
          shop_city: string;
          primary_image: string | null;
          category_id: string;
        };
      };
      cleanup_expired_promotions: {
        Args: Record<string, never>;
        Returns: number;
      };
      cleanup_expired_discount_codes: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_unread_message_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: undefined;
      };
      promote_self_to_admin: {
        Args: { p_verification_key: string };
        Returns: {
          success: boolean;
          message: string;
          new_role: string | null;
        };
      };
      get_ownership_status: {
        Args: Record<string, never>;
        Returns: {
          caller_id: string;
          caller_role: string;
          caller_full_name: string | null;
          total_admins: number;
          total_users: number;
        };
      };
      toggle_favorite: {
        Args: { p_product_id: string };
        Returns: { added: boolean; new_total: number };
      };
      get_product_review_stats: {
        Args: { p_product_id: string };
        Returns: {
          total_reviews: number;
          avg_rating: number;
          stars_1: number;
          stars_2: number;
          stars_3: number;
          stars_4: number;
          stars_5: number;
        };
      };
      add_verification_method: {
        Args: { p_method: string; p_value: string };
        Returns: { success: boolean; message: string; is_verified_now: boolean };
      };
      // ─── V4 : multi-rôles (acheteur + vendeur + livreur) ───
      switch_primary_role: {
        Args: { p_new_role: string };
        Returns: string; // retourne le nouveau primary_role (cast en UserRole côté client)
      };
      // ─── V5 : le livreur fixe son prix à l'acceptation ───
      accept_delivery_with_price: {
        Args: {
          p_delivery_id: string;
          p_driver_user_id: string;
          p_driver_price: number;
        };
        Returns: {
          id: string;
          price: number;
          driver_offer_price: number;
          price_set_by: string;
          status: string;
        };
      };
      // ─── V6 : comptage de vues produits ───
      increment_product_view: {
        Args: { p_product_id: string };
        Returns: void;
      };
      get_top_viewed_products: {
        Args: { p_shop_id: string; p_limit?: number };
        Returns: { product_id: string; product_name: string; view_count: number }[];
      };
    };
    Enums: {
      user_role: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
      shop_status: 'active' | 'paused' | 'pending';
      product_status: 'available' | 'out_of_stock';
      order_status:
        | 'pending_payment'
        | 'proof_uploaded'
        | 'payment_validated'
        | 'in_delivery'
        | 'delivered'
        | 'cancelled';
      payment_operator: 'orange_money' | 'moov_money';
      payment_status: 'pending' | 'validated' | 'rejected';
      delivery_status:
        | 'pending'
        | 'accepted'
        | 'in_progress'
        | 'delivered'
        | 'cancelled'
        | 'refunded';
      vehicle_type: 'moto' | 'velo' | 'voiture' | 'tricycle' | 'camion';
      promotion_type: 'announcement' | 'special_offer' | 'discount_code';
      discount_code_status: 'active' | 'expired' | 'paused' | 'exhausted';
      share_link_source: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'qr_code' | 'direct' | 'other';
      share_link_medium: 'social' | 'qr' | 'link' | 'flyer' | 'sms';
      campaign_event_type: 'view' | 'click' | 'conversion';
      product_video_type: 'upload' | 'external';
      external_video_source: 'tiktok' | 'youtube' | 'snapchat' | 'other';
    };
  };
}
