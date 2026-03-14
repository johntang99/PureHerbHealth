import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  note: z.string().optional(),
});

const validTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();

    const { data: current, error: currentError } = await admin.from("orders").select("id,status").eq("id", params.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return ok({ error: "Order not found" }, { status: 404 });

    const allowed = validTransitions[current.status] || [];
    if (!allowed.includes(body.status) && body.status !== current.status) {
      return ok({ error: `Invalid status transition from ${current.status} to ${body.status}` }, { status: 400 });
    }

    await admin
      .from("orders")
      .update({
        status: body.status,
        shipping_status: body.status === "delivered" ? "delivered" : undefined,
        shipped_at: body.status === "shipped" ? new Date().toISOString() : undefined,
        delivered_at: body.status === "delivered" ? new Date().toISOString() : undefined,
      })
      .eq("id", params.id);

    await admin.from("order_timeline_events").insert({
      order_id: params.id,
      event_type: "status_updated",
      description: body.note || `Status changed to ${body.status}`,
      metadata: { previous_status: current.status, status: body.status },
    });

    return ok({ id: params.id, status: body.status });
  } catch (error) {
    return handleApiError(error);
  }
}
