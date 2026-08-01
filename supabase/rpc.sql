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
LANGUAGE plpgsql SECURITY DEFINER
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
LANGUAGE plpgsql SECURITY DEFINER
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
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT id INTO v_shop_id FROM shops WHERE owner_id = p_seller_id LIMIT 1;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM products WHERE shop_id = v_shop_id)::BIGINT,
    (SELECT COUNT(*) FROM products WHERE shop_id = v_shop_id AND status = 'available')::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE seller_id = p_seller_id)::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE seller_id = p_seller_id AND status IN ('pending_payment', 'proof_uploaded'))::BIGINT,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE seller_id = p_seller_id AND status = 'delivered')::BIGINT,
    COALESCE(
      (SELECT AVG(rating) FROM reviews WHERE shop_id = v_shop_id),
      0
    )::NUMERIC,
    (SELECT COUNT(*) FROM reviews WHERE shop_id = v_shop_id)::BIGINT,
    v_shop_id;
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
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.price,
    s.id,
    s.name,
    s.city,
    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1),
    p.category_id
  FROM products p
  JOIN shops s ON s.id = p.shop_id
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
LANGUAGE plpgsql SECURITY DEFINER
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
LANGUAGE plpgsql SECURITY DEFINER
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
LANGUAGE plpgsql SECURITY DEFINER
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
LANGUAGE plpgsql SECURITY DEFINER
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
