import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  items: z
    .array(
      z.object({
        order_item_id: z.string().uuid(),
        quantity: z.number().int().positive(),
        reason: z.enum(["defective", "wrong_item", "not_as_described", "no_longer_needed", "arrived_too_late", "other"]),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  preferred_resolution: z.enum(["refund", "exchange", "store_credit"]).default("refund"),
  customer_id: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    const { data: order, error: orderError } = await admin.from("orders").select("id,status").eq("id", params.id).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });
    if (!["shipped", "delivered"].includes(order.status)) {
      return ok({ error: "Returns can only be requested for shipped or delivered orders." }, { status: 400 });
    }

    const { data: created, error: createError } = await admin
      .from("returns")
      .insert({
        order_id: params.id,
        customer_id: body.customer_id ?? null,
        status: "return_requested",
        preferred_resolution: body.preferred_resolution,
      })
      .select("id,status")
      .single();
    if (createError) throw createError;

    const payload = body.items.map((item) => ({
      return_id: created.id,
      order_item_id: item.order_item_id,
      quantity: item.quantity,
      reason: item.reason,
      notes: item.notes ?? null,
    }));
    const { error: itemError } = await admin.from("return_items").insert(payload);
    if (itemError) throw itemError;

    await admin.from("order_timeline_events").insert({
      order_id: params.id,
      event_type: "return_requested",
      description: "Customer initiated return request",
      metadata: { return_id: created.id, item_count: body.items.length },
    });

    return ok({
      return_id: created.id,
      status: created.status,
      message: "Return request submitted.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
