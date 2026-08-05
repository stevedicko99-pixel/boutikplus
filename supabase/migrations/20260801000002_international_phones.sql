-- ============================================================
-- Boutikplus — Migration V2 : Téléphones internationaux
-- ============================================================
-- Contexte : avant cette migration, le validateur côté client
-- n'autorisait QUE les numéros du Burkina Faso (+226). Pour les
-- jeunes vendeurs internationaux (Chine 🇨🇳, Bénin, Sénégal, etc.)
-- on :
--   1. N'AJOUTE AUCUNE CONTRAINTE CHECK SQL (garder flexible)
--   2. Normalise les anciens numéros de la table `profiles` en
--      format E.164 (+indicatif numéro) :
--        - 8 chiffres commençant par 5/6/7 (BF mobile) → +226 prefix
--        - 00226xxx → +226xxx
--        - +226xxx (OK, ne rien faire)
--   3. De même pour les adresses (contact_phone), shop
--      (orange_money_number / moov_money_number).
-- ============================================================

-- ---------- 2.1 Normalisation `profiles.phone` ----------
UPDATE public.profiles
SET phone =
  CASE
    -- Numéro déjà en format international (+) → on garde
    WHEN phone LIKE '+%' THEN phone
    -- 00226xxxxxx → +226xxxxxx
    WHEN phone LIKE '00226%' THEN '+' || substr(phone, 3)
    -- 8 chiffres commençant par 5/6/7 (mobile BF) → ajouter +226
    WHEN phone ~ '^[5-7]\d{7}$' THEN '+226' || phone
    -- 00xxx autre → +xxx
    WHEN phone LIKE '00%' AND length(phone) >= 12 THEN '+' || substr(phone, 3)
    ELSE phone
  END
WHERE phone IS NOT NULL;

-- ---------- 2.2 Normalisation `addresses.contact_phone` ----------
UPDATE public.addresses
SET contact_phone =
  CASE
    WHEN contact_phone LIKE '+%' THEN contact_phone
    WHEN contact_phone LIKE '00226%' THEN '+' || substr(contact_phone, 3)
    WHEN contact_phone ~ '^[5-7]\d{7}$' THEN '+226' || contact_phone
    WHEN contact_phone LIKE '00%' AND length(contact_phone) >= 12 THEN '+' || substr(contact_phone, 3)
    ELSE contact_phone
  END
WHERE contact_phone IS NOT NULL;

-- ---------- 2.3 Normalisation `shops.orange_money_number` ----------
UPDATE public.shops
SET orange_money_number =
  CASE
    WHEN orange_money_number IS NULL THEN NULL
    WHEN orange_money_number LIKE '+%' THEN orange_money_number
    WHEN orange_money_number LIKE '00226%' THEN '+' || substr(orange_money_number, 3)
    WHEN orange_money_number ~ '^[5-7]\d{7}$' THEN '+226' || orange_money_number
    WHEN orange_money_number LIKE '00%' AND length(orange_money_number) >= 12 THEN '+' || substr(orange_money_number, 3)
    ELSE orange_money_number
  END;

-- ---------- 2.4 Normalisation `shops.moov_money_number` ----------
UPDATE public.shops
SET moov_money_number =
  CASE
    WHEN moov_money_number IS NULL THEN NULL
    WHEN moov_money_number LIKE '+%' THEN moov_money_number
    WHEN moov_money_number LIKE '00226%' THEN '+' || substr(moov_money_number, 3)
    WHEN moov_money_number ~ '^[5-7]\d{7}$' THEN '+226' || moov_money_number
    WHEN moov_money_number LIKE '00%' AND length(moov_money_number) >= 12 THEN '+' || substr(moov_money_number, 3)
    ELSE moov_money_number
  END;

-- ---------- 3. COMMENTAIRES DE DOCUMENTATION ----------
COMMENT ON COLUMN public.profiles.phone IS 'Numéro de téléphone au format E.164 : +indicatif numéro. Exemples : +8613800138000 (Chine), +22670123456 (BF). Aucun CHECK SQL — la validation se fait côté client pour rester international-friendly.';
COMMENT ON COLUMN public.addresses.contact_phone IS 'Téléphone de livraison en format E.164 international.';
COMMENT ON COLUMN public.shops.orange_money_number IS 'Numéro Orange Money (E.164) du vendeur pour paiement mobile.';
COMMENT ON COLUMN public.shops.moov_money_number IS 'Numéro Moov Money (E.164) du vendeur pour paiement mobile.';
