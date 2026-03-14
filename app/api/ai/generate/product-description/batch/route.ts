import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  product_ids: z.array(z.string().uuid()).min(1).max(20),
  tone: z.enum(["professional", "educational", "conversational"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });
    const batchId = crypto.randomUUID();
    let hasBatchTable = true;

    const { error: batchError } = await admin.from("ai_generation_batches").insert({
      id: batchId,
      store_id: store.id,
      total: body.product_ids.length,
      completed: 0,
      failed: 0,
      status: "processing",
    });
    if (batchError) {
      hasBatchTable = false;
    }

    const { data: products } = await admin
      .from("products")
      .select("id,name")
      .in("id", body.product_ids);
    const rows = (products ?? []).map((product) => ({
      store_id: store.id,
      kind: "product_description",
      input: { product_id: product.id, name: product.name, tone: body.tone ?? "educational", batch_id: batchId },
      output: {},
      status: "processing",
    }));
    const { data: createdRows } = await admin.from("ai_generations").insert(rows).select("id,input");

    let completed = 0;
    let failed = 0;
    for (const row of createdRows ?? []) {
      const productName = row.input?.name ?? "Product";
      try {
        let output: Record<string, unknown>;
        let usage = { input: 0, output: 0 };
        let model = "fallback";
        try {
          const ai = await runAiJson({
            prompt: `Generate product description JSON for ${productName} in tone ${body.tone ?? "educational"}.
Return keys: title, short_description, long_description, bullet_points[], seo_title, seo_description, suggested_tags[], usage_instructions`,
            maxTokens: 700,
          });
          output = ai.parsed;
          usage = ai.usage;
          model = ai.model;
        } catch {
          output = {
            title: productName,
            short_description: `${productName} for daily TCM wellness support.`,
            long_description: `${productName} is positioned for balanced wellness and gentle daily use.`,
            bullet_points: ["Supports daily wellness", "TCM-aligned positioning"],
            seo_title: productName,
            seo_description: `${productName} with TCM-inspired wellness support.`,
            suggested_tags: ["tcm", "wellness"],
            usage_instructions: "Use as directed on the product label.",
          };
        }

        await admin
          .from("ai_generations")
          .update({
            output,
            status: "generated",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (model !== "fallback") {
          try {
            await logTokenUsage({
              admin,
              storeId: store.id,
              feature: "product_description",
              model,
              tokensInput: usage.input,
              tokensOutput: usage.output,
              requestId: row.id,
            });
          } catch {
            // ignore usage logging failures in rollout
          }
        }
        completed += 1;
      } catch {
        await admin
          .from("ai_generations")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        failed += 1;
      }

      if (hasBatchTable) {
        await admin
          .from("ai_generation_batches")
          .update({
            completed,
            failed,
            status: completed + failed >= (products?.length ?? 0) ? (failed > 0 ? "partial_failure" : "completed") : "processing",
            completed_at: completed + failed >= (products?.length ?? 0) ? new Date().toISOString() : null,
          })
          .eq("id", batchId);
      }
    }

    return ok({
      batch_id: batchId,
      total: body.product_ids.length,
      queued: rows.length,
      completed,
      failed,
      status: failed > 0 ? (completed + failed >= rows.length ? "partial_failure" : "processing") : "completed",
      warning: hasBatchTable ? null : "Phase 3 batch table not found; using legacy ai_generations-only tracking.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
