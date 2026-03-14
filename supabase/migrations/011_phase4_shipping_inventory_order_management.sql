-- Phase 4: Shipping, Inventory, and Order Management

-- Expand products for inventory management
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sold_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products (sku)
  WHERE sku IS NOT NULL;

-- Expand orders for fulfillment, shipping, and support workflows
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS shipping_service TEXT,
  ADD COLUMN IF NOT EXISTS shipping_rate_id TEXT,
  ADD COLUMN IF NOT EXISTS easypost_shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_request_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- Expand order items for snapshots
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS title_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Stock adjustments log
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID,
  adjustment INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'return', 'restock', 'manual', 'damaged')),
  notes TEXT,
  reference_id UUID,
  adjusted_by UUID REFERENCES profiles(id),
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_reference ON stock_adjustments(reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at DESC);

-- Admin notifications for low-stock and operational alerts
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(read, created_at DESC);

-- Order timeline and internal notes
CREATE TABLE IF NOT EXISTS order_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_internal_notes(order_id, created_at DESC);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'return_requested'
    CHECK (status IN ('return_requested', 'return_approved', 'return_denied', 'return_label_sent', 'return_received', 'return_complete')),
  preferred_resolution TEXT NOT NULL DEFAULT 'refund'
    CHECK (preferred_resolution IN ('refund', 'exchange', 'store_credit')),
  admin_notes TEXT,
  return_tracking_number TEXT,
  return_label_url TEXT,
  easypost_return_shipment_id TEXT,
  refund_amount_cents INTEGER,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);

-- Atomic stock adjuster with logging and optional low-stock notifications
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_adjustment INTEGER DEFAULT 0,
  p_reason TEXT DEFAULT 'manual',
  p_notes TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_adjusted_by UUID DEFAULT NULL
)
RETURNS TABLE(previous_qty INTEGER, new_qty INTEGER) AS $$
DECLARE
  v_previous INTEGER;
  v_new INTEGER;
  v_name TEXT;
  v_sku TEXT;
  v_threshold INTEGER;
BEGIN
  SELECT stock_quantity, name, sku, low_stock_threshold
    INTO v_previous, v_name, v_sku, v_threshold
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_previous IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;

  v_new := GREATEST(v_previous + p_adjustment, 0);

  UPDATE products
  SET
    stock_quantity = v_new,
    last_restocked_at = CASE WHEN p_adjustment > 0 THEN NOW() ELSE last_restocked_at END,
    last_sold_at = CASE WHEN p_adjustment < 0 THEN NOW() ELSE last_sold_at END,
    updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO stock_adjustments (
    product_id, variant_id, adjustment, reason, notes, reference_id, adjusted_by, previous_quantity, new_quantity
  ) VALUES (
    p_product_id, p_variant_id, p_adjustment, p_reason, p_notes, p_reference_id, p_adjusted_by, v_previous, v_new
  );

  IF v_new <= v_threshold THEN
    INSERT INTO admin_notifications (type, title, message, severity, metadata)
    VALUES (
      'low_stock',
      'Low Stock Alert',
      format('Product "%s" (SKU: %s) has %s units remaining', COALESCE(v_name, 'Unknown'), COALESCE(v_sku, 'N/A'), v_new),
      CASE
        WHEN v_new = 0 THEN 'critical'
        WHEN v_new <= GREATEST(FLOOR(v_threshold * 0.3), 1) THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'product_id', p_product_id,
        'sku', COALESCE(v_sku, ''),
        'current_stock', v_new,
        'threshold', v_threshold
      )
    );
  END IF;

  RETURN QUERY SELECT v_previous, v_new;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
