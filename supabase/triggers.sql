-- ============================================================
-- Boutikplus — Triggers complémentaires
-- À exécuter APRÈS schema.sql et policies.sql
-- Contient : auto-slug share_links, décrément stock, MAJ rating livreur,
--            notification auto sur message, incrément uses_count discount_codes
-- ============================================================

-- ============================================================
-- 1. Auto-génération du slug pour share_links (si non fourni)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_share_slug()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;

  -- Base : nom de la boutique + source (ex: "faso-fashion-wa")
  base := LOWER(COALESCE(
    (SELECT name FROM shops WHERE id = NEW.shop_id),
    'shop'
  ));
  base := REGEXP_REPLACE(base, '[^a-z0-9]+', '-', 'g');
  base := TRIM(BOTH '-' FROM base);
  IF LENGTH(base) > 20 THEN
    base := LEFT(base, 20);
  END IF;

  candidate := base || '-' || LEFT(NEW.source::text, 2);
  candidate := REGEXP_REPLACE(candidate, '[^a-z0-9-]+', '', 'g');

  -- Garantit l'unicité
  LOOP
    counter := counter + 1;
    IF NOT EXISTS (SELECT 1 FROM share_links WHERE slug = candidate) THEN
      EXIT;
    END IF;
    candidate := base || '-' || counter::text;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS share_links_generate_slug ON share_links;
CREATE TRIGGER share_links_generate_slug
  BEFORE INSERT ON share_links
  FOR EACH ROW EXECUTE FUNCTION public.generate_share_slug();

-- ============================================================
-- 2. Décrément automatique du stock produit lors de la création
--    d'une commande (sur INSERT dans order_items)
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ordered_qty INT;
  current_stock INT;
  product_status_val product_status;
BEGIN
  SELECT stock, status INTO current_stock, product_status_val
  FROM products WHERE id = NEW.product_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produit % introuvable', NEW.product_id;
  END IF;

  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuffisant pour le produit % (demandé: %, disponible: %)',
      NEW.product_id, NEW.quantity, current_stock;
  END IF;

  UPDATE products
  SET stock = stock - NEW.quantity,
      status = CASE WHEN stock - NEW.quantity = 0 THEN 'out_of_stock' ELSE status END
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_decrement_stock ON order_items;
CREATE TRIGGER order_items_decrement_stock
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_order();

-- ============================================================
-- 3. Remise en stock si commande annulée (sur UPDATE de orders)
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Si le statut passe à 'cancelled' et qu'il ne l'était pas avant
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE products
    SET stock = stock + oi.quantity,
        status = CASE
          WHEN stock + oi.quantity > 0 THEN 'available'
          ELSE status
        END
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = products.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_restore_stock ON orders;
CREATE TRIGGER orders_restore_stock
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();

-- ============================================================
-- 4. Mise à jour automatique du rating et total_deliveries
--    du livreur lorsqu'un avis est déposé (delivery_reviews)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  drv_user_id UUID;
  avg_rating NUMERIC;
  total_reviews INT;
BEGIN
  SELECT driver_id INTO drv_user_id
  FROM delivery_requests WHERE id = NEW.delivery_id;

  IF drv_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT AVG(rating), COUNT(*) INTO avg_rating, total_reviews
  FROM delivery_reviews dr
  JOIN delivery_requests dreq ON dreq.id = dr.delivery_id
  WHERE dreq.driver_id = drv_user_id;

  UPDATE driver_profiles
  SET rating = COALESCE(avg_rating, 0),
      total_deliveries = COALESCE(total_reviews, 0)
  WHERE user_id = drv_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_reviews_update_rating ON delivery_reviews;
CREATE TRIGGER delivery_reviews_update_rating
  AFTER INSERT OR UPDATE ON delivery_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating();

-- ============================================================
-- 5. Notification automatique au destinataire d'un message
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  shop_name TEXT;
BEGIN
  SELECT
    CASE WHEN c.buyer_id = NEW.sender_id THEN c.seller_id ELSE c.buyer_id END
  INTO recipient_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    recipient_id,
    'new_message',
    COALESCE(sender_name, 'Nouveau message'),
    LEFT(COALESCE(NEW.content, '📷 Photo'), 100),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_recipient ON messages;
CREATE TRIGGER messages_notify_recipient
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- ============================================================
-- 6. Incrémentation de uses_count + statut 'exhausted' pour
--    discount_codes lors d'une conversion (campaign_events)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_discount_usage()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Seulement sur un événement de conversion lié à un code promo
  IF NEW.event_type = 'conversion' AND NEW.discount_code_id IS NOT NULL THEN
    UPDATE discount_codes
    SET uses_count = uses_count + 1,
        status = CASE
          WHEN max_uses > 0 AND uses_count + 1 >= max_uses THEN 'exhausted'
          ELSE status
        END
    WHERE id = NEW.discount_code_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_events_increment_usage ON campaign_events;
CREATE TRIGGER campaign_events_increment_usage
  AFTER INSERT ON campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.increment_discount_usage();

-- ============================================================
-- 7. Incrémentation des compteurs sur share_links
--    (views_count, clicks_count, conversions_count, revenue_total)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_share_link_counters()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.share_link_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE share_links SET
    views_count = views_count + CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
    clicks_count = clicks_count + CASE WHEN NEW.event_type = 'click' THEN 1 ELSE 0 END,
    conversions_count = conversions_count + CASE WHEN NEW.event_type = 'conversion' THEN 1 ELSE 0 END,
    revenue_total = revenue_total + CASE
      WHEN NEW.event_type = 'conversion' AND NEW.amount IS NOT NULL THEN NEW.amount
      ELSE 0
    END
  WHERE id = NEW.share_link_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_events_update_counters ON campaign_events;
CREATE TRIGGER campaign_events_update_counters
  AFTER INSERT ON campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.update_share_link_counters();
