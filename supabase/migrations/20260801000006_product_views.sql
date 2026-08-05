-- ============================================================
-- Migration V6 — Comptage de vues produits
-- Boutikplus — 2026
-- ============================================================

-- 1. Ajouter la colonne views_count à la table products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0 CHECK (views_count >= 0);

-- 2. RPC : incrementer le compteur de vues d'un produit (appelée quand un acheteur consulte la fiche produit)
CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET views_count = views_count + 1
  WHERE id = p_product_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_product_view(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_product_view(UUID) TO authenticated, anon;

-- 3. RPC : récupérer le top N produits les plus vus d'une boutique
CREATE OR REPLACE FUNCTION public.get_top_viewed_products(p_shop_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  view_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.views_count
  FROM products p
  WHERE p.shop_id = p_shop_id
  ORDER BY p.views_count DESC
  LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_top_viewed_products(UUID, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_top_viewed_products(UUID, INT) TO authenticated;

-- 4. Mettre à jour le schéma de la table products pour inclure views_count dans le type de la DB
-- (Les ORM sont typés à la main dans src/types/database.ts)

-- 5. Créer une table product_view_events pour analytics détaillés (optionnel, pour tracking futur)
CREATE TABLE IF NOT EXISTS product_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'direct'
);

CREATE INDEX IF NOT EXISTS idx_product_view_events_product ON product_view_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_view_events_time ON product_view_events(viewed_at DESC);

ALTER TABLE product_view_events ENABLE ROW LEVEL SECURITY;

-- Les vues sont publiques (pas de données sensibles)
CREATE POLICY "product_view_events_insert_public" ON product_view_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "product_view_events_read_owner" ON product_view_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    OR viewer_id = auth.uid()
  );

-- 6. Trigger : enregistrer chaque vue dans product_view_events
CREATE OR REPLACE FUNCTION public.log_product_view_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO product_view_events (product_id, viewer_id, source)
  VALUES (
    NEW.id,
    CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE NULL END,
    'app'
  );
  RETURN NEW;
END;
$$;

-- Le trigger se déclenche après UPDATE de views_count (donc après increment_product_view)
DROP TRIGGER IF EXISTS trg_log_product_view_event ON products;
CREATE TRIGGER trg_log_product_view_event
  AFTER UPDATE OF views_count ON products
  FOR EACH ROW
  WHEN (NEW.views_count > OLD.views_count)
  EXECUTE FUNCTION public.log_product_view_event();