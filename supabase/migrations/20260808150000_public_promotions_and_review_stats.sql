-- Limite la lecture anonyme aux promotions réellement publiables et rend
-- accessibles les seuls agrégats publics d'avis produit.
DROP POLICY IF EXISTS "promos_public_read" ON public.promotions;
DROP POLICY IF EXISTS "promos_authenticated_read" ON public.promotions;
DROP POLICY IF EXISTS "promos_owner_manage" ON public.promotions;

CREATE POLICY "promos_public_read" ON public.promotions
  FOR SELECT TO anon
  USING (
    status = 'active'
    AND start_date <= now()
    AND end_date >= now()
    AND EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = promotions.shop_id
        AND shops.status = 'active'
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.products
        WHERE products.id = promotions.product_id
          AND products.shop_id = promotions.shop_id
          AND products.status = 'available'
      )
    )
  );

CREATE POLICY "promos_authenticated_read" ON public.promotions
  FOR SELECT TO authenticated
  USING (
    (
      status = 'active'
      AND start_date <= now()
      AND end_date >= now()
      AND EXISTS (
        SELECT 1
        FROM public.shops
        WHERE shops.id = promotions.shop_id
          AND shops.status = 'active'
      )
      AND (
        product_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.products
          WHERE products.id = promotions.product_id
            AND products.shop_id = promotions.shop_id
            AND products.status = 'available'
        )
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = promotions.shop_id
        AND shops.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "promos_owner_manage" ON public.promotions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = promotions.shop_id
        AND shops.owner_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = promotions.shop_id
        AND shops.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

REVOKE EXECUTE ON FUNCTION public.get_product_review_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_review_stats(UUID) TO anon, authenticated;
