import { verifyEasyPostSignature } from "@/lib/easypost/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ok } from "@/lib/utils/api";

const statusMap: Record<string, "label_created" | "in_transit" | "out_for_delivery" | "delivered" | "returned" | "failure"> = {
  pre_transit: "label_created",
  in_transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  available_for_pickup: "delivered",
  return_to_sender: "returned",
  failure: "failure",
  cancelled: "failure",
  error: "failure",
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hmac-signature") || request.headers.get("x-easypost-signature");
  const shouldVerify = Boolean(process.env.EASYPOST_WEBHOOK_SECRET && process.env.EASYPOST_WEBHOOK_SECRET !== "...");

  if (shouldVerify && !verifyEasyPostSignature(rawBody, signature)) {
    return ok({ error: "Invalid EasyPost signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    result?: {
      tracking_code?: string;
      status?: string;
      status_detail?: string;
    };
  };

  const trackingNumber = payload.result?.tracking_code;
  const upstreamStatus = payload.result?.status || "";
  const shippingStatus = statusMap[upstreamStatus] || "failure";

  if (!trackingNumber) return ok({ received: true, ignored: true });

  const admin = getSupabaseAdminClient();
  const { data: order, error: orderLookupError } = await admin
    .from("orders")
    .select("id")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();
  if (orderLookupError) {
    return ok({ error: orderLookupError.message }, { status: 500 });
  }

  if (!order) {
    return ok({ received: true, ignored: true, reason: "order_not_found" });
  }

  const deliveredAt = shippingStatus === "delivered" ? new Date().toISOString() : null;
  const nextOrderStatus = shippingStatus === "delivered" ? "delivered" : undefined;

  const { error: updateError } = await admin
    .from("orders")
    .update({
      shipping_status: shippingStatus,
      delivered_at: deliveredAt ?? undefined,
      status: nextOrderStatus,
    })
    .eq("id", order.id);
  if (updateError) {
    return ok({ error: updateError.message, order_id: order.id }, { status: 500 });
  }

  const { error: timelineError } = await admin.from("order_timeline_events").insert({
    order_id: order.id,
    event_type: "shipping_update",
    description: `Shipping updated to ${shippingStatus}`,
    metadata: {
      tracking_number: trackingNumber,
      upstream_status: upstreamStatus,
      detail: payload.result?.status_detail || null,
    },
  });
  if (timelineError) {
    return ok({ error: timelineError.message, order_id: order.id }, { status: 500 });
  }

  return ok({
    received: true,
    order_id: order.id,
    shipping_status: shippingStatus,
  });
}
