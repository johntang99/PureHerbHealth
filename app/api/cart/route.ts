import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { cartItemSchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCartSessionCookieName,
  getOrCreateCart,
  loadCartDetails,
  normalizeGuestToken,
  resolveStore,
} from "@/lib/cart/service";
import { resolveStoreSlug } from "@/lib/store/slug";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";

const updateSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});
const getSchema = z.object({
  store_slug: z.string().optional(),
});
const addSchema = cartItemSchema.extend({
  product_id: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  store_slug: z.string().optional(),
  variant_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const admin = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const params = getSchema.parse(Object.fromEntries(searchParams.entries()));
    const storeSlug = resolveStoreSlug(params.store_slug);
    const store = await resolveStore(admin, storeSlug);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const session = await getAuthenticatedUserAndProfile().catch(() => null);
    const guestToken = normalizeGuestToken(request.cookies.get(getCartSessionCookieName())?.value);
    const profileId = session?.profile.id ?? request.headers.get("x-profile-id");
    const cart = await getOrCreateCart({ admin, storeId: store.id, guestToken, profileId });
    const details = await loadCartDetails(admin, cart.id);

    const response = NextResponse.json({
      id: cart.id,
      store_slug: store.slug,
      items: details.items,
      subtotal: Number((details.subtotal_cents / 100).toFixed(2)),
      item_count: details.item_count,
      applied_promo: null,
    });
    response.cookies.set(getCartSessionCookieName(), guestToken, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = addSchema.parse(await request.json());
    const productId = body.product_id ?? body.productId;
    if (!productId) return NextResponse.json({ error: "product_id is required" }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const storeSlug = resolveStoreSlug(body.store_slug);
    const store = await resolveStore(admin, storeSlug);
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const session = await getAuthenticatedUserAndProfile().catch(() => null);
    const guestToken = normalizeGuestToken(request.cookies.get(getCartSessionCookieName())?.value);
    const profileId = session?.profile.id ?? request.headers.get("x-profile-id");
    const cart = await getOrCreateCart({ admin, storeId: store.id, guestToken, profileId });

    const { data: existing } = await admin
      .from("cart_items")
      .select("id,quantity")
      .eq("cart_id", cart.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("cart_items")
        .update({ quantity: Math.min(99, existing.quantity + body.quantity) })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await admin.from("cart_items").insert({
        cart_id: cart.id,
        product_id: productId,
        quantity: body.quantity,
      });
      if (error) throw error;
    }

    const details = await loadCartDetails(admin, cart.id);
    const response = NextResponse.json({
      id: cart.id,
      store_slug: store.slug,
      items: details.items,
      subtotal: Number((details.subtotal_cents / 100).toFixed(2)),
      item_count: details.item_count,
      applied_promo: null,
    });
    response.cookies.set(getCartSessionCookieName(), guestToken, { path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = updateSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("cart_items").update({ quantity: body.quantity }).eq("id", body.item_id);
    if (error) throw error;

    const { data: item, error: itemError } = await admin.from("cart_items").select("cart_id").eq("id", body.item_id).single();
    if (itemError) throw itemError;
    const details = await loadCartDetails(admin, item.cart_id);
    return NextResponse.json({
      items: details.items,
      subtotal: Number((details.subtotal_cents / 100).toFixed(2)),
      item_count: details.item_count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
