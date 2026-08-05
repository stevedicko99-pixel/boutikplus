-- ============================================================
-- FIX : Ajout des colonnes manquantes (opérateurs paiement + vérification)
-- ============================================================

-- Shops : opérateurs Mobile Money
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'coris_money_number'
  ) THEN
    ALTER TABLE shops ADD COLUMN coris_money_number TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'wave_number'
  ) THEN
    ALTER TABLE shops ADD COLUMN wave_number TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE shops ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE shops ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE shops ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE shops ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Payments et Orders : motifs de rejet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE payments ADD COLUMN rejection_reason TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- Étendre le type shop_status si besoin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_status') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shop_status')
        AND enumlabel = 'pending'
    ) THEN
      ALTER TYPE shop_status ADD VALUE IF NOT EXISTS 'pending';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'shop_status')
        AND enumlabel = 'rejected'
    ) THEN
      ALTER TYPE shop_status ADD VALUE IF NOT EXISTS 'rejected';
    END IF;
  END IF;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_shops_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_shops_updated_at ON public.shops;
CREATE TRIGGER set_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.set_shops_updated_at();

-- Politique RLS pour les boutiques en attente
DROP POLICY IF EXISTS "shops_select_policy" ON public.shops;
CREATE POLICY "shops_select_policy" ON public.shops
  FOR SELECT
  USING (
    status = 'active'
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
