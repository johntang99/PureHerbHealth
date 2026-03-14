import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const CART_SESSION_COOKIE = "phh_cart_session";

export function getCartSessionCookieName() {
  return CART_SESSION_COOKIE;
}

export function normalizeGuestToken(token?: string | null) {
  return token && token.length > 8 ? token : `guest_${randomUUID()}`;
}

export async function resolveStore(admin: SupabaseClient, storeSlug: string) {
  const { data, error } = await admin.from("stores").select("id,slug,name").eq("slug", storeSlug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrCreateCart(input: {
  admin: SupabaseClient;
  storeId: string;
  guestToken: string;
  profileId?: string | null;
}) {
  const { admin, storeId, guestToken, profileId } = input;
  let query = admin.from("carts").select("id,store_id,profile_id,guest_token").eq("store_id", storeId).limit(1);
  query = profileId ? query.eq("profile_id", profileId) : query.eq("guest_token", guestToken);
  const { data: rows, error } = await query;
  if (error) throw error;
  const existing = rows?.[0] ?? null;
  if (existing) return existing;

  const { data: created, error: createError } = await admin
    .from("carts")
    .insert({
      store_id: storeId,
      profile_id: profileId ?? null,
      guest_token: profileId ? null : guestToken,
    })
    .select("id,store_id,profile_id,guest_token")
    .single();

  // If a unique constraint violation (23505) occurs, a concurrent request already
  // created the cart — just fetch it instead of crashing.
  if (createError) {
    if (createError.code === "23505") {
      const { data: retryRows } = await query;
      const retried = retryRows?.[0] ?? null;
      if (retried) return retried;
    }
    throw createError;
  }
  return created;
}

export async function loadCartDetails(admin: SupabaseClient, cartId: string) {
  const { data: cartItems, error } = await admin
    .from("cart_items")
    .select("id,product_id,quantity,products:product_id(id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,enabled)")
    .eq("cart_id", cartId);
  if (error) throw error;

  const items = (cartItems ?? [])
    .filter((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      return Boolean(product && product.enabled);
    })
    .map((row) => {
      const product = (Array.isArray(row.products) ? row.products[0] : row.products) as unknown as {
        id: string;
        slug: string;
        name: string;
        name_zh: string | null;
        short_description: string | null;
        short_description_zh: string | null;
        price_cents: number;
        images: Array<{ url?: string; alt?: string }> | null;
        enabled: boolean;
      };
      const unitPriceCents = product.price_cents;
      return {
        id: row.id,
        product_id: product.id,
        quantity: row.quantity,
        unit_price_cents: unitPriceCents,
        total_price_cents: unitPriceCents * row.quantity,
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          name_zh: product.name_zh,
          short_description: product.short_description,
          short_description_zh: product.short_description_zh,
          image_url: product.images?.[0]?.url ?? "",
        },
      };
    });

  const subtotalCents = items.reduce((sum, item) => sum + item.total_price_cents, 0);
  return {
    items,
    subtotal_cents: subtotalCents,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function mergeGuestCartIntoProfile(input: {
  admin: SupabaseClient;
  storeId: string;
  guestToken: string;
  profileId: string;
}) {
  const { admin, storeId, guestToken, profileId } = input;
  if (!guestToken) return { merged: false, moved_items: 0 };

  const { data: guestRows, error: guestCartError } = await admin
    .from("carts")
    .select("id")
    .eq("store_id", storeId)
    .eq("guest_token", guestToken)
    .is("profile_id", null)
    .limit(1);
  if (guestCartError) throw guestCartError;
  const guestCart = guestRows?.[0] ?? null;
  if (!guestCart?.id) return { merged: false, moved_items: 0 };

  const profileCart = await getOrCreateCart({
    admin,
    storeId,
    guestToken,
    profileId,
  });
  if (profileCart.id === guestCart.id) return { merged: false, moved_items: 0 };

  const { data: guestItems, error: guestItemsError } = await admin
    .from("cart_items")
    .select("id,product_id,quantity")
    .eq("cart_id", guestCart.id);
  if (guestItemsError) throw guestItemsError;

  let movedItems = 0;
  for (const item of guestItems ?? []) {
    const { data: existing, error: existingError } = await admin
      .from("cart_items")
      .select("id,quantity")
      .eq("cart_id", profileCart.id)
      .eq("product_id", item.product_id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("cart_items")
        .update({ quantity: Math.min(99, existing.quantity + item.quantity) })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await admin.from("cart_items").insert({
        cart_id: profileCart.id,
        product_id: item.product_id,
        quantity: item.quantity,
      });
      if (insertError) throw insertError;
    }
    movedItems += 1;
  }

  const { error: deleteError } = await admin.from("carts").delete().eq("id", guestCart.id);
  if (deleteError) throw deleteError;

  return { merged: true, moved_items: movedItems };
}
