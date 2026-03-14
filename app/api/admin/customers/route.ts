import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    let builder = admin
      .from("profiles")
      .select("id,auth_user_id,email,full_name,role,store_id,created_at,updated_at", { count: "exact" })
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .range((q.page - 1) * q.per_page, q.page * q.per_page - 1);

    if (q.search) {
      builder = builder.or(`email.ilike.%${q.search}%,full_name.ilike.%${q.search}%`);
    }

    const { data, error, count } = await builder;
    if (error) throw error;

    // Get order counts per customer
    const customerIds = (data ?? []).map((p) => p.id);
    const orderCounts: Record<string, number> = {};
    if (customerIds.length > 0) {
      const { data: orders } = await admin
        .from("orders")
        .select("customer_id")
        .in("customer_id", customerIds);
      for (const order of orders ?? []) {
        orderCounts[order.customer_id] = (orderCounts[order.customer_id] ?? 0) + 1;
      }
    }

    const rows = (data ?? []).map((p) => ({
      id: p.id,
      auth_user_id: p.auth_user_id,
      email: p.email,
      full_name: p.full_name,
      store_id: p.store_id,
      created_at: p.created_at,
      order_count: orderCounts[p.id] ?? 0,
    }));

    return ok({ customers: rows, total: count ?? 0, page: q.page, per_page: q.per_page });
  } catch (error) {
    return handleApiError(error);
  }
}
