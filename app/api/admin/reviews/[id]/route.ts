import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected", "flagged"]),
});

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("product_reviews")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("id,status")
      .single();
    if (error) throw error;
    return ok({ id: data.id, status: data.status });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("product_reviews").delete().eq("id", params.id);
    if (error) throw error;
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
