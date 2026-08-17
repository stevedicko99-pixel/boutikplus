-- Sépare la lecture publique des promotions actives des accès propriétaire/admin
-- afin que le rôle anon n'ait jamais à exécuter public.is_admin().
DROP POLICY IF EXISTS "promos_read_active" ON public.promotions;
DROP POLICY IF EXISTS "promos_public_read" ON public.promotions;
DROP POLICY IF EXISTS "promos_authenticated_read" ON public.promotions;

CREATE POLICY "promos_public_read" ON public.promotions
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "promos_authenticated_read" ON public.promotions
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1
      FROM public.shops
      WHERE shops.id = promotions.shop_id
        AND shops.owner_id = auth.uid()
    )
    OR public.is_admin()
  );
