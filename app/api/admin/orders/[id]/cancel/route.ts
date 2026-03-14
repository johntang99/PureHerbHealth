import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { handleApiError, ok } from "@/lib/utils/api";

const schema = z.object({
  reason: z.string().min(2),
  refund: z.boolean().default(true),
  admin_id: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const stripe = getStripeClient();

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,status,payment_status,total_cents,stripe_payment_intent_id")
      .eq("id", params.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });
    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      return ok({ error: `Cannot cancel order in ${order.status} status` }, { status: 400 });
    }

    if (body.refund && order.payment_status === "succeeded" && stripe && order.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          order_id: order.id,
          cancel_reason: body.reason,
        },
      });
      await admin
        .from("orders")
        .update({
          payment_status: "refunded",
          refund_amount_cents: order.total_cents,
          refund_reason: body.reason,
        })
        .eq("id", order.id);
    }

    const { data: orderItems, error: itemError } = await admin
      .from("order_items")
      .select("product_id,variant_id,quantity")
      .eq("order_id", params.id);
    if (itemError) throw itemError;

    for (const item of orderItems || []) {
      await admin.rpc("adjust_stock", {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id ?? null,
        p_adjustment: item.quantity,
        p_reason: "return",
        p_notes: "Order cancelled",
        p_reference_id: params.id,
        p_adjusted_by: body.admin_id ?? null,
      });
    }

    await admin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    await admin.from("order_timeline_events").insert({
      order_id: params.id,
      event_type: "order_cancelled",
      description: `Order cancelled. Reason: ${body.reason}`,
      metadata: { refund: body.refund },
    });

    return ok({ id: params.id, status: "cancelled", refunded: body.refund && order.payment_status === "succeeded" });
  } catch (error) {
    return handleApiError(error);
  }
}
