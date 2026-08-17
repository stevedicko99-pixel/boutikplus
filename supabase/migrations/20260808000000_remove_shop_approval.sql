-- Les boutiques sont publiées immédiatement ; seul le statut paused reste modérable.
UPDATE public.shops
SET status = 'active'::public.shop_status
WHERE status::text IN ('pending', 'rejected');

ALTER TABLE public.shops ALTER COLUMN status DROP DEFAULT;
DROP POLICY IF EXISTS "shops_select_policy" ON public.shops;
DROP POLICY IF EXISTS "shops_read_active" ON public.shops;

CREATE TYPE public.shop_status_without_approval AS ENUM ('active', 'paused');

ALTER TABLE public.shops
  ALTER COLUMN status TYPE public.shop_status_without_approval
  USING status::text::public.shop_status_without_approval;

DROP TYPE public.shop_status;
ALTER TYPE public.shop_status_without_approval RENAME TO shop_status;

ALTER TABLE public.shops
  ALTER COLUMN status SET DEFAULT 'active'::public.shop_status;

CREATE POLICY "shops_select_policy" ON public.shops
  FOR SELECT
  USING (
    status = 'active'::public.shop_status
    OR owner_id = auth.uid()
    OR public.is_admin()
  );
