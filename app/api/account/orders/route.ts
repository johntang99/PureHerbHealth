import { z } from "zod";
import { handleApiError, ok, unauthorized } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserAndProfile } from "@/lib/auth/profile";
import { resolveStoreSlug } from "@/lib/store/slug";
import { resolveStore } from "@/lib/cart/service";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(50).default(20),
  store_slug: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUserAndProfile();
    if (!session) return unauthorized();
    const { profile } = session;
    const admin = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const from = (query.page - 1) * query.per_page;
    const to = from + query.per_page - 1;

    let storeId: string | null = null;
    if (query.store_slug) {
      const store = await resolveStore(admin, resolveStoreSlug(query.store_slug));
      storeId = store?.id ?? null;
      if (!storeId) {
        return ok({
          items: [],
          pagination: {
            page: query.page,
            per_page: query.per_page,
            total: 0,
            total_pages: 1,
          },
        });
      }
    }

    let q = admin
      .from("orders")
      .select("id,order_number,status,payment_status,shipping_status,total_cents,currency,created_at,updated_at", { count: "exact" })
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (storeId) q = q.eq("store_id", storeId);

    const { data, count, error } = await q.range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    return ok({
      items: data ?? [],
      pagination: {
        page: query.page,
        per_page: query.per_page,
        total,
        total_pages: Math.max(1, Math.ceil(total / query.per_page)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
