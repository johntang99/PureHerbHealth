-- 021_fix_duplicate_carts.sql
-- Prevents duplicate carts for the same (store, profile) or (store, guest_token).
-- Root cause: no unique constraint allowed concurrent requests to create two carts
-- for the same logged-in user, causing PGRST116 on .maybeSingle() lookups.

-- Step 1: Remove duplicate profile-based carts, keeping the oldest.
-- Items in the deleted carts are removed via ON DELETE CASCADE on cart_items.
DELETE FROM carts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY store_id, profile_id ORDER BY created_at ASC) AS rn
    FROM carts
    WHERE profile_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Remove duplicate guest-token carts, keeping the oldest.
DELETE FROM carts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY store_id, guest_token ORDER BY created_at ASC) AS rn
    FROM carts
    WHERE guest_token IS NOT NULL AND profile_id IS NULL
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add unique partial indexes to enforce one cart per (store, profile)
-- and one cart per (store, guest_token) at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS carts_store_profile_unique
  ON carts (store_id, profile_id)
  WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_store_guest_unique
  ON carts (store_id, guest_token)
  WHERE guest_token IS NOT NULL AND profile_id IS NULL;
