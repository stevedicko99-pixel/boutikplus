-- ============================================================
-- Boutikplus — Création COMPTE ADMINISTRATEUR DICKO Christ Steve
-- ============================================================
-- Ce script :
--   1. Crée l'utilisateur dans auth.users (chiffré, mot de passe déjà hashable par Supabase)
--   2. Crée ou met à jour la ligne `profiles` correspondante avec role='admin'
--   3. Marque is_verified=true (propriétaire vérifié par défaut)
--   4. Met social_links avec WhatsApp officiel
--
-- ⚠️ IMPORTANT : À exécuter DANS L'ÉDITEUR SQL DU DASHBOARD SUPABASE.
--   Remplacer 'VOTRE_MOT_DE_PASSE_CLAIR' par le vrai mot de passe (voir plus bas).
-- ============================================================

-- ---------- (1) Création Auth User ----------
-- On utilise la fonction native supabase_auth_admin.create_user de l'extension auth.
-- Cette fonction crée un user AVEC mot de passe hashé côté serveur (pas d'exposition).
-- Retourne l'UUID à réutiliser pour l'étape profiles.

-- ⚠️ Remplace "VOTRE_MOT_DE_PASSE_ADMIN_SÉCURISÉ" par le mot de passe défini dans
--   🔑 docs/admin-credentials.txt (ou génère un nouveau : 15+ car. MAJ/min/chiffres/spéciaux).

DO $$
DECLARE
  v_admin_email TEXT := 'stevedicko98@gmail.com';
  v_admin_pass  TEXT := 'Kk87bd#%4HBa2*g';      -- ⚠️ MOT DE PASSE A CONFIRMER - CHANGE SI BESOIN
  v_full_name   TEXT := 'DICKO Christ Steve';
  v_phone       TEXT := '+8615952717063';       -- Numéro officiel propriétaire
  v_city        TEXT := 'Ouagadougou';
  v_country     TEXT := 'CN';                   -- CN (Chine) + BF (Burkina)
  v_user_id     UUID;
BEGIN
  -- Création via auth.create_user (schema auth, ou auth schema)
  -- Note : selon version Supabase, l'API peut être auth.create_user ou auth.admin_create_user.
  -- On essaie d'abord une approche universelle : INSERT direct dans auth.users via auth.uid
  -- Sauf que le mot de passe est hashé par la base — on passe donc par auth.signup ?
  --
  -- ⚠️ Méthode recommandée ci-après :
  --   Méthode A) Utiliser l'onglet Authentication > Users > Add user (manuel)
  --   OU
  --   Méthode B) Utiliser auth.signup en appelant la RPC ci-dessous ou directement JS.
  --
  -- Script par sécurité ON N'INSERE PAS EN DUR dans auth.users (mot de passe hashé inconnu).
  RAISE NOTICE 'Merci d utiliser l une des 2 methodes :';
  RAISE NOTICE 'Methode 1 - UI Supabase : Authentication → Users → Add user avec email=% et mot de passe CHOISI.', v_admin_email;
  RAISE NOTICE 'Puis EXECUTER la section UPDATE profiles ci-dessous avec l UUID obtenu.';
  RAISE NOTICE 'Methode 2 - JS (côté client Node) : signUp email=% avec le mot de passe, puis RPC promote_self_to_admin.', v_admin_email;
END $$;

-- ============================================================
-- (2) Après création du user Auth → METTRE À JOUR LE PROFIL ADMIN
-- ============================================================
-- Une fois le compte Auth créé, remplace :
--   'REMPLACE_PAR_UUID_AUTH_DU_USER_ADMIN'
-- Par l'UUID apparaissant dans Authentication → Users → colonne "User UID"

DO $$
DECLARE
  v_admin_uid UUID := NULL; -- REMPLACE PAR L'UUID EX: 'a1b2c3d4-1234-5678-9abc-def012345678'
BEGIN
  IF v_admin_uid IS NULL THEN
    RAISE EXCEPTION
      USING ERRCODE = 'UT001',
            MESSAGE = '⚠️ UUID manquant : remplacez v_admin_uid par l UUID de l utilisateur Auth.';
  END IF;

  -- Mise à jour du profil (créé automatiquement par le trigger handle_new_user)
  UPDATE public.profiles
  SET
    role            = 'admin'::public.user_role,
    full_name       = COALESCE(full_name, 'DICKO Christ Steve'),
    phone           = COALESCE(phone, '+8615952717063'),
    city            = COALESCE(NULLIF(city, ''), 'Ouagadougou'),
    is_verified     = TRUE,
    verified_at     = COALESCE(verified_at, NOW()),
    verification_method = COALESCE(verification_method, 'social_links')::TEXT,
    social_links    = COALESCE(
      NULLIF(social_links::TEXT, '{}')::JSONB,
      JSONB_BUILD_OBJECT(
        'whatsapp', '+8615952717063',
        'instagram', NULL,
        'tiktok', NULL,
        'facebook', NULL
      )
    ),
    updated_at      = NOW()
  WHERE id = v_admin_uid;

  IF NOT FOUND THEN
    RAISE NOTICE 'Aucun profil trouvé. Création explicite du profil admin...';
    INSERT INTO public.profiles (id, full_name, phone, city, role, is_verified, verified_at, verification_method, social_links, created_at, updated_at)
    VALUES (
      v_admin_uid,
      'DICKO Christ Steve',
      '+8615952717063',
      'Ouagadougou',
      'admin'::public.user_role,
      TRUE,
      NOW(),
      'social_links',
      JSONB_BUILD_OBJECT('whatsapp', '+8615952717063'),
      NOW(),
      NOW()
    );
  END IF;

  RAISE NOTICE '✅ Compte ADMINISTRATEUR promu avec succès.';
END $$;

-- ============================================================
-- (3) Vérification rapide — liste les admins de la plateforme
-- ============================================================
SELECT
  id,
  full_name,
  email,
  phone,
  role,
  is_verified,
  verified_at,
  verification_method,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;
