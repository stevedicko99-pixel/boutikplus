-- ============================================================
-- Boutikplus — Schéma de base de données Supabase
-- Marketplace communautaire du Burkina Faso
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Types énumérés
-- ============================================================
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE shop_status AS ENUM ('active', 'paused', 'pending');
CREATE TYPE product_status AS ENUM ('available', 'out_of_stock');
CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'proof_uploaded',
  'payment_validated',
  'in_delivery',
  'delivered',
  'cancelled'
);
CREATE TYPE payment_operator AS ENUM ('orange_money', 'moov_money');
CREATE TYPE payment_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE promotion_visibility AS ENUM ('home', 'category');
CREATE TYPE promotion_status AS ENUM ('active', 'expired', 'paused');
CREATE TYPE report_target_type AS ENUM ('shop', 'product');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved');
CREATE TYPE delivery_status AS ENUM ('pending', 'accepted', 'in_progress', 'delivered', 'cancelled', 'refunded');
CREATE TYPE vehicle_type AS ENUM ('moto', 'velo', 'voiture', 'tricycle', 'camion');
-- Promotion de boutique
CREATE TYPE promotion_type AS ENUM ('announcement', 'special_offer', 'discount_code');
CREATE TYPE discount_code_status AS ENUM ('active', 'expired', 'paused', 'exhausted');
CREATE TYPE share_link_source AS ENUM ('whatsapp', 'facebook', 'instagram', 'tiktok', 'snapchat', 'qr_code', 'direct', 'other');

-- Migration pour bases existantes (ALTER TYPE ADD VALUE ne peut pas être dans une transaction)
-- À exécuter séparément si la table existe déjà :
-- ALTER TYPE share_link_source ADD VALUE IF NOT EXISTS 'tiktok';
-- ALTER TYPE share_link_source ADD VALUE IF NOT EXISTS 'snapchat';
CREATE TYPE share_link_medium AS ENUM ('social', 'qr', 'link', 'flyer', 'sms');
CREATE TYPE campaign_event_type AS ENUM ('view', 'click', 'conversion');

-- ============================================================
-- 1. profiles — extension de auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  avatar_url TEXT,
  push_token TEXT, -- token Expo Push Notifications (nullable, pas activé par défaut)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration pour bases existantes : ajout de la colonne push_token si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'push_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN push_token TEXT;
  END IF;
END $$;

-- ============================================================
-- 2. categories — catégories de référence
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  sort_order INT NOT NULL DEFAULT 0
);

-- ============================================================
-- 3. shops — boutiques des vendeurs
-- ============================================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id),
  city TEXT NOT NULL,
  orange_money_number TEXT,
  moov_money_number TEXT,
  status shop_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. products — produits des boutiques
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL CHECK (price >= 0),
  category_id TEXT NOT NULL REFERENCES categories(id),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status product_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. product_images — photos multiples
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);

-- 5b. product_videos — vidéos produit (upload natif ou lien externe TikTok/YouTube/Snapchat)
-- ============================================================
CREATE TYPE product_video_type AS ENUM ('upload', 'external');
CREATE TYPE external_video_source AS ENUM ('tiktok', 'youtube', 'snapchat', 'other');

CREATE TABLE IF NOT EXISTS product_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type product_video_type NOT NULL DEFAULT 'external',
  url TEXT NOT NULL,
  source external_video_source,
  thumbnail_url TEXT,
  duration_sec INT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON product_videos(product_id);

-- ============================================================
-- 6. cart_items — panier persistant
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- ============================================================
-- 7. orders — commandes
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_amount INT NOT NULL CHECK (total_amount >= 0),
  delivery_address_id UUID,
  status order_status NOT NULL DEFAULT 'pending_payment',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. order_items — lignes de commande
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price INT NOT NULL CHECK (unit_price >= 0)
);

-- ============================================================
-- 9. payments — paiements Mobile Money (preuve par capture)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount >= 0),
  operator payment_operator NOT NULL,
  proof_image_url TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ
);

-- ============================================================
-- 10. delivery_addresses — adresses de livraison
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  instructions TEXT,
  contact_phone TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. reviews — avis boutiques/produits
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (shop_id IS NOT NULL OR product_id IS NOT NULL)
);

-- ============================================================
-- 12. promotions — publicités/promotions (étendue : annonce / offre / code promo)
-- NOTE : les FK vers discount_codes et share_links sont ajoutées via ALTER TABLE
-- plus bas, car ces tables sont définies après promotions (pour éviter un
-- forward reference qui ferait échouer l'installation sur base vierge).
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  promo_text TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  visibility promotion_visibility NOT NULL DEFAULT 'home',
  status promotion_status NOT NULL DEFAULT 'active',
  -- Champs étendus (rétro-compatibles : tous nullable)
  promotion_type promotion_type,
  discount_code_id UUID, -- FK ajoutée plus bas (après création de discount_codes)
  share_link_id UUID,    -- FK ajoutée plus bas (après création de share_links)
  image_url TEXT,
  original_price INT CHECK (original_price IS NULL OR original_price >= 0),
  discounted_price INT CHECK (discounted_price IS NULL OR discounted_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. conversations — conversations acheteur-vendeur
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, seller_id, shop_id)
);

-- ============================================================
-- 14. messages — messages de chat
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. shop_follows — abonnements aux boutiques
-- ============================================================
CREATE TABLE IF NOT EXISTS shop_follows (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

-- ============================================================
-- 16. reports — signalements
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type report_target_type NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. notifications — notifications utilisateur
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. driver_profiles — profils livreur (1:1 avec profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type vehicle_type NOT NULL DEFAULT 'moto',
  city TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0,
  total_deliveries INT NOT NULL DEFAULT 0,
  base_rate INT NOT NULL DEFAULT 500 CHECK (base_rate >= 0),
  per_km_rate INT NOT NULL DEFAULT 150 CHECK (per_km_rate >= 0),
  max_weight INT NOT NULL DEFAULT 20 CHECK (max_weight > 0),
  orange_money_number TEXT,
  moov_money_number TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  license_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. delivery_requests — commandes de livraison
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  package_weight INT NOT NULL CHECK (package_weight > 0),
  package_length INT NOT NULL CHECK (package_length >= 0),
  package_width INT NOT NULL CHECK (package_width >= 0),
  package_height INT NOT NULL CHECK (package_height >= 0),
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL CHECK (price >= 0),
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  status delivery_status NOT NULL DEFAULT 'pending',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- ============================================================
-- 20. delivery_payments — paiements Mobile Money des livraisons
-- (table séparée de payments car payments.order_id est NOT NULL UNIQUE)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL UNIQUE REFERENCES delivery_requests(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount >= 0),
  operator payment_operator NOT NULL,
  proof_image_url TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ
);

-- ============================================================
-- 21. delivery_reviews — avis sur les livreurs
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 22. share_links — liens de partage traçables (uniques par vendeur, durables)
-- ============================================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  source share_link_source NOT NULL DEFAULT 'direct',
  medium share_link_medium NOT NULL DEFAULT 'link',
  campaign TEXT,
  target_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INT NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  clicks_count INT NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
  conversions_count INT NOT NULL DEFAULT 0 CHECK (conversions_count >= 0),
  revenue_total INT NOT NULL DEFAULT 0 CHECK (revenue_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 23. discount_codes — codes de réduction (uniques par boutique)
-- ============================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INT NOT NULL CHECK (discount_value > 0),
  min_order_amount INT NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_uses INT NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  status discount_code_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code),
  CHECK (
    (discount_type = 'percentage' AND discount_value <= 100)
    OR discount_type = 'fixed'
  )
);

-- ============================================================
-- 24. campaign_events — événements de campagne (vues / clics / conversions)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES share_links(id) ON DELETE SET NULL,
  promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
  event_type campaign_event_type NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount INT CHECK (amount IS NULL OR amount >= 0),
  order_id UUID,
  city TEXT,
  source share_link_source,
  medium share_link_medium,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FK différées pour promotions (voir note plus haut)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promotions_discount_code_id_fkey'
      AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions
      ADD CONSTRAINT promotions_discount_code_id_fkey
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'promotions_share_link_id_fkey'
      AND table_name = 'promotions'
  ) THEN
    ALTER TABLE promotions
      ADD CONSTRAINT promotions_share_link_id_fkey
      FOREIGN KEY (share_link_id) REFERENCES share_links(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Index
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_city ON driver_profiles(city);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_seller ON delivery_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver ON delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_payments_delivery ON delivery_payments(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_reviews_delivery ON delivery_reviews(delivery_id);
-- Promotion de boutique
CREATE INDEX IF NOT EXISTS idx_share_links_shop ON share_links(shop_id);
CREATE INDEX IF NOT EXISTS idx_share_links_slug ON share_links(slug);
CREATE INDEX IF NOT EXISTS idx_share_links_owner ON share_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_shop ON discount_codes(shop_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(shop_id, code);
CREATE INDEX IF NOT EXISTS idx_campaign_events_shop ON campaign_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_link ON campaign_events(share_link_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_created ON campaign_events(created_at);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(promotion_type) WHERE promotion_type IS NOT NULL;

-- ============================================================
-- Trigger : créer automatiquement un profil à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger : mettre à jour updated_at sur orders
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS delivery_requests_updated_at ON delivery_requests;
CREATE TRIGGER delivery_requests_updated_at
  BEFORE UPDATE ON delivery_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Activer Realtime sur les tables pertinentes
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_payments;

-- ============================================================
-- Activation Row Level Security — tables promotion & vidéos
-- (Les politiques RLS elles-mêmes sont définies dans policies.sql
--  pour centraliser toute la sécurité au même endroit.)
-- Les buckets Storage et leurs politiques sont dans storage.sql.
-- ============================================================
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_videos ENABLE ROW LEVEL SECURITY;
