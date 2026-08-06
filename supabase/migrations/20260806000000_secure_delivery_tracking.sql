-- Socle sécurisé du suivi de livraison.

ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_amount INT,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_pickup_lat_check' AND conrelid = 'public.delivery_requests'::regclass) THEN
    ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_pickup_lat_check CHECK (pickup_lat IS NULL OR pickup_lat BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_pickup_lng_check' AND conrelid = 'public.delivery_requests'::regclass) THEN
    ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_pickup_lng_check CHECK (pickup_lng IS NULL OR pickup_lng BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_destination_lat_check' AND conrelid = 'public.delivery_requests'::regclass) THEN
    ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_destination_lat_check CHECK (destination_lat IS NULL OR destination_lat BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_destination_lng_check' AND conrelid = 'public.delivery_requests'::regclass) THEN
    ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_destination_lng_check CHECK (destination_lng IS NULL OR destination_lng BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_refund_amount_check' AND conrelid = 'public.delivery_requests'::regclass) THEN
    ALTER TABLE public.delivery_requests ADD CONSTRAINT delivery_requests_refund_amount_check CHECK (refund_amount IS NULL OR refund_amount >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_order_id ON public.delivery_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_buyer_id ON public.delivery_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver_status ON public.delivery_requests(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_created_at ON public.delivery_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL UNIQUE REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m DOUBLE PRECISION CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  heading DOUBLE PRECISION CHECK (heading IS NULL OR heading >= 0 AND heading < 360),
  speed_mps DOUBLE PRECISION CHECK (speed_mps IS NULL OR speed_mps >= 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON public.driver_locations(recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (length(btrim(event_type)) > 0),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_status delivery_status,
  to_status delivery_status,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_created ON public.delivery_events(delivery_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (length(btrim(category)) > 0),
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_incidents_delivery_id ON public.delivery_incidents(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_incidents_status_created ON public.delivery_incidents(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_messages_delivery_created ON public.delivery_messages(delivery_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role::text IN ('admin', 'super_admin')
           OR COALESCE(to_jsonb(p)->>'primary_role', '') IN ('admin', 'super_admin')
           OR COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(to_jsonb(p)->'roles', '[]'::jsonb))), ARRAY[]::text[])
              && ARRAY['admin', 'super_admin']::text[])
  );
$$;

CREATE OR REPLACE FUNCTION public.is_delivery_participant(p_delivery_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_requests d
    WHERE d.id = p_delivery_id
      AND p_user_id IN (d.buyer_id, d.seller_id, d.driver_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_pending_delivery(
  p_pickup_city TEXT,
  p_package_weight DOUBLE PRECISION,
  p_seller_id UUID,
  p_buyer_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() IS DISTINCT FROM p_seller_id
    AND auth.uid() IS DISTINCT FROM p_buyer_id
    AND EXISTS (
      SELECT 1
      FROM public.driver_profiles dp
      WHERE dp.user_id = auth.uid()
        AND dp.is_available
        AND lower(btrim(dp.city)) = lower(btrim(p_pickup_city))
        AND dp.max_weight >= p_package_weight
    );
$$;

CREATE OR REPLACE FUNCTION public.validate_delivery_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  IF NEW.order_id IS NOT NULL THEN
    SELECT o.buyer_id, o.seller_id INTO v_buyer_id, v_seller_id
    FROM public.orders o WHERE o.id = NEW.order_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
    IF NEW.seller_id IS DISTINCT FROM v_seller_id THEN RAISE EXCEPTION 'Le vendeur ne correspond pas à la commande'; END IF;
    IF NEW.buyer_id IS NULL THEN NEW.buyer_id := v_buyer_id;
    ELSIF NEW.buyer_id IS DISTINCT FROM v_buyer_id THEN RAISE EXCEPTION 'L''acheteur ne correspond pas à la commande'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_delivery_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.delivery_events(delivery_id, event_type, actor_id, to_status, metadata)
  VALUES (NEW.id, 'created', auth.uid(), NEW.status, jsonb_build_object('order_id', NEW.order_id));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_delivery_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Les événements de livraison sont immuables';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_delivery_incident_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_request_validate ON public.delivery_requests;
CREATE TRIGGER delivery_request_validate BEFORE INSERT OR UPDATE OF order_id, buyer_id, seller_id ON public.delivery_requests FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_request();
DROP TRIGGER IF EXISTS delivery_request_created_event ON public.delivery_requests;
CREATE TRIGGER delivery_request_created_event AFTER INSERT ON public.delivery_requests FOR EACH ROW EXECUTE FUNCTION public.log_delivery_created();
DROP TRIGGER IF EXISTS delivery_events_immutable ON public.delivery_events;
CREATE TRIGGER delivery_events_immutable BEFORE UPDATE OR DELETE ON public.delivery_events FOR EACH ROW EXECUTE FUNCTION public.reject_delivery_event_mutation();
DROP TRIGGER IF EXISTS delivery_incidents_updated_at ON public.delivery_incidents;
CREATE TRIGGER delivery_incidents_updated_at BEFORE UPDATE ON public.delivery_incidents FOR EACH ROW EXECUTE FUNCTION public.set_delivery_incident_updated_at();

ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deliveries_read_parties" ON public.delivery_requests;
DROP POLICY IF EXISTS "deliveries_insert_seller" ON public.delivery_requests;
DROP POLICY IF EXISTS "deliveries_update_parties" ON public.delivery_requests;
DROP POLICY IF EXISTS "deliveries_delete_seller" ON public.delivery_requests;
DROP POLICY IF EXISTS deliveries_participants_read ON public.delivery_requests;
CREATE POLICY deliveries_participants_read ON public.delivery_requests FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR driver_id = auth.uid()
    OR public.is_admin()
    OR (
      status = 'pending'
      AND public.can_view_pending_delivery(pickup_city, package_weight, seller_id, buyer_id)
    )
  );
DROP POLICY IF EXISTS deliveries_seller_insert ON public.delivery_requests;
CREATE POLICY deliveries_seller_insert ON public.delivery_requests FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND (buyer_id IS NULL OR buyer_id <> auth.uid())
    AND driver_id IS NULL
    AND status = 'pending'
  );

DROP POLICY IF EXISTS driver_locations_participants_read ON public.driver_locations;
CREATE POLICY driver_locations_participants_read ON public.driver_locations FOR SELECT TO authenticated
  USING (public.is_delivery_participant(delivery_id) OR public.is_admin());
DROP POLICY IF EXISTS delivery_events_participants_read ON public.delivery_events;
CREATE POLICY delivery_events_participants_read ON public.delivery_events FOR SELECT TO authenticated
  USING (public.is_delivery_participant(delivery_id) OR public.is_admin());
DROP POLICY IF EXISTS delivery_incidents_participants_read ON public.delivery_incidents;
CREATE POLICY delivery_incidents_participants_read ON public.delivery_incidents FOR SELECT TO authenticated
  USING (public.is_delivery_participant(delivery_id) OR public.is_admin());
DROP POLICY IF EXISTS delivery_incidents_admin_update ON public.delivery_incidents;
CREATE POLICY delivery_incidents_admin_update ON public.delivery_incidents FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS delivery_messages_participants_read ON public.delivery_messages;
CREATE POLICY delivery_messages_participants_read ON public.delivery_messages FOR SELECT TO authenticated
  USING (public.is_delivery_participant(delivery_id) OR public.is_admin());
DROP POLICY IF EXISTS delivery_messages_participants_insert ON public.delivery_messages;
CREATE POLICY delivery_messages_participants_insert ON public.delivery_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_delivery_participant(delivery_id));
DROP POLICY IF EXISTS delivery_messages_participants_update ON public.delivery_messages;
CREATE POLICY delivery_messages_participants_update ON public.delivery_messages FOR UPDATE TO authenticated
  USING (public.is_delivery_participant(delivery_id))
  WITH CHECK (public.is_delivery_participant(delivery_id));

CREATE OR REPLACE FUNCTION public.accept_delivery_with_price(p_delivery_id UUID, p_driver_user_id UUID, p_driver_price INT)
RETURNS TABLE(id UUID, price INT, driver_offer_price INT, price_set_by TEXT, status delivery_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_delivery public.delivery_requests%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_driver_user_id IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Identité livreur invalide'; END IF;
  IF p_driver_price IS NULL OR p_driver_price < 0 THEN RAISE EXCEPTION 'Prix invalide'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.driver_profiles dp WHERE dp.user_id = v_actor) THEN RAISE EXCEPTION 'Profil livreur requis'; END IF;

  SELECT * INTO v_delivery FROM public.delivery_requests WHERE delivery_requests.id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Livraison introuvable'; END IF;
  IF v_delivery.status <> 'pending' THEN RAISE EXCEPTION 'Livraison indisponible'; END IF;
  IF v_delivery.seller_id = v_actor OR v_delivery.buyer_id = v_actor THEN RAISE EXCEPTION 'Un participant ne peut pas accepter cette livraison comme livreur'; END IF;

  UPDATE public.delivery_requests d SET driver_id = v_actor, driver_offer_price = p_driver_price,
    price = p_driver_price, price_set_by = 'driver', status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE d.id = p_delivery_id;
  INSERT INTO public.delivery_events(delivery_id, event_type, actor_id, from_status, to_status, metadata)
  VALUES (p_delivery_id, 'accepted', v_actor, v_delivery.status, 'accepted', jsonb_build_object('price', p_driver_price));

  INSERT INTO public.notifications(user_id, type, title, body, data)
  SELECT participant_id, 'delivery_status', 'Livreur assigné',
         'Un livreur a accepté la livraison.',
         jsonb_build_object('delivery_id', p_delivery_id, 'status', 'accepted')
  FROM (SELECT DISTINCT unnest(ARRAY[v_delivery.buyer_id, v_delivery.seller_id]) AS participant_id) p
  WHERE participant_id IS NOT NULL;

  RETURN QUERY SELECT d.id, d.price, d.driver_offer_price, d.price_set_by, d.status FROM public.delivery_requests d WHERE d.id = p_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_delivery(p_delivery_id UUID, p_action TEXT, p_reason TEXT DEFAULT NULL)
RETURNS public.delivery_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_delivery public.delivery_requests%ROWTYPE;
  v_old_status delivery_status;
  v_new_status delivery_status;
  v_title TEXT;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  SELECT * INTO v_delivery FROM public.delivery_requests d WHERE d.id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Livraison introuvable'; END IF;
  v_old_status := v_delivery.status;

  CASE p_action
    WHEN 'start' THEN
      IF v_delivery.status <> 'accepted' OR v_delivery.driver_id <> v_actor THEN RAISE EXCEPTION 'Transition start non autorisée'; END IF;
      v_new_status := 'in_progress'; v_title := 'Livraison démarrée';
    WHEN 'deliver' THEN
      IF v_delivery.status <> 'in_progress' OR v_delivery.driver_id <> v_actor THEN RAISE EXCEPTION 'Transition deliver non autorisée'; END IF;
      v_new_status := 'delivered'; v_title := 'Livraison terminée';
    WHEN 'cancel' THEN
      IF v_delivery.status NOT IN ('pending', 'accepted') OR NOT (v_actor IN (v_delivery.buyer_id, v_delivery.seller_id, v_delivery.driver_id) OR public.is_admin()) THEN RAISE EXCEPTION 'Transition cancel non autorisée'; END IF;
      IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'Motif d''annulation requis'; END IF;
      v_new_status := 'cancelled'; v_title := 'Livraison annulée';
    WHEN 'refund' THEN
      IF v_delivery.status NOT IN ('cancelled', 'delivered') OR NOT public.is_admin() THEN RAISE EXCEPTION 'Transition refund non autorisée'; END IF;
      IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN RAISE EXCEPTION 'Motif de remboursement requis'; END IF;
      v_new_status := 'refunded'; v_title := 'Livraison remboursée';
    ELSE RAISE EXCEPTION 'Action inconnue';
  END CASE;

  UPDATE public.delivery_requests d SET status = v_new_status, updated_at = now(),
    started_at = CASE WHEN v_new_status = 'in_progress' THEN now() ELSE d.started_at END,
    delivered_at = CASE WHEN v_new_status = 'delivered' THEN now() ELSE d.delivered_at END,
    cancellation_reason = CASE WHEN v_new_status = 'cancelled' THEN p_reason ELSE d.cancellation_reason END,
    cancelled_at = CASE WHEN v_new_status = 'cancelled' THEN now() ELSE d.cancelled_at END,
    cancelled_by = CASE WHEN v_new_status = 'cancelled' THEN v_actor ELSE d.cancelled_by END,
    refund_reason = CASE WHEN v_new_status = 'refunded' THEN p_reason ELSE d.refund_reason END,
    refunded_at = CASE WHEN v_new_status = 'refunded' THEN now() ELSE d.refunded_at END
  WHERE d.id = p_delivery_id RETURNING * INTO v_delivery;

  IF v_delivery.order_id IS NOT NULL AND v_new_status IN ('in_progress', 'delivered') THEN
    UPDATE public.orders SET status = CASE WHEN v_new_status = 'in_progress' THEN 'in_delivery'::order_status ELSE 'delivered'::order_status END, updated_at = now()
    WHERE id = v_delivery.order_id;
  END IF;

  INSERT INTO public.delivery_events(delivery_id, event_type, actor_id, from_status, to_status, metadata)
  VALUES (p_delivery_id, p_action, v_actor, v_old_status, v_new_status,
          CASE WHEN p_reason IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('reason', p_reason) END);

  INSERT INTO public.notifications(user_id, type, title, body, data)
  SELECT participant_id, 'delivery_status', v_title, 'Le statut de la livraison a été mis à jour.',
         jsonb_build_object('delivery_id', p_delivery_id, 'status', v_new_status)
  FROM (SELECT DISTINCT unnest(ARRAY[v_delivery.buyer_id, v_delivery.seller_id, v_delivery.driver_id]) AS participant_id) p
  WHERE participant_id IS NOT NULL;
  RETURN v_delivery;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_driver_location(p_delivery_id UUID, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION,
  p_accuracy_m DOUBLE PRECISION DEFAULT NULL, p_heading DOUBLE PRECISION DEFAULT NULL, p_speed_mps DOUBLE PRECISION DEFAULT NULL,
  p_recorded_at TIMESTAMPTZ DEFAULT now())
RETURNS public.driver_locations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor UUID := auth.uid(); v_result public.driver_locations%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentification requise'; END IF;
  IF p_latitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude IS NULL OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Coordonnées invalides'; END IF;
  IF p_accuracy_m < 0 OR p_heading < 0 OR p_heading >= 360 OR p_speed_mps < 0 THEN RAISE EXCEPTION 'Mesures de localisation invalides'; END IF;
  IF p_recorded_at IS NULL OR p_recorded_at > now() + interval '5 minutes' THEN RAISE EXCEPTION 'Horodatage invalide'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.delivery_requests d WHERE d.id = p_delivery_id AND d.driver_id = v_actor AND d.status = 'in_progress') THEN RAISE EXCEPTION 'Course active introuvable'; END IF;

  INSERT INTO public.driver_locations(delivery_id, driver_id, latitude, longitude, accuracy_m, heading, speed_mps, recorded_at, received_at)
  VALUES (p_delivery_id, v_actor, p_latitude, p_longitude, p_accuracy_m, p_heading, p_speed_mps, p_recorded_at, now())
  ON CONFLICT (delivery_id) DO UPDATE SET driver_id = EXCLUDED.driver_id, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    accuracy_m = EXCLUDED.accuracy_m, heading = EXCLUDED.heading, speed_mps = EXCLUDED.speed_mps,
    recorded_at = EXCLUDED.recorded_at, received_at = now()
  WHERE public.driver_locations.recorded_at <= EXCLUDED.recorded_at RETURNING * INTO v_result;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Position plus ancienne que la position courante'; END IF;
  UPDATE public.delivery_requests SET last_location_at = now() WHERE id = p_delivery_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_delivery_incident(p_delivery_id UUID, p_category TEXT, p_description TEXT)
RETURNS public.delivery_incidents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor UUID := auth.uid(); v_result public.delivery_incidents%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_delivery_participant(p_delivery_id, v_actor) THEN RAISE EXCEPTION 'Participant requis'; END IF;
  IF p_category IS NULL OR length(btrim(p_category)) = 0 OR p_description IS NULL OR length(btrim(p_description)) = 0 THEN RAISE EXCEPTION 'Catégorie et description requises'; END IF;
  INSERT INTO public.delivery_incidents(delivery_id, reported_by, category, description)
  VALUES (p_delivery_id, v_actor, btrim(p_category), btrim(p_description)) RETURNING * INTO v_result;
  INSERT INTO public.delivery_events(delivery_id, event_type, actor_id, metadata)
  VALUES (p_delivery_id, 'incident_reported', v_actor, jsonb_build_object('incident_id', v_result.id, 'category', v_result.category));
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_delivery_incident(p_incident_id UUID, p_status TEXT, p_resolution TEXT, p_assigned_admin_id UUID DEFAULT NULL)
RETURNS public.delivery_incidents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor UUID := auth.uid(); v_result public.delivery_incidents%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrateur requis'; END IF;
  IF p_status NOT IN ('investigating', 'resolved', 'rejected') THEN RAISE EXCEPTION 'Statut incident invalide'; END IF;
  IF p_status IN ('resolved', 'rejected') AND (p_resolution IS NULL OR length(btrim(p_resolution)) = 0) THEN RAISE EXCEPTION 'Résolution requise'; END IF;
  UPDATE public.delivery_incidents SET status = p_status, resolution = p_resolution,
    assigned_admin_id = COALESCE(p_assigned_admin_id, v_actor), resolved_at = CASE WHEN p_status IN ('resolved', 'rejected') THEN now() ELSE NULL END
  WHERE id = p_incident_id RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incident introuvable'; END IF;
  INSERT INTO public.delivery_events(delivery_id, event_type, actor_id, metadata)
  VALUES (v_result.delivery_id, 'incident_' || p_status, v_actor, jsonb_build_object('incident_id', v_result.id));
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_delivery_operations_summary()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'Administrateur requis'; END IF;
  RETURN jsonb_build_object(
    'deliveries_by_status', (SELECT COALESCE(jsonb_object_agg(status::text, total), '{}'::jsonb) FROM (SELECT status, count(*) total FROM public.delivery_requests GROUP BY status) s),
    'open_incidents', (SELECT count(*) FROM public.delivery_incidents WHERE status IN ('open', 'investigating')),
    'active_deliveries', (SELECT count(*) FROM public.delivery_requests WHERE status = 'in_progress'),
    'stale_locations', (SELECT count(*) FROM public.delivery_requests WHERE status = 'in_progress' AND (last_location_at IS NULL OR last_location_at < now() - interval '10 minutes')),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON TABLE public.driver_locations, public.delivery_events, public.delivery_incidents, public.delivery_messages FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.driver_locations, public.delivery_events, public.delivery_incidents, public.delivery_messages TO authenticated;
GRANT INSERT ON TABLE public.delivery_messages TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.delivery_messages TO authenticated;
GRANT UPDATE ON TABLE public.delivery_incidents TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin(), public.is_delivery_participant(UUID, UUID),
  public.can_view_pending_delivery(TEXT, DOUBLE PRECISION, UUID, UUID), public.validate_delivery_request(),
  public.log_delivery_created(), public.reject_delivery_event_mutation(), public.set_delivery_incident_updated_at(),
  public.accept_delivery_with_price(UUID, UUID, INT), public.transition_delivery(UUID, TEXT, TEXT),
  public.update_driver_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ),
  public.report_delivery_incident(UUID, TEXT, TEXT), public.resolve_delivery_incident(UUID, TEXT, TEXT, UUID), public.get_delivery_operations_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(), public.is_delivery_participant(UUID, UUID), public.accept_delivery_with_price(UUID, UUID, INT),
  public.transition_delivery(UUID, TEXT, TEXT), public.update_driver_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ),
  public.report_delivery_incident(UUID, TEXT, TEXT), public.resolve_delivery_incident(UUID, TEXT, TEXT, UUID), public.get_delivery_operations_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_delivery_with_price(UUID, UUID, INT), public.transition_delivery(UUID, TEXT, TEXT),
  public.update_driver_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ),
  public.report_delivery_incident(UUID, TEXT, TEXT), public.resolve_delivery_incident(UUID, TEXT, TEXT, UUID) TO service_role;

DO $$
DECLARE v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['driver_locations', 'delivery_events', 'delivery_incidents', 'delivery_messages'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = v_table
    ) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table); END IF;
  END LOOP;
END $$;
