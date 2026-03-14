-- Phase 6 depth: CMS-editable five elements metadata

CREATE TABLE IF NOT EXISTS five_elements_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL CHECK (element_id IN ('wood', 'fire', 'earth', 'metal', 'water')),
  label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  season TEXT NOT NULL,
  organs TEXT NOT NULL,
  summary TEXT NOT NULL,
  generates_element_id TEXT NOT NULL CHECK (generates_element_id IN ('wood', 'fire', 'earth', 'metal', 'water')),
  controls_element_id TEXT NOT NULL CHECK (controls_element_id IN ('wood', 'fire', 'earth', 'metal', 'water')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, element_id)
);

CREATE INDEX IF NOT EXISTS idx_five_elements_config_store_order ON five_elements_config(store_id, display_order, element_id);

ALTER TABLE five_elements_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'five_elements_config' AND policyname = 'deny_public_five_elements_config'
  ) THEN
    CREATE POLICY deny_public_five_elements_config ON five_elements_config
      FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
  END IF;
END $$;
