-- Métadonnées des images produit et soumission de preuve idempotente.

ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS image_code TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.product_images
  DROP CONSTRAINT IF EXISTS product_images_size_bytes_check;
ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_size_bytes_check
  CHECK (size_bytes IS NULL OR size_bytes >= 0) NOT VALID;

UPDATE public.product_images
SET image_code = COALESCE(
      image_code,
      'legacy_' || product_id::text || '_' || id::text
    ),
    storage_path = COALESCE(
      storage_path,
      NULLIF(regexp_replace(image_url, '^.*/product-images/', ''), image_url)
    ),
    mime_type = COALESCE(mime_type, 'image/jpeg')
WHERE image_code IS NULL OR storage_path IS NULL OR mime_type IS NULL;

WITH duplicate_paths AS (
  SELECT id, row_number() OVER (PARTITION BY storage_path ORDER BY created_at, id) AS occurrence
  FROM public.product_images
  WHERE storage_path IS NOT NULL
)
UPDATE public.product_images image
SET storage_path = NULL
FROM duplicate_paths duplicate
WHERE image.id = duplicate.id AND duplicate.occurrence > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_image_code
  ON public.product_images(image_code) WHERE image_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_storage_path
  ON public.product_images(storage_path) WHERE storage_path IS NOT NULL;

DROP FUNCTION IF EXISTS public.set_product_images(UUID, TEXT[]);

CREATE OR REPLACE FUNCTION public.set_product_images(
  p_product_id UUID,
  p_images JSONB
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = p_product_id AND s.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Modification non autorisée du produit %', p_product_id;
  END IF;

  IF p_images IS NULL OR jsonb_typeof(p_images) <> 'array' OR jsonb_array_length(p_images) > 10 THEN
    RAISE EXCEPTION 'La liste des images doit contenir au maximum 10 éléments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_images) image
    WHERE NULLIF(btrim(image->>'image_url'), '') IS NULL
      OR image->>'image_url' ~* '^[[:space:]]*(file|content|data|blob):'
  ) THEN
    RAISE EXCEPTION 'Une URL distante valide est requise pour chaque image';
  END IF;

  DELETE FROM public.product_images WHERE product_id = p_product_id;

  INSERT INTO public.product_images (
    product_id, image_url, image_code, storage_path, mime_type, size_bytes, position
  )
  SELECT
    p_product_id,
    image->>'image_url',
    NULLIF(image->>'image_code', ''),
    NULLIF(image->>'storage_path', ''),
    NULLIF(image->>'mime_type', ''),
    CASE WHEN image ? 'size_bytes' AND image->>'size_bytes' <> ''
      THEN (image->>'size_bytes')::BIGINT ELSE NULL END,
    ordinality - 1
  FROM jsonb_array_elements(p_images) WITH ORDINALITY AS items(image, ordinality);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_product_images(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_images(UUID, JSONB) TO authenticated;

DROP FUNCTION IF EXISTS public.submit_payment_proof(UUID, INT, public.payment_operator, TEXT);

CREATE FUNCTION public.submit_payment_proof(
  p_order_id UUID,
  p_amount INT,
  p_operator public.payment_operator,
  p_proof_image_url TEXT
)
RETURNS TABLE (
  payment_id UUID,
  payment_status public.payment_status,
  order_status public.order_status
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_created BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_proof_image_url IS NULL OR btrim(p_proof_image_url) = ''
    OR p_proof_image_url ~* '^[[:space:]]*(file|content|data|blob):' THEN
    RAISE EXCEPTION 'Une URL distante valide est requise pour la preuve de paiement';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Soumission de preuve non autorisée pour la commande %', p_order_id;
  END IF;
  IF p_amount IS DISTINCT FROM v_order.total_amount THEN
    RAISE EXCEPTION 'Le montant transmis ne correspond pas au montant de la commande';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE order_id = p_order_id FOR UPDATE;
  IF FOUND THEN
    IF v_payment.amount <> v_order.total_amount
      OR v_payment.operator <> p_operator
      OR v_payment.proof_image_url <> p_proof_image_url THEN
      RAISE EXCEPTION 'Une autre preuve de paiement est déjà enregistrée pour cette commande';
    END IF;
  ELSE
    IF v_order.status <> 'pending_payment'::public.order_status THEN
      RAISE EXCEPTION 'La commande % ne peut pas recevoir de preuve de paiement', p_order_id;
    END IF;
    INSERT INTO public.payments (order_id, amount, operator, proof_image_url, status)
    VALUES (p_order_id, v_order.total_amount, p_operator, p_proof_image_url, 'pending')
    RETURNING * INTO v_payment;
    v_created := TRUE;
    UPDATE public.orders SET status = 'proof_uploaded' WHERE id = p_order_id;
    v_order.status := 'proof_uploaded';
  END IF;

  IF v_created THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_order.seller_id,
      'payment_proof_uploaded',
      'Preuve de paiement à vérifier',
      'Un acheteur a soumis une preuve de paiement pour une commande.',
      jsonb_build_object('order_id', p_order_id)
    );
  END IF;

  RETURN QUERY SELECT v_payment.id, v_payment.status, v_order.status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_payment_proof(UUID, INT, public.payment_operator, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID, INT, public.payment_operator, TEXT) TO authenticated;
