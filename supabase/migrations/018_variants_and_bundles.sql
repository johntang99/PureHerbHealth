-- Product type: standard (default) or bundle
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (product_type IN ('standard', 'bundle'));

-- Bundle items: stored as JSONB array on the bundle product
-- Format: [{"product_id": "uuid", "product_name": "...", "quantity": 2}]
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bundle_items JSONB;

-- Product variants (same product, different qty / pack options)
CREATE TABLE IF NOT EXISTS product_variants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,          -- "Single", "3-Pack", "6-Pack Combo"
  name_zh      TEXT,
  price_cents  INTEGER NOT NULL,
  compare_at_price_cents INTEGER,      -- strike-through "was" price
  sku          TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants(product_id);

-- Only one default variant per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_default
  ON product_variants(product_id)
  WHERE is_default = TRUE;
