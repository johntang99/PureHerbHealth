-- Product detail markdown sections for richer PDP tabs

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description_markdown TEXT,
  ADD COLUMN IF NOT EXISTS description_markdown_zh TEXT,
  ADD COLUMN IF NOT EXISTS tcm_guide_markdown TEXT,
  ADD COLUMN IF NOT EXISTS tcm_guide_markdown_zh TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_markdown TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_markdown_zh TEXT,
  ADD COLUMN IF NOT EXISTS usage_markdown TEXT,
  ADD COLUMN IF NOT EXISTS usage_markdown_zh TEXT;
