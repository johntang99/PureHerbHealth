import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data: generation, error } = await admin
    .from("ai_generations")
    .select("id,kind,input,output,status")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !generation) return ok({ id: params.id, status: "error", error: "Generation not found" }, { status: 404 });
  if (generation.status !== "approved" && generation.status !== "generated") {
    return ok({ id: params.id, status: "error", error: "Generation must be approved first" }, { status: 400 });
  }

  if (generation.kind === "product_description") {
    const productId = generation.input?.product_id;
    if (productId) {
      await admin
        .from("products")
        .update({
          short_description: generation.output?.short_description ?? null,
          description: generation.output?.long_description ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }
  }

  await admin.from("ai_generations").update({ status: "applied", updated_at: new Date().toISOString() }).eq("id", params.id);
  return ok({ id: params.id, status: "applied" });
}
