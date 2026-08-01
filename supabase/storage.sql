-- ============================================================
-- Boutikplus — Buckets Supabase Storage (production)
-- ============================================================
-- Sécurité : les uploads sont préfixés par l'ID utilisateur
-- (path = "{userId}/filename"). Les politiques RLS Storage vérifient
-- que le premier segment du path correspond à auth.uid().
-- Cela empêche un utilisateur d'écrire dans le dossier d'un autre.
-- ============================================================

-- 4 buckets publics en lecture (les images doivent être accessibles publiquement)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('shop-logos', 'shop-logos', true),
  ('product-images', 'product-images', true),
  ('payment-proofs', 'payment-proofs', true),
  ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les vidéos produit (upload natif, public en lecture)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('product-videos', 'product-videos', true, 26214400) -- 25MB max
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Helper : vérifie que le premier segment du path = auth.uid()
-- storage.foldername(name) retourne les segments du chemin.
-- ============================================================

-- ============================================================
-- shop-logos : lecture publique, écriture = owner du dossier uniquement
-- ============================================================
CREATE POLICY "shop_logos_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-logos');

CREATE POLICY "shop_logos_insert_owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "shop_logos_update_owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'shop-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "shop_logos_delete_owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'shop-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- product-images : lecture publique, écriture = owner du dossier
-- ============================================================
CREATE POLICY "product_images_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_update_owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_delete_owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- payment-proofs : lecture publique (vendeur doit voir la preuve),
-- écriture = owner du dossier (l'acheteur qui upload)
-- NOTE: Le contenu est une capture d'écran de transaction Mobile Money.
--       L'URL publique est non devinable (UUID + timestamp).
-- ============================================================
CREATE POLICY "payment_proofs_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "payment_proofs_insert_owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "payment_proofs_update_owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "payment_proofs_delete_owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- delivery-proofs : preuves de paiement des livraisons
-- ============================================================
CREATE POLICY "delivery_proofs_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');

CREATE POLICY "delivery_proofs_insert_owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "delivery_proofs_update_owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'delivery-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "delivery_proofs_delete_owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'delivery-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- product-videos : lectures publique, écriture = owner du dossier
-- ============================================================
CREATE POLICY "product_videos_bucket_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-videos');

CREATE POLICY "product_videos_bucket_insert_owner" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-videos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_videos_bucket_update_owner" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_videos_bucket_delete_owner" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
