import { createReturnShipment, buyShipment, hasEasyPostKey } from "@/lib/easypost/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data: ret, error: retError } = await admin.from("returns").select("id,order_id,status").eq("id", params.id).maybeSingle();
    if (retError) throw retError;
    if (!ret) return ok({ error: "Return not found" }, { status: 404 });

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,shipping_address")
      .eq("id", ret.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return ok({ error: "Order not found" }, { status: 404 });

    let labelUrl = "https://example.com/return-label.pdf";
    let trackingNumber = `RET${Date.now()}`;
    let shipmentId = `stub-return-${Date.now()}`;

    if (hasEasyPostKey()) {
      const address = (order.shipping_address || {}) as Record<string, string>;
      const shipment = await createReturnShipment({
        fromAddress: {
          name: address.full_name || "Customer",
          street1: address.address_line_1 || "",
          street2: address.address_line_2 || undefined,
          city: address.city || "",
          state: address.state || "",
          zip: address.postal_code || "",
          country: address.country || "US",
          phone: address.phone || undefined,
        },
        parcel: { weight: 16, length: 10, width: 8, height: 4 },
      });

      const sorted = [...(shipment.rates || [])].sort((a, b) => Number(a.rate) - Number(b.rate));
      if (sorted[0]?.id) {
        const purchased = await buyShipment(shipment.id, sorted[0].id);
        labelUrl = purchased.postage_label?.label_url || labelUrl;
        trackingNumber = purchased.tracking_code || trackingNumber;
        shipmentId = purchased.id;
      }
    }

    await admin
      .from("returns")
      .update({
        status: "return_label_sent",
        return_tracking_number: trackingNumber,
        return_label_url: labelUrl,
        easypost_return_shipment_id: shipmentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    await admin.from("order_timeline_events").insert({
      order_id: ret.order_id,
      event_type: "return_label_sent",
      description: "Return label generated and sent",
      metadata: { return_id: ret.id, tracking_number: trackingNumber },
    });

    return ok({ return_id: params.id, label_url: labelUrl, tracking_number: trackingNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
