import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleApiError, ok } from "@/lib/utils/api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { data: updated, error } = await admin
      .from("returns")
      .update({
        status: "return_approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id,order_id,status")
      .single();
    if (error) throw error;

    await admin.from("order_timeline_events").insert({
      order_id: updated.order_id,
      event_type: "return_approved",
      description: "Return approved by admin",
      metadata: { return_id: updated.id },
    });

    return ok({ return_id: updated.id, status: updated.status });
  } catch (error) {
    return handleApiError(error);
  }
}
