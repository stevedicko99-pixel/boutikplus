-- ============================================================
-- Migration V5 : Le livreur fixe SON prix à l'acceptation
-- ============================================================
-- Objectif : lorsqu'un livreur accepte une livraison, c'est LUI
-- qui fixe son tarif (en fonction de la distance, du colis, de
-- son véhicule...). Ce prix devient le montant final facturé au
-- vendeur et versé au livreur.
--
-- On ajoute 2 colonnes à `delivery_requests` :
--   • driver_offer_price INT  : prix proposé par le livreur (NULL si jamais proposé)
--   • price_set_by    TEXT  : 'seller' (défaut) | 'driver' (lorsque le livreur a fixé son prix)
-- ============================================================

-- 1. Colonne driver_offer_price : tarif proposé par le livreur
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='delivery_requests' AND column_name='driver_offer_price') THEN
    ALTER TABLE delivery_requests
      ADD COLUMN driver_offer_price INT CHECK (driver_offer_price IS NULL OR driver_offer_price >= 0);
  END IF;
END $$;

-- 2. Colonne price_set_by : indique QUI a fixé le prix final
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='delivery_requests' AND column_name='price_set_by') THEN
    ALTER TABLE delivery_requests
      ADD COLUMN price_set_by TEXT NOT NULL DEFAULT 'seller' CHECK (price_set_by IN ('seller','driver'));
  END IF;
END $$;

-- 3. Rétro-compatibilité : toutes les livraisons existantes ont leur prix fixé par le vendeur
UPDATE delivery_requests SET price_set_by = 'seller' WHERE price_set_by IS NULL;

-- 4. Index léger pour filtrer rapidement les livraisons avec offre livreur
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='idx_delivery_driver_offer') THEN
    CREATE INDEX idx_delivery_driver_offer ON delivery_requests(driver_id) WHERE driver_offer_price IS NOT NULL;
  END IF;
END $$;

-- 5. Commentaires pour la documentation
COMMENT ON COLUMN delivery_requests.driver_offer_price IS 'Prix fixé par le livreur à l''acceptation (en FCFA). NULL tant que le livreur n''a pas encore fait son offre.';
COMMENT ON COLUMN delivery_requests.price_set_by IS 'Indique qui a fixé le prix final facturé : ''seller'' (estimation initiale) ou ''driver'' (le livreur a fixé son tarif).';

-- ============================================================
-- RPC : acceptDeliveryWithPrice
--   Permet à un livreur d'accepter une livraison EN fixant SON prix.
--   Met à jour : price (= driver_offer_price), driver_offer_price,
--   price_set_by='driver', driver_id, status='accepted', accepted_at.
--   Vérifie que la livraison est bien 'pending' et que le livreur
--   n'est pas le vendeur lui-même.
-- ============================================================
CREATE OR REPLACE FUNCTION accept_delivery_with_price(
  p_delivery_id UUID,
  p_driver_user_id UUID,
  p_driver_price INT
)
RETURNS TABLE(id UUID, price INT, driver_offer_price INT, price_set_by TEXT, status delivery_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status delivery_status;
  v_seller_id UUID;
BEGIN
  IF p_driver_user_id IS NULL THEN
    RAISE EXCEPTION 'Livreur non authentifié.';
  END IF;
  IF p_driver_price IS NULL OR p_driver_price < 0 THEN
    RAISE EXCEPTION 'Le prix proposé doit être un montant positif (en FCFA).';
  END IF;

  SELECT status, seller_id INTO v_current_status, v_seller_id
    FROM delivery_requests WHERE id = p_delivery_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Livraison introuvable.';
  END IF;
  IF v_current_status <> 'pending' THEN
    RAISE EXCEPTION 'Cette livraison n''est plus disponible (statut : %).', v_current_status;
  END IF;
  IF v_seller_id = p_driver_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas livrer votre propre demande.';
  END IF;

  UPDATE delivery_requests
    SET
      driver_id         = p_driver_user_id,
      driver_offer_price = p_driver_price,
      price             = p_driver_price,
      price_set_by      = 'driver',
      status            = 'accepted',
      accepted_at       = now(),
      updated_at        = now()
    WHERE id = p_delivery_id;

  RETURN QUERY
    SELECT id, price, driver_offer_price, price_set_by, status
      FROM delivery_requests WHERE id = p_delivery_id;
END;
$$;

ALTER FUNCTION accept_delivery_with_price(UUID, UUID, INT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION accept_delivery_with_price(UUID, UUID, INT) TO authenticated, service_role;
