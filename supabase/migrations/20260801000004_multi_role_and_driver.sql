-- ============================================================
-- Migration V4 : Multi-rôles (acheteur + vendeur + livreur)
-- + Support livreur pour les jeunes (opportunité de revenus)
-- ============================================================
-- Objectif : un utilisateur peut avoir plusieurs rôles à la fois
--   ex : VENDEUR + LIVREUR, ACHETEUR + LIVREUR, etc.
-- Compatibilité ascendante : colonne `role user_role` reste intacte.

-- 1. Ajout colonne rôles multiples (TEXT[] pour éviter ALTER TYPE sur ENUM)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='roles') THEN
    ALTER TABLE profiles
      ADD COLUMN roles TEXT[] NOT NULL DEFAULT ARRAY['buyer']::TEXT[];
  END IF;
END $$;

-- 2. Ajout colonne primary_role (rôle actif / principal)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='primary_role') THEN
    ALTER TABLE profiles
      ADD COLUMN primary_role user_role NOT NULL DEFAULT 'buyer';
  END IF;
END $$;

-- 3. Migrer les anciennes données : roles = ARRAY[role], primary_role = role
UPDATE profiles SET
  roles = ARRAY[role]::TEXT[],
  primary_role = role
WHERE roles = ARRAY['buyer']::TEXT[] AND primary_role = 'buyer' AND role IS NOT NULL;

-- 4. Index pour recherches par rôle
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_profiles_roles_gin') THEN
    CREATE INDEX idx_profiles_roles_gin ON profiles USING GIN(roles);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_profiles_primary_role') THEN
    CREATE INDEX idx_profiles_primary_role ON profiles(primary_role);
  END IF;
END $$;

-- ============================================================
-- Fonction SYNC : avant INSERT ou UPDATE sur profiles
--   → synchronise roles[1] -> primary_role -> role
-- Garantit la compatibilité ascendante avec l'ancienne colonne `role`.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_profile_roles()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  first_role TEXT;
BEGIN
  -- Nettoyer roles : retirer doublons, garder ordre, ne pas laisser vide
  IF NEW.roles IS NULL OR array_length(NEW.roles, 1) IS NULL OR array_length(NEW.roles, 1) = 0 THEN
    NEW.roles := ARRAY['buyer']::TEXT[];
  END IF;

  -- Primary role : utiliser NEW.primary_role si fourni et DANS roles
  IF NEW.primary_role IS NULL OR NOT (NEW.primary_role::TEXT = ANY(NEW.roles)) THEN
    NEW.primary_role := NEW.roles[1]::user_role;
  END IF;

  -- Rétro-compatibilité : colonne `role` = primary_role
  NEW.role := NEW.primary_role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_sync_roles ON profiles;
CREATE TRIGGER trg_profile_sync_roles
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_roles();

-- ============================================================
-- RPC : changer de rôle actif (après login, multi-rôles)
-- Utilisation : SELECT switch_primary_role('driver');
-- ============================================================
CREATE OR REPLACE FUNCTION switch_primary_role(p_new_role TEXT)
  RETURNS user_role
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_roles TEXT[];
  v_final_role user_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Vous devez être connecté pour changer de rôle.';
  END IF;
  IF p_new_role IS NULL OR p_new_role NOT IN ('buyer', 'seller', 'driver', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Rôle invalide : %', p_new_role;
  END IF;

  SELECT roles INTO v_current_roles FROM profiles WHERE id = v_user_id;
  IF v_current_roles IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable.';
  END IF;

  -- Si le rôle cible n'est pas déjà dans la liste, l'ajouter (sauf admin/super_admin)
  IF NOT (p_new_role = ANY(v_current_roles)) THEN
    IF p_new_role IN ('admin', 'super_admin') THEN
      RAISE EXCEPTION 'Privilèges insuffisants pour devenir %.', p_new_role;
    END IF;
    v_current_roles := array_append(v_current_roles, p_new_role);
  END IF;

  UPDATE profiles
    SET roles = v_current_roles,
        primary_role = p_new_role::user_role,
        role = p_new_role::user_role
  WHERE id = v_user_id;

  v_final_role := p_new_role::user_role;
  RETURN v_final_role;
END;
$$;

-- 5. Mettre à jour handle_new_user trigger function : accepter roles[] + primary_role
--    depuis raw_user_meta_data (raw_app_meta_data ne passe pas client).
CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_role TEXT;
  v_roles TEXT[];
  v_primary_role TEXT;
BEGIN
  v_full_name    := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName');
  v_phone        := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phoneNumber');
  v_city         := COALESCE(NEW.raw_user_meta_data->>'city');
  v_role         := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  v_roles        := COALESCE(
                      (SELECT array_agg(elem::text) FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'roles') elem),
                      ARRAY[v_role]::TEXT[]
                    );
  v_primary_role := COALESCE(NEW.raw_user_meta_data->>'primary_role', v_role);

  -- Sécurité : forcer buyer si rôles vides
  IF array_length(v_roles, 1) IS NULL THEN v_roles := ARRAY['buyer']::TEXT[]; END IF;

  INSERT INTO public.profiles (id, full_name, phone, city, role, roles, primary_role)
  VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    v_city,
    v_primary_role::user_role,
    v_roles,
    v_primary_role::user_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION sync_profile_roles() TO postgres;
GRANT EXECUTE ON FUNCTION switch_primary_role(TEXT) TO authenticated, service_role;

-- Vérification finale : rôle driver ajouté à la liste autorisée
COMMENT ON COLUMN profiles.roles IS 'Tableau des rôles de l''utilisateur (acheteur/vendeur/livreur/admin). Un utilisateur peut cumuler plusieurs rôles (ex: vendeur + livreur).';
COMMENT ON COLUMN profiles.primary_role IS 'Rôle actif après connexion. Détermine le tableau de bord affiché (Home / Seller / Driver / Admin).';
COMMENT ON FUNCTION switch_primary_role(TEXT) IS 'Permet à un utilisateur connecté de basculer entre ses rôles (acheteur → livreur → vendeur). Si le rôle cible n''est pas possédé, il est ajouté automatiquement (sauf admin/super_admin).';
