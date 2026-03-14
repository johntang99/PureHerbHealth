import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { handleApiError, ok } from "@/lib/utils/api";

const schema = z.object({
  admin_id: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const stripe = getStripeClient();

    const { data: ret, error: retError } = await admin
      .from("returns")
      .select("id,order_id,status")
      .eq("id", params.id)
      .maybeSingle();
    if (retError) throw retError;
    if (!ret) return ok({ error: "Return not found" }, { status: 404 });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,total_cents,stripe_payment_intent_id")
      .eq("id", ret.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });

    const { data: returnItems, error: returnItemsError } = await admin
      .from("return_items")
      .select("order_item_id,quantity")
      .eq("return_id", ret.id);
    if (returnItemsError) throw returnItemsError;

    const { data: orderItems, error: orderItemsError } = await admin
      .from("order_items")
      .select("id,product_id,variant_id,quantity,unit_price_cents")
      .eq("order_id", order.id);
    if (orderItemsError) throw orderItemsError;

    let refundAmountCents = 0;
    for (const ri of returnItems || []) {
      const item = (orderItems || []).find((candidate) => candidate.id === ri.order_item_id);
      if (!item) continue;
      refundAmountCents += (item.unit_price_cents || 0) * ri.quantity;
      await admin.rpc("adjust_stock", {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id ?? null,
        p_adjustment: ri.quantity,
        p_reason: "return",
        p_notes: "Return received",
        p_reference_id: order.id,
        p_adjusted_by: body.admin_id ?? null,
      });
    }

    if (stripe && order.stripe_payment_intent_id && refundAmountCents > 0) {
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
        metadata: { return_id: ret.id, order_id: order.id },
      });
    }

    await admin
      .from("returns")
      .update({
        status: "return_complete",
        refund_amount_cents: refundAmountCents,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ret.id);

    const allItemsReturned = (returnItems || []).reduce((sum, i) => sum + i.quantity, 0) >= (orderItems || []).reduce((sum, i) => sum + i.quantity, 0);
    await admin
      .from("orders")
      .update({
        status: allItemsReturned ? "refunded" : "delivered",
        payment_status: allItemsReturned ? "refunded" : "partially_refunded",
        refund_amount_cents: refundAmountCents,
      })
      .eq("id", order.id);

    await admin.from("order_timeline_events").insert({
      order_id: order.id,
      event_type: "return_complete",
      description: `Return completed and refund issued ($${(refundAmountCents / 100).toFixed(2)})`,
      metadata: { return_id: ret.id },
    });

    return ok({
      return_id: ret.id,
      status: "return_complete",
      refund_amount: Number((refundAmountCents / 100).toFixed(2)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
