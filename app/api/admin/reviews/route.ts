import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  status: z.string().optional(),
  product_id: z.string().uuid().optional(),
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
      .from("product_reviews")
      .select(
        "id,product_id,rating,title,body,reviewer_name,reviewer_email,status,verified_purchase,helpful_count,created_at,products:product_id(name,slug)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range((q.page - 1) * q.per_page, q.page * q.per_page - 1);

    if (q.status) builder = builder.eq("status", q.status);
    if (q.product_id) builder = builder.eq("product_id", q.product_id);
    if (q.search) builder = builder.or(`reviewer_name.ilike.%${q.search}%,title.ilike.%${q.search}%,body.ilike.%${q.search}%`);

    const { data, error, count } = await builder;
    if (error) throw error;

    // True status counts (ignoring current filter)
    const { data: allRows } = await admin.from("product_reviews").select("status");
    const summary = (allRows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    return ok({ reviews: data ?? [], total: count ?? 0, summary, page: q.page, per_page: q.per_page });
  } catch (error) {
    return handleApiError(error);
  }
}
