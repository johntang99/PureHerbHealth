import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  herb_name: z.string().min(1),
  chinese_name: z.string().optional().default(""),
  pinyin: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });
    const prompt = `Generate JSON herb profile for:
English: ${body.herb_name}
Chinese: ${body.chinese_name}
Pinyin: ${body.pinyin}
Return keys: overview, tcm_properties, traditional_uses, modern_research, how_to_use, precautions, related_product_ids`;

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
        overview: `${body.herb_name} is traditionally valued in TCM wellness practice.`,
        tcm_properties: { nature: "neutral", flavor: ["sweet"], meridians: ["Spleen"], element: "Earth", category: "General" },
        traditional_uses: "Traditionally used for daily wellness support.",
        modern_research: "Modern research is ongoing.",
        how_to_use: { forms: ["capsule", "tea"], preparation_notes: "Use as directed.", common_combinations: [] },
        precautions: "Consult your healthcare provider if pregnant or on medication.",
        related_product_ids: [],
      };
    }

    const generationId = crypto.randomUUID();
    await admin.from("ai_generations").insert({
      id: generationId,
      store_id: store.id,
      kind: "herb_profile",
      input: body,
      output,
      status: "generated",
    });
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "herb_profile",
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
