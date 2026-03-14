import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buyShipment, hasEasyPostKey } from "@/lib/easypost/client";

const schema = z.object({
  order_id: z.string().uuid(),
  rate_id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as Record<string, unknown>;
    const body = schema.parse({
      order_id: raw.order_id ?? raw.orderId,
      rate_id: raw.rate_id ?? raw.rateId,
    });
    const admin = getSupabaseAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .select("id,status,easypost_shipment_id,customer_email,customer_name")
      .eq("id", body.order_id)
      .maybeSingle();

    if (error) throw error;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });
    if (order.status === "cancelled") {
      return ok({ error: "Cannot create label for cancelled order" }, { status: 400 });
    }

    let labelUrl = "https://example.com/label.pdf";
    let trackingNumber = `PHHTRACK${Date.now()}`;
    let trackingUrl = "";
    let carrier = "USPS";
    let service = "Ground";
    let estimatedDeliveryDate: string | undefined;
    let shipmentId = order.easypost_shipment_id || `stub-shipment-${Date.now()}`;

    if (hasEasyPostKey() && order.easypost_shipment_id) {
      const purchased = await buyShipment(order.easypost_shipment_id, body.rate_id);
      labelUrl = purchased.postage_label?.label_url || labelUrl;
      trackingNumber = purchased.tracking_code || trackingNumber;
      trackingUrl = purchased.tracker?.public_url || "";
      carrier = purchased.selected_rate?.carrier || carrier;
      service = purchased.selected_rate?.service || service;
      estimatedDeliveryDate = purchased.selected_rate?.delivery_date || undefined;
      shipmentId = purchased.id;
    }

    const { error: updateError } = await admin
      .from("orders")
      .update({
        shipping_label_url: labelUrl,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        easypost_shipment_id: shipmentId,
        shipping_status: "label_created",
        status: "shipped",
        shipped_at: new Date().toISOString(),
        shipping_carrier: carrier,
        shipping_service: service,
      })
      .eq("id", body.order_id);
    if (updateError) throw updateError;

    const { error: timelineError } = await admin.from("order_timeline_events").insert({
      order_id: body.order_id,
      event_type: "label_created",
      description: `Shipping label created (${carrier} ${service})`,
      metadata: { tracking_number: trackingNumber },
    });
    if (timelineError) throw timelineError;

    return ok({
      label_url: labelUrl,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      carrier,
      service,
      easypost_shipment_id: shipmentId,
      estimated_delivery_date: estimatedDeliveryDate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
