import { z } from "zod";
import { cookies } from "next/headers";
import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStoreSlug } from "@/lib/store/slug";
import { ensureProfileForAuthUser, getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { getCartSessionCookieName, mergeGuestCartIntoProfile, resolveStore } from "@/lib/cart/service";

const schema = z.object({
  store_slug: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json().catch(() => ({})));
    const session = await getAuthenticatedUserAndProfile();
    if (!session) return unauthorized();

    const { user } = session;
    const profile = await ensureProfileForAuthUser(user);
    const admin = getSupabaseAdminClient();
    const storeSlug = resolveStoreSlug(payload.store_slug);
    const store = await resolveStore(admin, storeSlug);

    let merged = { merged: false, moved_items: 0 };
    if (store?.id) {
      const guestToken = cookies().get(getCartSessionCookieName())?.value ?? "";
      if (guestToken) {
        merged = await mergeGuestCartIntoProfile({
          admin,
          storeId: store.id,
          guestToken,
          profileId: profile.id,
        });
      }
    }

    let linkedOrderCount = 0;
    if (user.email) {
      const { data: guestOrders, error: guestOrdersError } = await admin
        .from("orders")
        .select("id")
        .is("profile_id", null)
        .eq("customer_email", user.email);
      if (guestOrdersError) throw guestOrdersError;
      const orderIds = (guestOrders ?? []).map((row) => row.id);
      if (orderIds.length > 0) {
        const { error: updateOrdersError } = await admin.from("orders").update({ profile_id: profile.id }).in("id", orderIds);
        if (updateOrdersError) throw updateOrdersError;
        linkedOrderCount = orderIds.length;
      }
    }

    return ok({
      profile_id: profile.id,
      merged_cart: merged,
      linked_guest_orders: linkedOrderCount,
      store_slug: storeSlug,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
