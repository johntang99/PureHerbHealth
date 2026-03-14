import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ai_generations")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return ok({ id: params.id, status: "error", error: error.message }, { status: 400 });
  return ok({ id: params.id, status: "approved" });
}
