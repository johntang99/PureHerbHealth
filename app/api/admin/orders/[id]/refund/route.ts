import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { handleApiError, ok } from "@/lib/utils/api";

const schema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(2),
  restore_inventory: z.boolean().default(false),
  admin_id: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        order_item_id: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
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
    if (order.payment_status !== "succeeded") return ok({ error: "Order has not been paid" }, { status: 400 });

    const refundAmountCents = Math.round((body.amount ?? order.total_cents / 100) * 100);
    const isPartial = refundAmountCents < order.total_cents;

    if (stripe && order.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
        metadata: {
          order_id: params.id,
          refund_reason: body.reason,
        },
      });
    }

    await admin
      .from("orders")
      .update({
        status: isPartial ? order.status : "refunded",
        payment_status: isPartial ? "partially_refunded" : "refunded",
        refund_amount_cents: refundAmountCents,
        refund_reason: body.reason,
      })
      .eq("id", params.id);

    if (body.restore_inventory) {
      const { data: orderItems, error: itemsError } = await admin
        .from("order_items")
        .select("id,product_id,variant_id,quantity")
        .eq("order_id", params.id);
      if (itemsError) throw itemsError;

      const itemsToRestore =
        body.items ||
        (orderItems || []).map((item) => ({
          order_item_id: item.id,
          quantity: item.quantity,
        }));

      for (const restoreItem of itemsToRestore) {
        const orderItem = (orderItems || []).find((item) => item.id === restoreItem.order_item_id);
        if (!orderItem) continue;
        await admin.rpc("adjust_stock", {
          p_product_id: orderItem.product_id,
          p_variant_id: orderItem.variant_id ?? null,
          p_adjustment: restoreItem.quantity,
          p_reason: "return",
          p_notes: "Refund inventory restore",
          p_reference_id: params.id,
          p_adjusted_by: body.admin_id ?? null,
        });
      }
    }

    await admin.from("order_timeline_events").insert({
      order_id: params.id,
      event_type: "refund_processed",
      description: `Refund processed: $${(refundAmountCents / 100).toFixed(2)} (${body.reason})`,
      metadata: { partial: isPartial },
    });

    return ok({
      id: params.id,
      status: isPartial ? order.status : "refunded",
      payment_status: isPartial ? "partially_refunded" : "refunded",
      refund_amount: Number((refundAmountCents / 100).toFixed(2)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
