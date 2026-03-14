-- Product reviews submitted by customers
CREATE TABLE IF NOT EXISTS product_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id),
  customer_id     UUID REFERENCES profiles(id),
  store_id        UUID REFERENCES stores(id),
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  reviewer_name   TEXT,
  reviewer_email  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product    ON product_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_status     ON product_reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_customer   ON product_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store      ON product_reviews(store_id);
