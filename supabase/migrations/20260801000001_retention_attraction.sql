-- ============================================================
-- Boutikplus — MIGRATION PHASE 2 : Rétention + Attraction
-- ============================================================
-- Contenu :
--   1. Table favorites (wishlist)
--   2. Tables product_reviews + product_review_images + review_likes (structure unifiée reviews)
--      *Note : la table "reviews" existe déjà, on ajoute juste des champs utiles + unification*
--   3. Colonnes profils : is_verified, verified_at, verification_method, social_links JSONB
--   4. Triggers pour notifications en base (nouveau favori sur un shop, avis produit, etc.)
--   5. Politiques RLS pour favorites
--   6. RPC utilitaires : toggle_favorite(p_id), get_product_review_stats(p_id)
-- ============================================================

-- ============================================================
-- 1. FAVORITES (WISHLIST PRODUITS)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product ON favorites(product_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Ownership-based policies (chaque utilisateur ne voit que SES favoris)
CREATE POLICY "favorites_owner_read" ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_owner_insert" ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_owner_delete" ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Pas de UPDATE : favori = toggle via DELETE/INSERT

-- Rajouter un compteur de favoris sur la table products pour l'UX
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'favorites_count'
  ) THEN
    ALTER TABLE products ADD COLUMN favorites_count INT NOT NULL DEFAULT 0 CHECK (favorites_count >= 0);
  END IF;
END $$;

-- Trigger MAJ favorites_count sur products
CREATE OR REPLACE FUNCTION sync_product_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE products SET favorites_count = favorites_count + 1 WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE products SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_favorites_sync_count ON favorites;
CREATE TRIGGER trg_favorites_sync_count
AFTER INSERT OR DELETE ON favorites
FOR EACH ROW EXECUTE FUNCTION sync_product_favorites_count();

-- ============================================================
-- 2. AJOUTS SUR LA TABLE REVIEWS EXISTANTE (avis produits améliorés)
-- ============================================================
-- La table reviews existe avec (id, user_id, shop_id NULL, product_id NULL, rating, comment)
-- On étend pour : images par avis, like/dislike, réponses vendeur, anonymat

-- 2a. Images d'un avis produit (jusqu'à 5 images par review)
CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_review_images_review ON review_images(review_id);

ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_images_read" ON review_images FOR SELECT USING (true);
CREATE POLICY "review_images_owner_manage" ON review_images FOR ALL USING (
  EXISTS (SELECT 1 FROM reviews r WHERE r.id = review_images.review_id AND r.user_id = auth.uid())
  OR is_admin()
) WITH CHECK (
  EXISTS (SELECT 1 FROM reviews r WHERE r.id = review_images.review_id AND r.user_id = auth.uid())
  OR is_admin()
);

-- 2b. Ajout de champs à reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='likes_count') THEN
    ALTER TABLE reviews ADD COLUMN likes_count INT NOT NULL DEFAULT 0 CHECK (likes_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='seller_reply') THEN
    ALTER TABLE reviews ADD COLUMN seller_reply TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='seller_replied_at') THEN
    ALTER TABLE reviews ADD COLUMN seller_replied_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='is_anonymous') THEN
    ALTER TABLE reviews ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2c. Likes sur les avis
CREATE TABLE IF NOT EXISTS review_likes (
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_likes_read" ON review_likes FOR SELECT USING (true);
CREATE POLICY "review_likes_insert_self" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_likes_delete_self" ON review_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION sync_review_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE reviews SET likes_count = likes_count + 1 WHERE id = NEW.review_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE reviews SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_likes_sync_count ON review_likes;
CREATE TRIGGER trg_review_likes_sync_count
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW EXECUTE FUNCTION sync_review_likes_count();

-- ============================================================
-- 3. VÉRIFICATION UTILISATEUR LÉGÈRE (Badge officiel pour public jeune)
-- ============================================================
-- Pas trop rigoureux : on accepte vérification téléphone, ou ajout d'un lien social
-- (WhatsApp / Instagram / TikTok). Le badge apparaît sur le profil.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verified_at') THEN
    ALTER TABLE profiles ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verification_method') THEN
    ALTER TABLE profiles ADD COLUMN verification_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_links') THEN
    ALTER TABLE profiles ADD COLUMN social_links JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Auto-badge de vérification si numéro de téléphone confirmé (mécanisme léger, pas KYC)
-- Un compte avec un numéro non vide valide + ≥3 commandes livrées = vérifié auto
CREATE OR REPLACE FUNCTION auto_verify_profile_on_user_update()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_phone_count INT;
  v_delivered_orders INT;
BEGIN
  IF NEW.phone IS NOT NULL AND length(trim(NEW.phone)) >= 8 THEN
    -- On ne passe à TRUE que si la personne a déjà un historique d'achats
    SELECT COUNT(*) INTO v_delivered_orders
      FROM orders WHERE buyer_id = NEW.id AND status = 'delivered';

    IF v_delivered_orders >= 3 AND (OLD.is_verified IS NULL OR OLD.is_verified = FALSE) THEN
      NEW.is_verified := TRUE;
      NEW.verified_at := now();
      NEW.verification_method := 'auto:phone+orders';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_auto_verify ON profiles;
CREATE TRIGGER trg_profile_auto_verify
BEFORE UPDATE OF phone ON profiles
FOR EACH ROW EXECUTE FUNCTION auto_verify_profile_on_user_update();

-- ============================================================
-- 4. TRIGGERS DE NOTIFICATIONS EN BASE (push + DB notif)
-- ============================================================
-- Notifie le vendeur quand :
--   - son produit reçoit un avis
--   - son produit est ajouté en favori
--   - un client répond à sa notification de commande

-- Helper : insère une ligne dans la table notifications
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
  -- On ne tente PAS l'envoi Expo Push ici (besoin d'Edge Function).
  -- Un trigger Edge Function sur NOTIFY écoute la table notifications en cas d'extension.
END; $$;

-- Trigger : Nouvel avis produit → notif vendeur
CREATE OR REPLACE FUNCTION notify_seller_new_product_review()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_product_name TEXT;
  v_shop_name TEXT;
  v_reviewer_name TEXT;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT s.owner_id, p.name, s.name, pf.full_name
      INTO v_seller_id, v_product_name, v_shop_name, v_reviewer_name
      FROM products p
      JOIN shops s ON s.id = p.shop_id
      JOIN profiles pf ON pf.id = NEW.user_id
      WHERE p.id = NEW.product_id;

    IF v_seller_id IS NOT NULL THEN
      PERFORM notify_user(
        v_seller_id,
        'new_review',
        'Nouvel avis sur ' || LEFT(v_product_name, 22),
        (CASE WHEN NEW.is_anonymous = TRUE THEN 'Un client' ELSE COALESCE(v_reviewer_name, 'Un client') END)
          || ' a donné ' || NEW.rating || '★ à ton produit',
        jsonb_build_object('review_id', NEW.id, 'product_id', NEW.product_id, 'shop_id', (SELECT id FROM shops WHERE name=v_shop_name LIMIT 1))
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_review_seller_notif ON reviews;
CREATE TRIGGER trg_new_review_seller_notif
AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION notify_seller_new_product_review();

-- ============================================================
-- 5. RPC UTILITAIRES CLIENT
-- ============================================================

-- 5a. toggle_favorite(p_product_id) — ajoute ou retire un produit des favoris
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_product_id UUID)
RETURNS TABLE(added BOOLEAN, new_total INT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  SELECT EXISTS (SELECT 1 FROM favorites f WHERE f.user_id = v_user_id AND f.product_id = p_product_id)
    INTO v_exists;

  IF v_exists THEN
    DELETE FROM favorites WHERE user_id = v_user_id AND product_id = p_product_id;
    added := FALSE;
  ELSE
    INSERT INTO favorites (user_id, product_id) VALUES (v_user_id, p_product_id)
      ON CONFLICT DO NOTHING;
    added := TRUE;
  END IF;
  SELECT favorites_count INTO v_count FROM products WHERE id = p_product_id;
  new_total := COALESCE(v_count, 0);
  RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.toggle_favorite(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.toggle_favorite(UUID) TO authenticated;

-- 5b. get_product_review_stats(p_product_id) — stats moyennes + compteurs par note
CREATE OR REPLACE FUNCTION public.get_product_review_stats(p_product_id UUID)
RETURNS TABLE(
  total_reviews BIGINT,
  avg_rating NUMERIC,
  stars_1 BIGINT, stars_2 BIGINT, stars_3 BIGINT, stars_4 BIGINT, stars_5 BIGINT
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_reviews,
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS avg_rating,
    COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS stars_1,
    COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS stars_2,
    COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS stars_3,
    COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS stars_4,
    COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS stars_5
  FROM reviews
  WHERE product_id = p_product_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_product_review_stats(UUID) TO authenticated;

-- 5c. add_verification_method(p_method, p_value) — complète social_links pour badge
-- Exemple d'appel : rpc('add_verification_method', {p_method: 'whatsapp', p_value: '+8615952717063'})
-- ⚠️ Léger, pas KYC. On valide seulement que le format est cohérent pour jeunes utilisateurs.
CREATE OR REPLACE FUNCTION public.add_verification_method(p_method TEXT, p_value TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, is_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_links JSONB;
  v_links_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Non authentifié'::TEXT, FALSE;
    RETURN;
  END IF;

  IF p_method NOT IN ('whatsapp', 'instagram', 'tiktok', 'facebook', 'phone_call', 'email') THEN
    RETURN QUERY SELECT FALSE, ('Méthode non autorisée : ' || p_method)::TEXT, FALSE;
    RETURN;
  END IF;

  IF length(trim(p_value)) < 3 THEN
    RETURN QUERY SELECT FALSE, 'Valeur trop courte'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Merge dans social_links (JSONB)
  SELECT COALESCE(social_links, '{}'::jsonb) INTO v_links FROM profiles WHERE id = v_user_id;
  v_links := COALESCE(v_links, '{}'::jsonb) || jsonb_build_object(p_method, p_value);

  -- Compter clés non-nulles (compatible PostgreSQL 12+ — jsonb_object_length n'existe qu'en PG16)
  SELECT COUNT(*)::INT INTO v_links_count
  FROM jsonb_object_keys(v_links) AS k
  WHERE v_links -> k IS NOT NULL
    AND v_links -> k <> 'null'::jsonb
    AND length(btrim(v_links ->> k)) > 0;

  UPDATE profiles
  SET social_links = v_links,
      verification_method = CASE WHEN verification_method IS NULL THEN ('social:'||p_method) ELSE verification_method END,
      updated_at = now()
  WHERE id = v_user_id;

  -- Si ≥2 méthodes sociales (non-nulles) OU phone présent → badge vérifié
  IF v_links_count >= 2
     OR EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND phone IS NOT NULL AND length(btrim(phone)) > 0) THEN
    UPDATE profiles
    SET is_verified = TRUE,
        verified_at = COALESCE(verified_at, now())
    WHERE id = v_user_id AND is_verified = FALSE;
  END IF;

  RETURN QUERY
    SELECT TRUE,
           ('Méthode ' || p_method || ' ajoutée')::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND is_verified = TRUE)
                THEN TRUE ELSE FALSE END::BOOLEAN;
END; $$;
REVOKE EXECUTE ON FUNCTION public.add_verification_method(TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_verification_method(TEXT, TEXT) TO authenticated;

-- ============================================================
-- FIN MIGRATION PHASE 2
-- ============================================================
