-- ============================================================
-- Boutikplus — Migration V3 : Fix admin + RPC + cleanup
-- ============================================================
-- À EXÉCUTER DANS LE SQL EDITOR DU DASHBOARD SUPABASE
-- Date: 2026-08-02
--
-- Contenu:
--   1. Correction du bug SQL dans add_verification_method
--      (compatibilité PostgreSQL 12+ — jsonb_object_length n'existe pas en <PG16,
--       on utilise COUNT(jsonb_object_keys(...)) avec filtre non-null)
--   2. Finalisation du profil admin DICKO Christ Steve:
--      - is_verified = true
--      - social_links avec WhatsApp +8615952717063
--      - verified_at + verification_method
--      (Utilise JOIN auth.users.id car la colonne email n'existe pas dans public.profiles)
--   3. (Optionnel) Suppression des comptes probe-test créés pendant l'audit
-- ============================================================

-- ============================================================
-- 1. CORRECTION RPC add_verification_method (PG12+ compatible)
-- ============================================================

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

  -- Compter clés non-nulles (compatible PostgreSQL 12+ — jsonb_object_length = PG16+)
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

  -- Si ≥2 méthodes sociales OU phone présent → badge vérifié (léger, jeune public)
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
-- 2. FINALISATION PROFIL ADMIN DICKO Christ Steve
-- ============================================================
-- Le compte a été créé via scripts/create-admin.js mais is_verified=false
-- et social_links={} (vide). On corrige via JOIN auth.users.id
-- car la colonne email n'existe pas dans public.profiles.
-- ============================================================

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT u.id INTO v_admin_id
  FROM auth.users u
  WHERE u.email = 'stevedicko98@gmail.com' OR u.email = 'admin.dickochriststeve@boutikplus.app'
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_verified = TRUE,
        verified_at = COALESCE(verified_at, NOW()),
        verification_method = COALESCE(NULLIF(verification_method, ''), 'social_links'),
        social_links = CASE
          WHEN social_links IS NULL OR jsonb_strip_nulls(social_links) = '{}'::jsonb
          THEN JSONB_BUILD_OBJECT(
            'whatsapp',  '+8615952717063',
            'instagram', NULL,
            'tiktok',    NULL,
            'facebook',  NULL
          )
          ELSE social_links
        END,
        updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;
END $$;

-- ============================================================
-- 3. NETTOYAGE DES COMPTES PROBE-TEST (audit)
-- ============================================================
-- Pendant l'audit, 2 users probe-XXX@example.com ont été créés dans auth.users.
-- Ils sont inoffensifs mais on les supprime pour propreté.
-- ⚠️ Nécessite l'accès admin (service_role ou Dashboard)
-- ============================================================

-- Suppression via auth schema (réservé admin)
DELETE FROM auth.users
WHERE email LIKE 'probe-%@example.com';

-- ============================================================
-- 4. VÉRIFICATION FINALE
-- ============================================================

SELECT
  'PROFIL ADMIN' AS check_section,
  id,
  full_name,
  email,
  phone,
  role,
  is_verified,
  verified_at,
  verification_method,
  social_links
FROM public.profiles
WHERE email = 'stevedicko98@gmail.com';

SELECT
  'COMPTE ADMIN TOTAL' AS check_section,
  COUNT(*) AS total_admins
FROM public.profiles
WHERE role = 'admin';

SELECT
  'PROBE USERS RESTANTS' AS check_section,
  COUNT(*) AS total
FROM auth.users
WHERE email LIKE 'probe-%@example.com';
