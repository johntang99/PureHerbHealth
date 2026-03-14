import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    // Always fetch all matching products (for search) to compute correct status summary counts
    let allBuilder = admin
      .from("products")
      .select("id,slug,name,sku,stock_quantity,low_stock_threshold,last_restocked_at,last_sold_at,enabled,categories:category_id(name)")
      .order("name", { ascending: true });

    if (q.search) allBuilder = allBuilder.ilike("name", `%${q.search}%`);

    const { data: allData, error: allError } = await allBuilder;
    if (allError) throw allError;

    const allRows = (allData ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      stock_quantity: p.stock_quantity,
      low_stock_threshold: p.low_stock_threshold,
      last_restocked_at: p.last_restocked_at,
      last_sold_at: p.last_sold_at,
      enabled: p.enabled,
      category: Array.isArray(p.categories)
        ? (p.categories[0] as { name?: string })?.name ?? null
        : (p.categories as { name?: string } | null)?.name ?? null,
      stock_status:
        p.stock_quantity === 0
          ? "out_of_stock"
          : p.stock_quantity <= p.low_stock_threshold
          ? "low_stock"
          : "in_stock",
    }));

    // True counts across all products (unaffected by status filter)
    const summary = {
      all: allRows.length,
      in_stock: allRows.filter((r) => r.stock_status === "in_stock").length,
      low_stock: allRows.filter((r) => r.stock_status === "low_stock").length,
      out_of_stock: allRows.filter((r) => r.stock_status === "out_of_stock").length,
    };

    // Apply status filter for the product rows returned
    const filtered =
      q.status === "all"
        ? allRows
        : allRows.filter((r) => r.stock_status === q.status);

    // Paginate
    const from = (q.page - 1) * q.per_page;
    const products = filtered.slice(from, from + q.per_page);

    return ok({ products, total: filtered.length, summary, page: q.page, per_page: q.per_page });
  } catch (error) {
    return handleApiError(error);
  }
}
