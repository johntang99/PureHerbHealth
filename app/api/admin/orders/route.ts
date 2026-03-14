import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

const querySchema = z.object({
  status: z.string().optional(),
  payment_status: z.string().optional(),
  shipping_status: z.string().optional(),
  store_slug: z.string().optional(),
  store_id: z.string().uuid().optional(),
  customer_email: z.string().optional(),
  order_number: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort_by: z.enum(["created_at", "total_cents", "order_number"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(25),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const from = (parsed.page - 1) * parsed.per_page;
    const to = from + parsed.per_page - 1;

    const admin = getSupabaseAdminClient();
    let query = admin
      .from("orders")
      .select(
        "id,order_number,customer_name,customer_email,status,payment_status,shipping_status,total_cents,created_at,store_id,stores:store_id(slug,name),order_items(quantity)",
        { count: "exact" },
      )
      .range(from, to)
      .order(parsed.sort_by, { ascending: parsed.sort_order === "asc" });

    if (parsed.status) query = query.eq("status", parsed.status);
    if (parsed.payment_status) query = query.eq("payment_status", parsed.payment_status);
    if (parsed.shipping_status) query = query.eq("shipping_status", parsed.shipping_status);
    if (parsed.store_id) query = query.eq("store_id", parsed.store_id);
    if (parsed.customer_email) query = query.ilike("customer_email", `%${parsed.customer_email}%`);
    if (parsed.order_number) query = query.ilike("order_number", `%${parsed.order_number}%`);
    if (parsed.date_from) query = query.gte("created_at", new Date(parsed.date_from).toISOString());
    if (parsed.date_to) query = query.lte("created_at", new Date(parsed.date_to).toISOString());
    if (parsed.search) query = query.or(`order_number.ilike.%${parsed.search}%,customer_name.ilike.%${parsed.search}%,customer_email.ilike.%${parsed.search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    const rows = (data || []).filter((row) => {
      if (!parsed.store_slug) return true;
      const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
      return store?.slug === parsed.store_slug;
    });

    const orders = rows.map((row) => {
      const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
      const items = Array.isArray(row.order_items) ? row.order_items : [];
      const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      return {
        id: row.id,
        order_number: row.order_number,
        customer_name: row.customer_name || "Guest",
        customer_email: row.customer_email || "",
        store_slug: store?.slug || "",
        store_name: store?.name || "",
        status: row.status,
        payment_status: row.payment_status,
        shipping_status: row.shipping_status,
        total: Number(((row.total_cents || 0) / 100).toFixed(2)),
        item_count: itemCount,
        created_at: row.created_at,
      };
    });

    return ok({
      orders,
      total: count || 0,
      page: parsed.page,
      per_page: parsed.per_page,
      total_pages: Math.ceil((count || 0) / parsed.per_page),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
