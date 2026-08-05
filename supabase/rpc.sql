-- ============================================================
-- Boutikplus — Fonctions RPC (Remote Procedure Calls)
-- À exécuter APRÈS schema.sql, policies.sql et triggers.sql
-- Ces fonctions sont appelées côté client via supabase.rpc('fn', params)
-- Elles encapsulent la logique métier complexe côté serveur pour
-- réduire les allers-retours réseau et garantir l'intégrité.
-- ============================================================

-- ============================================================
-- 1. validate_discount_code(p_code, p_shop_id, p_cart_amount)
--    Vérifie qu'un code promo est valide et retourne la réduction.
--    Retourne : { valid, discount_amount, discount_type, discount_value, message }
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_discount_code(
  p_code TEXT,
  p_shop_id UUID,
  p_cart_amount INT DEFAULT 0
)
RETURNS TABLE(
  valid BOOLEAN,
  discount_amount INT,
  discount_type TEXT,
  discount_value INT,
  message TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  dc RECORD;
  computed_discount INT;
BEGIN
  SELECT * INTO dc
  FROM discount_codes
  WHERE code = UPPER(p_code)
    AND shop_id = p_shop_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 0, 'Code introuvable'::TEXT;
    RETURN;
  END IF;

  IF dc.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 0,
      ('Code ' || dc.status)::TEXT;
    RETURN;
  END IF;

  IF dc.expires_at < now() THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 0, 'Code expiré'::TEXT;
    RETURN;
  END IF;

  IF dc.max_uses > 0 AND dc.uses_count >= dc.max_uses THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 0, 'Code épuisé'::TEXT;
    RETURN;
  END IF;

  IF p_cart_amount < dc.min_order_amount THEN
    RETURN QUERY SELECT FALSE, 0, NULL::TEXT, 0,
      ('Montant minimum: ' || dc.min_order_amount || ' FCFA')::TEXT;
    RETURN;
  END IF;

  -- Calcul de la réduction
  IF dc.discount_type = 'percentage' THEN
    computed_discount := FLOOR(p_cart_amount * dc.discount_value / 100);
  ELSE
    computed_discount := dc.discount_value;
  END IF;

  -- La réduction ne peut pas dépasser le montant du panier
  IF computed_discount > p_cart_amount THEN
    computed_discount := p_cart_amount;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    computed_discount,
    dc.discount_type,
    dc.discount_value,
    'Code valide'::TEXT;
  RETURN;
END;
$$;

-- ============================================================
-- 2. get_shop_analytics(p_shop_id, p_days)
--    Agrège les statistiques d'une boutique sur N jours.
--    Retourne : vues, clics, conversions, revenu, taux conversion
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shop_analytics(
  p_shop_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  total_views BIGINT,
  total_clicks BIGINT,
  total_conversions BIGINT,
  revenue_total BIGINT,
  conversion_rate NUMERIC,
  active_share_links BIGINT,
  active_discount_codes BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cutoff_ts TIMESTAMPTZ := now() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN ce.event_type = 'view' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN ce.event_type = 'click' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN ce.event_type = 'conversion' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN ce.event_type = 'conversion' THEN ce.amount ELSE 0 END), 0)::BIGINT,
    CASE
      WHEN COUNT(CASE WHEN ce.event_type = 'click' THEN 1 END) = 0 THEN 0
      ELSE ROUND(
        COUNT(CASE WHEN ce.event_type = 'conversion' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(CASE WHEN ce.event_type = 'click' THEN 1 END), 0) * 100,
        2
      )
    END,
    (SELECT COUNT(*) FROM share_links WHERE shop_id = p_shop_id AND is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM discount_codes WHERE shop_id = p_shop_id AND status = 'active')::BIGINT
  FROM campaign_events ce
  WHERE ce.shop_id = p_shop_id
    AND ce.created_at >= cutoff_ts;
END;
$$;

-- ============================================================
-- 3. get_seller_dashboard_stats(p_seller_id)
--    Statistiques agrégées pour le tableau de bord vendeur.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_seller_dashboard_stats(
  p_seller_id UUID
)
RETURNS TABLE(
  total_products BIGINT,
  active_products BIGINT,
  total_orders BIGINT,
  pending_orders BIGINT,
  total_revenue BIGINT,
  avg_rating NUMERIC,
  total_reviews BIGINT,
  shop_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = p_seller_id LIMIT 1;

  RETURN QUERY
  WITH p_stats AS (
    SELECT
      COUNT(*)::BIGINT AS tp,
      COUNT(*) FILTER (WHERE status = 'available')::BIGINT AS ap
    FROM products WHERE shop_id = v_shop_id
  ),
  o_stats AS (
    SELECT
      COUNT(*)::BIGINT AS to_cnt,
      COUNT(*) FILTER (WHERE status IN ('pending_payment', 'proof_uploaded'))::BIGINT AS po_cnt,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0)::BIGINT AS rev
    FROM orders WHERE seller_id = p_seller_id
  ),
  r_stats AS (
    SELECT
      COALESCE(AVG(rating), 0)::NUMERIC AS avg_r,
      COUNT(*)::BIGINT AS tr_cnt
    FROM reviews WHERE shop_id = v_shop_id
  )
  SELECT p_stats.tp, p_stats.ap, o_stats.to_cnt, o_stats.po_cnt, o_stats.rev, r_stats.avg_r, r_stats.tr_cnt, v_shop_id
  FROM p_stats, o_stats, r_stats;
END;
$$;

-- ============================================================
-- 4. search_products(p_query, p_category_id, p_city, p_limit, p_offset)
--    Recherche full-text simple sur produits + boutiques.
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_products(
  p_query TEXT DEFAULT NULL,
  p_category_id TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  product_price INT,
  shop_id UUID,
  shop_name TEXT,
  shop_city TEXT,
  primary_image TEXT,
  category_id TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- NOTE PERF: for ILIKE '%query%' to use index, create:
  --   CREATE EXTENSION IF NOT EXISTS pg_trgm;
  --   CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
  --   CREATE INDEX idx_products_desc_trgm ON products USING GIN (description gin_trgm_ops);
  RETURN QUERY
  SELECT
    p.id, p.name, p.price,
    s.id, s.name, s.city,
    img.image_url,
    p.category_id
  FROM products p
  JOIN shops s ON s.id = p.shop_id
  LEFT JOIN LATERAL (
    SELECT pi.image_url FROM product_images pi
    WHERE pi.product_id = p.id
    ORDER BY pi.position
    LIMIT 1
  ) img ON true
  WHERE p.status = 'available'
    AND s.status = 'active'
    AND (p_query IS NULL OR p.name ILIKE '%' || p_query || '%' OR p.description ILIKE '%' || p_query || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_city IS NULL OR s.city = p_city)
  ORDER BY p.created_at DESC
  LIMIT LEAST(p_limit, 100)
  OFFSET p_offset;
END;
$$;

-- ============================================================
-- 5. cleanup_expired_promotions()
--    Marque comme 'expired' toutes les promotions dont end_date < now().
--    À appeler via un cron Supabase (pg_cron) ou une Edge Function planifiée.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_promotions()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE promotions
  SET status = 'expired'
  WHERE end_date < now()
    AND status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- ============================================================
-- 6. cleanup_expired_discount_codes()
--    Marque comme 'expired' les codes promo dont expires_at < now().
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_discount_codes()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE discount_codes
  SET status = 'expired'
  WHERE expires_at < now()
    AND status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- ============================================================
-- 7. get_unread_message_count(p_user_id)
--    Compte les messages non lus pour un utilisateur.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_message_count(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
STABLE
AS $$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE (c.buyer_id = p_user_id OR c.seller_id = p_user_id)
    AND m.sender_id <> p_user_id
    AND m.read = FALSE;

  RETURN total;
END;
$$;

-- ============================================================
-- 8. mark_conversation_read(p_conversation_id, p_user_id)
--    Marque tous les messages d'une conversation comme lus pour cet user.
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Vérifie que l'utilisateur fait partie de la conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND (buyer_id = p_user_id OR seller_id = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé à la conversation %', p_conversation_id;
  END IF;

  UPDATE messages
  SET read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id <> p_user_id
    AND read = FALSE;
END;
$$;

-- ============================================================
-- 9. promote_self_to_admin(p_verification_key)
--    Permet au propriétaire légitime (DICKO Christ Steve) de s'auto-promouvoir
--    en administrateur via la clé de vérification 128-bit.
--    Clé : DCFE590DB3F52C16B50913A876D16C82 (même que OWNER_VERIFICATION_KEY)
--    Retourne : { success, message, new_role }
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_self_to_admin(
  p_verification_key TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_role TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_role TEXT;
  v_owner_name TEXT;
  c_LEGIT_KEY CONSTANT TEXT := 'DCFE590DB3F52C16B50913A876D16C82';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Utilisateur non authentifié'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF UPPER(TRIM(p_verification_key)) <> c_LEGIT_KEY THEN
    RETURN QUERY SELECT FALSE, 'Clé de vérification invalide'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT role::TEXT, full_name INTO v_current_role, v_owner_name
  FROM profiles WHERE id = v_user_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Profil introuvable'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_current_role = 'admin' THEN
    RETURN QUERY SELECT TRUE,
      ('Déjà administrateur: ' || COALESCE(v_owner_name, '#' || v_user_id::text))::TEXT,
      'admin'::TEXT;
    RETURN;
  END IF;

  UPDATE profiles
  SET role = 'admin'::user_role,
      updated_at = now()
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE,
    ('Promu admin: ' || COALESCE(v_owner_name, '#' || v_user_id::text))::TEXT,
    'admin'::TEXT;
END;
$$;

-- ============================================================
-- 10. get_ownership_status()
--    Mini-rapport de statut : rôle, nb d'admins, nb total d'utilisateurs.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ownership_status()
RETURNS TABLE(
  caller_id UUID,
  caller_role TEXT,
  caller_full_name TEXT,
  total_admins BIGINT,
  total_users BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    v_user_id,
    p.role::TEXT,
    p.full_name,
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin')::BIGINT,
    (SELECT COUNT(*) FROM profiles)::BIGINT
  FROM profiles p WHERE p.id = v_user_id LIMIT 1;
END;
$$;

-- ============================================================
-- 11. FIX search_path 4 SECURITY DEFINER restantes (port V8)
--     Conformité Postgres 17 : SET search_path = public obligatoire
--     sur toute fonction SECURITY DEFINER (search_path poisoning).
-- ============================================================

-- 11a. add_verification_method(p_method, p_value)
CREATE OR REPLACE FUNCTION public.add_verification_method(p_method TEXT, p_value TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, is_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_links JSONB;
  v_links_count INT;
BEGIN
  IF v_user_id IS NULL THEN RETURN QUERY SELECT FALSE, 'Non authentifié'::TEXT, FALSE; RETURN; END IF;
  IF p_method NOT IN ('whatsapp','instagram','tiktok','facebook','phone_call','email') THEN
    RETURN QUERY SELECT FALSE, ('Méthode non autorisée : '||p_method)::TEXT, FALSE; RETURN; END IF;
  IF length(trim(p_value)) < 3 THEN RETURN QUERY SELECT FALSE, 'Valeur trop courte'::TEXT, FALSE; RETURN; END IF;
  SELECT COALESCE(social_links,'{}'::jsonb) INTO v_links FROM public.profiles WHERE id = v_user_id;
  v_links := COALESCE(v_links,'{}'::jsonb) || jsonb_build_object(p_method, p_value);
  SELECT COUNT(*)::INT INTO v_links_count FROM jsonb_object_keys(v_links) k WHERE v_links->k IS NOT NULL;
  UPDATE public.profiles SET social_links=v_links, verified=(v_links_count>=2), updated_at=now() WHERE id=v_user_id;
  RETURN QUERY SELECT TRUE, ('Méthode '||p_method||' ajoutée')::TEXT, (v_links_count>=2);
END; $$;
REVOKE EXECUTE ON FUNCTION public.add_verification_method(TEXT,TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_verification_method(TEXT,TEXT) TO authenticated;

-- 11b. get_product_review_stats(p_product_id)
CREATE OR REPLACE FUNCTION public.get_product_review_stats(p_product_id UUID)
RETURNS TABLE(total_reviews BIGINT, avg_rating NUMERIC, stars_1 BIGINT, stars_2 BIGINT, stars_3 BIGINT, stars_4 BIGINT, stars_5 BIGINT)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN RETURN QUERY SELECT
  COUNT(*)::BIGINT,
  COALESCE(ROUND(AVG(rating)::NUMERIC,1),0),
  COALESCE(SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END)::BIGINT,0),
  COALESCE(SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END)::BIGINT,0),
  COALESCE(SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END)::BIGINT,0),
  COALESCE(SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END)::BIGINT,0),
  COALESCE(SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END)::BIGINT,0)
FROM public.reviews WHERE product_id = p_product_id; END; $$;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_product_review_stats(UUID) TO authenticated;

-- 11c. notify_user(p_user_id, p_type, p_title, p_body, p_data)
CREATE OR REPLACE FUNCTION public.notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.notifications(user_id,type,title,body,data) VALUES(p_user_id,p_type,p_title,p_body,p_data); END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_user(UUID,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_user(UUID,TEXT,TEXT,TEXT,JSONB) TO authenticated, service_role;

-- 11d. toggle_favorite(p_product_id)
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_product_id UUID)
RETURNS TABLE(added BOOLEAN, new_total INT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_exists BOOLEAN; v_count INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.favorites f WHERE f.user_id=v_user_id AND f.product_id=p_product_id) INTO v_exists;
  IF v_exists THEN DELETE FROM public.favorites WHERE user_id=v_user_id AND product_id=p_product_id; added:=FALSE;
  ELSE INSERT INTO public.favorites(user_id,product_id) VALUES(v_user_id,p_product_id) ON CONFLICT DO NOTHING; added:=TRUE; END IF;
  SELECT favorites_count INTO v_count FROM public.products WHERE id=p_product_id;
  new_total := COALESCE(v_count,0); RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.toggle_favorite(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.toggle_favorite(UUID) TO authenticated;

-- ============================================================
-- 12. set_product_images(p_product_id, p_image_urls)
--    Synchronise transactionnellement les images d'un produit.
--    Supprime les anciennes images puis insère les nouvelles URLs
--    avec leur position. Appelée par updateProduct côté client.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_product_images(
  p_product_id UUID,
  p_image_urls TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Supprime les anciennes images du produit
  DELETE FROM public.product_images WHERE product_id = p_product_id;

  -- Insère les nouvelles images avec position croissante
  IF p_image_urls IS NOT NULL AND array_length(p_image_urls, 1) > 0 THEN
    FOR i IN 1..array_length(p_image_urls, 1) LOOP
      INSERT INTO public.product_images (product_id, image_url, position)
      VALUES (p_product_id, p_image_urls[i], i - 1);
    END LOOP;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_product_images(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_product_images(UUID, TEXT[]) TO authenticated;
