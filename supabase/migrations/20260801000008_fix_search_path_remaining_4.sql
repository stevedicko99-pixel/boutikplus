/* =====================================================================
 * V8__fix_search_path_remaining_4.sql
 * =====================================================================
 * 4 fonctions SECURITY DEFINER manquaient encore SET search_path=public
 * (détecté post-run migrations : add_verification_method,
 *  get_product_review_stats, notify_user, toggle_favorite)
 *
 * Conformité Postgres 17 — prévient l'exécution de fonctions non qualifiées
 * sur des schémas injectés dans search_path par un attaquant.
 * =====================================================================
 */

/* 1. public.add_verification_method(p_method TEXT, p_value TEXT) ------ */
CREATE OR REPLACE FUNCTION public.add_verification_method(p_method TEXT, p_value TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, is_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT COALESCE(social_links, '{}'::jsonb) INTO v_links FROM public.profiles WHERE id = v_user_id;
  v_links := COALESCE(v_links, '{}'::jsonb) || jsonb_build_object(p_method, p_value);

  -- Compter clés non-nulles
  SELECT COUNT(*)::INT INTO v_links_count
  FROM jsonb_object_keys(v_links) AS k
  WHERE v_links -> k IS NOT NULL;

  UPDATE public.profiles
  SET
    social_links = v_links,
    verified = (v_links_count >= 2),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN QUERY SELECT
    TRUE,
    ('Méthode ' || p_method || ' ajoutée')::TEXT,
    (v_links_count >= 2);
END; $$;
REVOKE EXECUTE ON FUNCTION public.add_verification_method(TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_verification_method(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.add_verification_method(TEXT, TEXT)
  IS 'Ajoute un moyen de vérification (whatsapp/instagram/tiktok/facebook/phone_call/email) à social_links. Badge "vérifié" dès ≥2 méthodes. SECURITY DEFINER avec search_path.';


/* 2. public.get_product_review_stats(p_product_id UUID) -------------- */
CREATE OR REPLACE FUNCTION public.get_product_review_stats(p_product_id UUID)
RETURNS TABLE(
  total_reviews BIGINT,
  avg_rating NUMERIC,
  stars_1 BIGINT, stars_2 BIGINT, stars_3 BIGINT, stars_4 BIGINT, stars_5 BIGINT
) LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
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
  FROM public.reviews
  WHERE product_id = p_product_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_product_review_stats(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_product_review_stats(UUID)
  IS 'Statistiques avis produit (total, moyenne, étoiles 1-5). SECURITY DEFINER avec search_path.';


/* 3. public.notify_user(p_user_id, p_type, p_title, p_body, p_data) -- */
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data);
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

COMMENT ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT, JSONB)
  IS 'Insère une notification en base (push trigger Edge Function). SECURITY DEFINER avec search_path.';


/* 4. public.toggle_favorite(p_product_id UUID) ----------------------- */
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_product_id UUID)
RETURNS TABLE(added BOOLEAN, new_total INT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
  v_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.favorites f WHERE f.user_id = v_user_id AND f.product_id = p_product_id)
    INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.favorites WHERE user_id = v_user_id AND product_id = p_product_id;
    added := FALSE;
  ELSE
    INSERT INTO public.favorites (user_id, product_id) VALUES (v_user_id, p_product_id)
      ON CONFLICT DO NOTHING;
    added := TRUE;
  END IF;
  SELECT favorites_count INTO v_count FROM public.products WHERE id = p_product_id;
  new_total := COALESCE(v_count, 0);
  RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.toggle_favorite(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.toggle_favorite(UUID) TO authenticated;

COMMENT ON FUNCTION public.toggle_favorite(UUID)
  IS 'Toggle favori utilisateur/produit. SECURITY DEFINER avec search_path.';
