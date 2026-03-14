import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  category_id: z.string().uuid().optional(),
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
      .from("products")
      .select(
        "id,slug,name,name_zh,price_cents,enabled,product_type,category_id,categories(id,slug,name)",
        { count: "exact" },
      )
      .order("name", { ascending: true })
      .range((q.page - 1) * q.per_page, q.page * q.per_page - 1);

    if (q.category_id) builder = builder.eq("category_id", q.category_id);
    if (q.search) builder = builder.ilike("name", `%${q.search}%`);

    const { data, error, count } = await builder;
    if (error) throw error;

    return ok({ products: data ?? [], total: count ?? 0, page: q.page, per_page: q.per_page });
  } catch (error) {
    return handleApiError(error);
  }
}
