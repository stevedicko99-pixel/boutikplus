-- ============================================================
-- V6 — Page boutique publique premium
-- Étend la table `shops` pour transformer chaque boutique en
-- un site web indépendant : slogan, contact, horaires, réseaux sociaux.
-- Toutes les colonnes sont nullable/default → rétro-compatible.
-- ============================================================

SET search_path = public;

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN shops.slogan IS 'Phrase d''accroche courte de la boutique';
COMMENT ON COLUMN shops.phone_number IS 'Numéro de téléphone (format local ou international)';
COMMENT ON COLUMN shops.whatsapp_number IS 'Numéro WhatsApp (format international sans +)';
COMMENT ON COLUMN shops.email IS 'Email de contact de la boutique';
COMMENT ON COLUMN shops.address IS 'Adresse physique complète de la boutique';
COMMENT ON COLUMN shops.opening_hours IS 'Horaires d''ouverture. Format: {"mon":{"open":"08:00","close":"18:00","closed":false},"tue":{...},"sun":{"closed":true}}';
COMMENT ON COLUMN shops.social_links IS 'Réseaux sociaux. Format: {"instagram":"@handle","tiktok":"@handle","facebook":"url","snapchat":"url"}';

-- La policy existante "shops_read_active" autorise déjà la lecture publique
-- des boutiques actives (status = 'active' OR owner_id = auth.uid() OR is_admin()).
-- Aucune modification RLS nécessaire : les nouvelles colonnes sont couvertes
-- par le SELECT * et visibles pour les visiteurs non authentifiés.
