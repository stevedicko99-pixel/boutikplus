-- ============================================================
-- Boutikplus — MIGRATION V9 : Buckets Storage et politiques RLS
-- ============================================================
-- Crée tous les buckets Storage nécessaires et configure
-- les politiques RLS pour sécuriser les uploads.
-- ============================================================

-- ============================================================
-- 1. CRÉATION DES BUCKETS (idempotent)
-- ============================================================

DO $$
DECLARE
  bucket_id TEXT;
BEGIN
  FOREACH bucket_id IN ARRAY ARRAY[
    'shop-logos',
    'shop-covers',
    'product-images',
    'payment-proofs',
    'delivery-proofs',
    'driver-id-cards',
    'profile-avatars',
    'ai-source-images'
  ]::TEXT[] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM storage.buckets WHERE id = bucket_id
    ) THEN
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        bucket_id,
        bucket_id,
        true,
        CASE
          WHEN bucket_id = 'product-images' THEN 10485760  -- 10 MB
          WHEN bucket_id IN ('shop-logos', 'shop-covers', 'profile-avatars', 'ai-source-images') THEN 10485760  -- 10 MB
          WHEN bucket_id IN ('payment-proofs', 'delivery-proofs') THEN 26214400  -- 25 MB
          ELSE 5242880  -- 5 MB par défaut
        END,
        NULL  -- Aucune restriction MIME : la compression convertit tout en JPEG
      );
    END IF;
  END LOOP;

  -- Mettre à jour les buckets existants : lever les restrictions MIME
  -- et augmenter la limite de taille (les anciens buckets avaient 5MB + MIME restrictif)
  UPDATE storage.buckets
  SET
    file_size_limit = CASE
      WHEN id = 'product-images' THEN 10485760
      WHEN id IN ('shop-logos', 'shop-covers', 'profile-avatars', 'ai-source-images') THEN 10485760
      WHEN id IN ('payment-proofs', 'delivery-proofs') THEN 26214400
      ELSE 5242880
    END,
    allowed_mime_types = NULL
  WHERE id IN ('shop-logos', 'shop-covers', 'product-images', 'profile-avatars', 'ai-source-images');
END $$;

-- ============================================================
-- 2. POLITIQUES RLS : lecture publique
-- ============================================================
-- Tous les buckets sont en accès public en lecture
-- (ce sont des images de produits, logos, preuves, etc.)

DO $$
DECLARE
  bucket_id TEXT;
  policy_name TEXT;
BEGIN
  FOREACH bucket_id IN ARRAY ARRAY[
    'shop-logos', 'shop-covers', 'product-images',
    'payment-proofs', 'delivery-proofs', 'driver-id-cards',
    'profile-avatars', 'ai-source-images'
  ]::TEXT[] LOOP
    policy_name := bucket_id || '_public_read';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects
         FOR SELECT
         USING (bucket_id = %L)',
        policy_name, bucket_id
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. POLITIQUES RLS : upload par utilisateurs authentifiés
-- ============================================================
-- Les utilisateurs connectés peuvent uploader dans leur propre dossier
-- (chemin : {user_id}/filename)

DO $$
DECLARE
  bucket_id TEXT;
  policy_name TEXT;
BEGIN
  FOREACH bucket_id IN ARRAY ARRAY[
    'shop-logos', 'shop-covers', 'product-images',
    'payment-proofs', 'delivery-proofs', 'driver-id-cards',
    'profile-avatars', 'ai-source-images'
  ]::TEXT[] LOOP
    policy_name := bucket_id || '_authenticated_upload';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects
         FOR INSERT
         WITH CHECK (
           bucket_id = %L
           AND auth.role() = ''authenticated''
           AND (storage.foldername(name))[1] = auth.uid()::text
         )',
        policy_name, bucket_id
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 4. POLITIQUES RLS : suppression par le propriétaire
-- ============================================================

DO $$
DECLARE
  bucket_id TEXT;
  policy_name TEXT;
BEGIN
  FOREACH bucket_id IN ARRAY ARRAY[
    'shop-logos', 'shop-covers', 'product-images',
    'payment-proofs', 'delivery-proofs', 'driver-id-cards',
    'profile-avatars', 'ai-source-images'
  ]::TEXT[] LOOP
    policy_name := bucket_id || '_owner_delete';

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'objects' AND policyname = policy_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects
         FOR DELETE
         USING (
           bucket_id = %L
           AND auth.role() = ''authenticated''
           AND (storage.foldername(name))[1] = auth.uid()::text
         )',
        policy_name, bucket_id
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. ACTIVATION RLS SUR storage.objects — SKIPPED
-- ============================================================
-- RLS est déjà activé par défaut sur storage.objects dans Supabase.
-- Un ALTER TABLE sur cette table nécessite des droits superuser
-- qui ne sont pas disponibles sur le plan gratuit.
-- ============================================================
-- FIN MIGRATION V9
-- ============================================================
