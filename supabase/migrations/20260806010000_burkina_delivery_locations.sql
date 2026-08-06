ALTER TABLE public.delivery_addresses
  ADD COLUMN IF NOT EXISTS zone_id TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS landmark TEXT;

ALTER TABLE public.delivery_addresses
  DROP CONSTRAINT IF EXISTS delivery_addresses_coordinates_pair_check,
  DROP CONSTRAINT IF EXISTS delivery_addresses_latitude_check,
  DROP CONSTRAINT IF EXISTS delivery_addresses_longitude_check;

ALTER TABLE public.delivery_addresses
  ADD CONSTRAINT delivery_addresses_coordinates_pair_check
    CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT delivery_addresses_latitude_check
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT delivery_addresses_longitude_check
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

CREATE INDEX IF NOT EXISTS delivery_addresses_zone_id_idx
  ON public.delivery_addresses(zone_id);
