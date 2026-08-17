-- ============================================================
-- Correctifs de sécurité : opérateurs et RPC transactionnelles
-- ============================================================

ALTER TYPE public.payment_operator ADD VALUE IF NOT EXISTS 'coris_money';
ALTER TYPE public.payment_operator ADD VALUE IF NOT EXISTS 'wave';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS coris_money_number TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS wave_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_info JSONB;

CREATE OR REPLACE FUNCTION public.set_product_images(
  p_product_id UUID,
  p_image_urls TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id = p_product_id
      AND s.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Modification non autorisée du produit %', p_product_id;
  END IF;

  DELETE FROM public.product_images WHERE product_id = p_product_id;

  IF p_image_urls IS NOT NULL AND array_length(p_image_urls, 1) > 0 THEN
    FOR i IN 1..array_length(p_image_urls, 1) LOOP
      INSERT INTO public.product_images (product_id, image_url, position)
      VALUES (p_product_id, p_image_urls[i], i - 1);
    END LOOP;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_product_images(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_images(UUID, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_order_id UUID,
  p_amount INT,
  p_operator payment_operator,
  p_proof_image_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF p_proof_image_url IS NULL
    OR btrim(p_proof_image_url) = ''
    OR p_proof_image_url ~* '^[[:space:]]*(file|content|data|blob):' THEN
    RAISE EXCEPTION 'Une URL distante valide est requise pour la preuve de paiement';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Soumission de preuve non autorisée pour la commande %', p_order_id;
  END IF;

  IF v_order.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'La commande % ne peut pas recevoir de preuve de paiement', p_order_id;
  END IF;

  INSERT INTO public.payments (order_id, amount, operator, proof_image_url, status)
  VALUES (p_order_id, p_amount, p_operator, p_proof_image_url, 'pending');

  UPDATE public.orders
  SET status = 'proof_uploaded'
  WHERE id = p_order_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_order.seller_id,
    'payment_proof_uploaded',
    'Preuve de paiement à vérifier',
    'Un acheteur a soumis une preuve de paiement pour une commande.',
    jsonb_build_object('order_id', p_order_id)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_payment_proof(UUID, INT, payment_operator, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID, INT, payment_operator, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_seller_id UUID,
  p_total_amount INT,
  p_address_id UUID,
  p_note TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF p_items IS NULL
    OR jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La commande doit contenir au moins un article';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE jsonb_typeof(item) <> 'object'
  ) THEN
    RAISE EXCEPTION 'Chaque article de la commande doit être un objet';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(product_id TEXT, quantity INT, unit_price INT)
    WHERE product_id IS NULL
      OR btrim(product_id) = ''
      OR quantity IS NULL
      OR quantity <= 0
      OR unit_price IS NULL
      OR unit_price < 0
  ) THEN
    RAISE EXCEPTION 'Article de commande invalide';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(product_id TEXT, quantity INT, unit_price INT)
    LEFT JOIN public.products p ON p.id = item.product_id::UUID
    LEFT JOIN public.shops s ON s.id = p.shop_id
    WHERE p.id IS NULL OR s.owner_id IS DISTINCT FROM p_seller_id
  ) THEN
    RAISE EXCEPTION 'Un ou plusieurs produits ne sont pas associés au vendeur indiqué';
  END IF;

  IF (
    SELECT count(DISTINCT p.shop_id)
    FROM jsonb_to_recordset(p_items) AS item(product_id TEXT)
    JOIN public.products p ON p.id = item.product_id::UUID
  ) <> 1 THEN
    RAISE EXCEPTION 'Tous les produits de la commande doivent appartenir à une seule boutique';
  END IF;

  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    total_amount,
    delivery_address_id,
    note,
    status
  )
  VALUES (
    auth.uid(),
    p_seller_id,
    p_total_amount,
    p_address_id,
    p_note,
    'pending_payment'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, variant_info)
  SELECT v_order_id, item.product_id::UUID, item.quantity, item.unit_price, item.variant_info
  FROM jsonb_to_recordset(p_items) AS item(
    product_id TEXT,
    quantity INT,
    unit_price INT,
    variant_info JSONB
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_seller_id,
    'new_order',
    'Nouvelle commande à vérifier',
    'Une nouvelle commande nécessite votre vérification avant son traitement.',
    jsonb_build_object('order_id', v_order_id)
  );

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_with_items(UUID, INT, UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(UUID, INT, UUID, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_order_payment(
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Validation de paiement non autorisée pour la commande %', p_order_id;
  END IF;

  IF v_order.status <> 'proof_uploaded'::public.order_status THEN
    RAISE EXCEPTION 'La commande % ne peut pas être validée', p_order_id;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.status <> 'pending'::public.payment_status THEN
    RAISE EXCEPTION 'Aucun paiement à valider pour la commande %', p_order_id;
  END IF;

  UPDATE public.payments
  SET status = 'validated'::public.payment_status,
      validated_at = now()
  WHERE id = v_payment.id;

  UPDATE public.orders
  SET status = 'payment_validated'::public.order_status
  WHERE id = p_order_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_order.buyer_id,
    'payment_validated',
    'Paiement confirmé',
    'Votre paiement a été confirmé par le vendeur. Votre commande va être préparée.',
    jsonb_build_object('order_id', p_order_id)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_order_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_order_payment(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_order_payment(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_reason TEXT := COALESCE(NULLIF(btrim(p_reason), ''), 'Preuve de paiement refusée par le vendeur');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Refus de paiement non autorisé pour la commande %', p_order_id;
  END IF;

  IF v_order.status <> 'proof_uploaded'::public.order_status THEN
    RAISE EXCEPTION 'La commande % ne peut pas être refusée', p_order_id;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.status <> 'pending'::public.payment_status THEN
    RAISE EXCEPTION 'Aucun paiement à refuser pour la commande %', p_order_id;
  END IF;

  UPDATE public.payments
  SET status = 'rejected'::public.payment_status,
      rejection_reason = v_reason
  WHERE id = v_payment.id;

  UPDATE public.orders
  SET status = 'cancelled'::public.order_status,
      cancellation_reason = v_reason
  WHERE id = p_order_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_order.buyer_id,
    'payment_rejected',
    'Paiement refusé',
    'Votre preuve de paiement a été refusée par le vendeur et votre commande a été annulée. Motif : ' || v_reason,
    jsonb_build_object('order_id', p_order_id, 'reason', v_reason)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_order_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_order_payment(UUID, TEXT) TO authenticated;
