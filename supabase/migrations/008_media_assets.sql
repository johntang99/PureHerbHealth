CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  site_id TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'media',
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'file')),
  mime_type TEXT,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, path)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_site ON media_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_store ON media_assets(store_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(media_type);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'deny_public_media_assets'
  ) THEN
    CREATE POLICY deny_public_media_assets ON media_assets
      FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
  END IF;
END $$;
