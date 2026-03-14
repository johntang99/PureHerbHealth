-- Phase 6 depth: richer structured content metadata

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tcm_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS linked_product_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE content
SET published_at = COALESCE(published_at, created_at)
WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_type_status ON content(type, status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);
