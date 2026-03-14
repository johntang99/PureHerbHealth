-- Phase 5: Multi-store, Stripe Connect, and store analytics

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_company_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS order_number_prefix TEXT,
  ADD COLUMN IF NOT EXISTS revenue_share_platform_pct NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_practitioner_name TEXT,
  ADD COLUMN IF NOT EXISTS ai_practitioner_title TEXT,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS ai_booking_url TEXT;

UPDATE stores
SET is_active = COALESCE(enabled, TRUE)
WHERE is_active IS DISTINCT FROM COALESCE(enabled, TRUE);

-- Keep old and new onboarding flags aligned
UPDATE stores
SET stripe_connect_onboarded = stripe_onboarding_complete
WHERE stripe_connect_onboarded IS DISTINCT FROM stripe_onboarding_complete;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS owner_store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS practitioner_note TEXT,
  ADD COLUMN IF NOT EXISTS practitioner_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_badges JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS store_order_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  store_revenue_cents INTEGER NOT NULL DEFAULT 0,
  platform_revenue_cents INTEGER NOT NULL DEFAULT 0,
  revenue_share_pct NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  stripe_transfer_id TEXT,
  transfer_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_details_store ON store_order_details(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS store_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  platform_revenue_cents INTEGER NOT NULL DEFAULT 0,
  unique_customers INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_order_value_cents INTEGER NOT NULL DEFAULT 0,
  top_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_store_analytics_daily_store_date ON store_analytics_daily(store_id, date DESC);

CREATE OR REPLACE FUNCTION increment_store_analytics(
  p_store_id UUID,
  p_date DATE,
  p_revenue_cents INTEGER,
  p_platform_revenue_cents INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO store_analytics_daily (
    store_id, date, orders_count, revenue_cents, platform_revenue_cents, avg_order_value_cents
  )
  VALUES (
    p_store_id, p_date, 1, p_revenue_cents, p_platform_revenue_cents, p_revenue_cents
  )
  ON CONFLICT (store_id, date)
  DO UPDATE SET
    orders_count = store_analytics_daily.orders_count + 1,
    revenue_cents = store_analytics_daily.revenue_cents + EXCLUDED.revenue_cents,
    platform_revenue_cents = store_analytics_daily.platform_revenue_cents + EXCLUDED.platform_revenue_cents,
    avg_order_value_cents = (store_analytics_daily.revenue_cents + EXCLUDED.revenue_cents) /
      NULLIF(store_analytics_daily.orders_count + 1, 0),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
