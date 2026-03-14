import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  condition_name: z.string().min(1),
  tcm_pattern: z.string().min(1),
  additional_patterns: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });

    const prompt = `Generate JSON TCM condition guide.
Condition: ${body.condition_name}
Pattern: ${body.tcm_pattern}
Additional patterns: ${(body.additional_patterns ?? []).join(", ")}
Return keys: overview, tcm_perspective, lifestyle_recommendations, product_recommendations, disclaimer`;

    let output: Record<string, unknown>;
    let usage = { input: 0, output: 0 };
    let model = "fallback";
    try {
      const ai = await runAiJson({ prompt, maxTokens: 1200 });
      output = ai.parsed;
      usage = ai.usage;
      model = ai.model;
    } catch {
      output = {
        overview: `${body.condition_name} can be viewed through a TCM pattern lens for wellness support.`,
        tcm_perspective: `In TCM, ${body.tcm_pattern} may reflect a pattern imbalance.`,
        lifestyle_recommendations: {
          diet: ["Favor warm, cooked foods."],
          exercise: ["Use consistent gentle movement."],
          daily_habits: ["Maintain regular sleep and meals."],
        },
        product_recommendations: [],
        disclaimer: "Educational only. Not medical advice.",
      };
    }

    const generationId = crypto.randomUUID();
    await admin.from("ai_generations").insert({
      id: generationId,
      store_id: store.id,
      kind: "condition_guide",
      input: body,
      output,
      status: "generated",
    });
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "condition_guide",
          model,
          tokensInput: usage.input,
          tokensOutput: usage.output,
          requestId: generationId,
        });
      } catch {
        // ignore missing tracking table during rollout
      }
    }

    return ok({
      generation_id: generationId,
      ...output,
      tokens_used: usage,
      status: "draft",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
