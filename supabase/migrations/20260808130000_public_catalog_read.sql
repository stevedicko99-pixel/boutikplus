-- Sépare la lecture publique du catalogue des accès propriétaire/admin afin que
-- le rôle anon n'ait jamais à exécuter public.is_admin().
DROP POLICY IF EXISTS "shops_select_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_read_active" ON public.shops;
DROP POLICY IF EXISTS "shops_public_read" ON public.shops;
DROP POLICY IF EXISTS "shops_authenticated_read" ON public.shops;

CREATE POLICY "shops_public_read" ON public.shops
  FOR SELECT TO anon
  USING (status = 'active'::public.shop_status);

CREATE POLICY "shops_authenticated_read" ON public.shops
  FOR SELECT TO authenticated
  USING (
    status = 'active'::public.shop_status
    OR owner_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "products_read" ON public.products;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_read" ON public.products;

CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon
  USING (status = 'available');

CREATE POLICY "products_authenticated_read" ON public.products
  FOR SELECT TO authenticated
  USING (
    status = 'available'
    OR EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = products.shop_id
        AND shops.owner_id = auth.uid()
    )
    OR public.is_admin()
  );
