import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: { batch_id: string } }) {
  const admin = getSupabaseAdminClient();
  const { data: batch } = await admin
    .from("ai_generation_batches")
    .select("id,total,completed,failed,status")
    .eq("id", params.batch_id)
    .maybeSingle();
  const { data: generations } = await admin
    .from("ai_generations")
    .select("id,input,status")
    .contains("input", { batch_id: params.batch_id });

  const completed = (generations ?? []).filter((item) => item.status === "generated" || item.status === "approved" || item.status === "applied").length;
  const failed = (generations ?? []).filter((item) => item.status === "failed" || item.status === "rejected").length;
  const total = batch?.total || generations?.length || 0;
  const batchStatus =
    completed + failed >= total && total > 0 ? (failed > 0 ? "partial_failure" : "completed") : batch?.status || "processing";

  if (batch) {
    await admin
      .from("ai_generation_batches")
      .update({
        completed,
        failed,
        status: batchStatus,
        completed_at: batchStatus === "processing" ? null : new Date().toISOString(),
      })
      .eq("id", batch.id);
  }

  return ok({
    batch_id: batch?.id ?? params.batch_id,
    total,
    completed,
    failed,
    progress_percent: total > 0 ? Math.round(((completed + failed) / total) * 100) : 0,
    status: batchStatus,
    generations: (generations ?? []).map((item) => ({
      generation_id: item.id,
      product_id: item.input?.product_id ?? null,
      status: item.status,
    })),
  });
}
