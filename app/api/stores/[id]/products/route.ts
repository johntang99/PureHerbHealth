import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  products: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        enabled: z.boolean().optional(),
        custom_price: z.number().nonnegative().nullable().optional(),
        practitioner_note: z.string().nullable().optional(),
        practitioner_recommended: z.boolean().optional(),
        sort_order: z.number().int().optional(),
        is_featured: z.boolean().optional(),
        store_badges: z.array(z.string()).optional(),
      }),
    )
    .default([]),
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("store_products")
      .select("id,store_id,product_id,enabled,price_override_cents,practitioner_note,practitioner_recommended,sort_order,is_featured,store_badges,products:product_id(id,name,slug,price_cents,stock_quantity,sku)")
      .eq("store_id", params.id)
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const items = (data || []).map((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      return {
        product_id: row.product_id,
        product_name: product?.name || "Unknown",
        product_slug: product?.slug || "",
        product_price: Number((((product?.price_cents as number | null) || 0) / 100).toFixed(2)),
        product_stock: (product?.stock_quantity as number | null) || 0,
        sku: (product?.sku as string | null) || "",
        enabled: row.enabled,
        custom_price: row.price_override_cents === null ? null : Number(((row.price_override_cents || 0) / 100).toFixed(2)),
        practitioner_note: row.practitioner_note,
        practitioner_recommended: row.practitioner_recommended,
        sort_order: row.sort_order,
        is_featured: row.is_featured,
        store_badges: Array.isArray(row.store_badges) ? row.store_badges : [],
      };
    });

    return ok({
      products: items,
      summary: {
        total_enabled: items.filter((item) => item.enabled).length,
        total_featured: items.filter((item) => item.is_featured).length,
        total_with_custom_price: items.filter((item) => item.custom_price !== null).length,
        total_with_notes: items.filter((item) => Boolean(item.practitioner_note)).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    for (const item of body.products) {
      const payload: Record<string, unknown> = {
        store_id: params.id,
        product_id: item.product_id,
      };
      if (item.enabled !== undefined) payload.enabled = item.enabled;
      if (item.custom_price !== undefined) payload.price_override_cents = item.custom_price === null ? null : Math.round(item.custom_price * 100);
      if (item.practitioner_note !== undefined) payload.practitioner_note = item.practitioner_note;
      if (item.practitioner_recommended !== undefined) payload.practitioner_recommended = item.practitioner_recommended;
      if (item.sort_order !== undefined) payload.sort_order = item.sort_order;
      if (item.is_featured !== undefined) payload.is_featured = item.is_featured;
      if (item.store_badges !== undefined) payload.store_badges = item.store_badges;

      const { error } = await admin.from("store_products").upsert(payload, { onConflict: "store_id,product_id" });
      if (error) throw error;
    }

    return ok({ store_id: params.id, curated_count: body.products.length });
  } catch (error) {
    return handleApiError(error);
  }
}
