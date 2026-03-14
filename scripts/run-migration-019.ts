import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const projectRef = url.replace("https://", "").split(".")[0];
console.log("Project ref:", projectRef);

async function main() {
  // Try Supabase Management API
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query: `
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
        `.trim(),
      }),
    }
  );

  console.log("Management API status:", res.status);
  const text = await res.text();
  console.log("Response:", text);

  if (res.status === 200 || res.status === 201) {
    console.log("✓ Migration 019 applied via Management API");
    return;
  }

  // Fallback: Try creating via REST with a dummy insert to trigger schema cache refresh
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.from("product_reviews").select("id").limit(1);
  if (!error) {
    console.log("✓ product_reviews table already exists");
  } else {
    console.error(
      "✗ Table does not exist and Management API did not create it."
    );
    console.error(
      "Please run migration 019 manually in the Supabase SQL Editor at:"
    );
    console.error(`https://supabase.com/dashboard/project/${projectRef}/sql`);
    console.error(
      "\nSQL to run:\n" +
        `CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES profiles(id),
  store_id UUID REFERENCES stores(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT, body TEXT, reviewer_name TEXT, reviewer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
