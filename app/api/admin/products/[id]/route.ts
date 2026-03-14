import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return ok({ product: data });
  } catch (error) {
    return handleApiError(error);
  }
}
