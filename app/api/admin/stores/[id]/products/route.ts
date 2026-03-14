import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("store_products")
    .select("id,store_id,product_id,enabled,price_override_cents,practitioner_note,practitioner_recommended,sort_order,is_featured,store_badges,products:product_id(id,name,slug,price_cents,stock_quantity,sku)")
    .eq("store_id", params.id)
    .order("sort_order", { ascending: true });
  if (error) return ok({ error: error.message }, { status: 500 });

  return ok({ store_id: params.id, items: data || [] });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json()) as {
    updates?: Array<{
      product_id: string;
      enabled?: boolean;
      custom_price?: number | null;
      practitioner_note?: string | null;
      practitioner_recommended?: boolean;
      sort_order?: number;
      is_featured?: boolean;
      store_badges?: string[];
    }>;
  };

  const admin = getSupabaseAdminClient();
  const updates = body.updates || [];
  for (const item of updates) {
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
    if (error) return ok({ error: error.message }, { status: 500 });
  }

  return ok({ store_id: params.id, updated: true, count: updates.length });
}
