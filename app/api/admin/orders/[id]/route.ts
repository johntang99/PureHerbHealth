import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id,order_number,status,payment_status,shipping_status,subtotal_cents,shipping_cents,tax_cents,discount_cents,total_cents,currency,created_at,updated_at,customer_name,customer_email,customer_phone,shipping_address,billing_address,shipping_carrier,shipping_service,promo_code,customer_notes,tracking_number,tracking_url,shipping_label_url,stripe_payment_intent_id,refund_amount_cents,refund_reason,cancelled_at,shipped_at,delivered_at,store_id,stores:store_id(slug,name)",
      )
      .eq("id", params.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });

    const { data: items, error: itemError } = await admin
      .from("order_items")
      .select("id,product_id,variant_id,sku,title_snapshot,image_url,quantity,unit_price_cents,products:product_id(id,slug,name,name_zh,images,sku)")
      .eq("order_id", params.id);
    if (itemError) throw itemError;

    const { data: notes, error: notesError } = await admin
      .from("order_internal_notes")
      .select("id,author_id,content,created_at,profiles:author_id(full_name)")
      .eq("order_id", params.id)
      .order("created_at", { ascending: false });
    if (notesError) throw notesError;

    const { data: timeline, error: timelineError } = await admin
      .from("order_timeline_events")
      .select("id,event_type,description,metadata,created_at")
      .eq("order_id", params.id)
      .order("created_at", { ascending: false });
    if (timelineError) throw timelineError;

    const store = Array.isArray(order.stores) ? order.stores[0] : order.stores;
    return ok({
      ...order,
      total: Number(((order.total_cents || 0) / 100).toFixed(2)),
      subtotal: Number(((order.subtotal_cents || 0) / 100).toFixed(2)),
      shipping_amount: Number(((order.shipping_cents || 0) / 100).toFixed(2)),
      tax_amount: Number(((order.tax_cents || 0) / 100).toFixed(2)),
      discount_amount: Number(((order.discount_cents || 0) / 100).toFixed(2)),
      refund_amount: order.refund_amount_cents ? Number((order.refund_amount_cents / 100).toFixed(2)) : null,
      store_slug: store?.slug || "",
      store_name: store?.name || "",
      items:
        items?.map((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          return {
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            sku: item.sku || product?.sku || "",
            quantity: item.quantity,
            unit_price: Number(((item.unit_price_cents || 0) / 100).toFixed(2)),
            total_price: Number((((item.unit_price_cents || 0) * (item.quantity || 0)) / 100).toFixed(2)),
            image_url: item.image_url || product?.images?.[0]?.url || "",
            product_name: item.title_snapshot || product?.name || "Unknown product",
          };
        }) ?? [],
      internal_notes:
        notes?.map((note) => ({
          id: note.id,
          author_id: note.author_id,
          author_name: (() => {
            const profile = note.profiles as { full_name?: string } | Array<{ full_name?: string }> | null;
            return Array.isArray(profile) ? profile[0]?.full_name || "Admin" : profile?.full_name || "Admin";
          })(),
          content: note.content,
          created_at: note.created_at,
        })) ?? [],
      timeline: timeline || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  tracking_number:  z.string().nullable().optional(),
  tracking_url:     z.string().nullable().optional(),
  shipping_carrier: z.string().nullable().optional(),
  shipping_service: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = patchSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const updates: Record<string, string | null> = {};
    if (body.tracking_number  !== undefined) updates.tracking_number  = body.tracking_number;
    if (body.tracking_url     !== undefined) updates.tracking_url     = body.tracking_url;
    if (body.shipping_carrier !== undefined) updates.shipping_carrier = body.shipping_carrier;
    if (body.shipping_service !== undefined) updates.shipping_service = body.shipping_service;
    if (Object.keys(updates).length === 0) return ok({ id: params.id });
    const { error } = await admin.from("orders").update(updates).eq("id", params.id);
    if (error) throw error;
    return ok({ id: params.id });
  } catch (error) {
    return handleApiError(error);
  }
}
