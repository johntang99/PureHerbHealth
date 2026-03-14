import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { CONSTITUTION_METADATA, scoreConstitution } from "@/lib/ai/constitution";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  answers: z.record(z.string(), z.enum(["a", "b", "c", "d"])),
  customer_id: z.string().uuid().optional(),
  session_id: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });

    const result = scoreConstitution(body.answers);
    const prompt = `Generate JSON explanation for constitution quiz.
Primary: ${result.primary}
Secondary: ${result.secondary ?? "none"}
Element scores: ${JSON.stringify(result.element_scores)}
Return JSON keys: explanation, lifestyle_tips[], product_recommendations[{slug,relevance_reason,tcm_relevance}]`;
    let explanation = "";
    let lifestyleTips: string[] = [];
    let productRecommendations: Array<{ slug: string; relevance_reason: string; tcm_relevance: string }> = [];
    let model = "fallback";
    let usage = { input: 0, output: 0 };
    try {
      const ai = await runAiJson({ prompt, maxTokens: 650 });
      explanation = String(ai.parsed.explanation ?? "");
      lifestyleTips = Array.isArray(ai.parsed.lifestyle_tips) ? ai.parsed.lifestyle_tips.map(String) : [];
      productRecommendations = Array.isArray(ai.parsed.product_recommendations)
        ? ai.parsed.product_recommendations.map((rec: Record<string, unknown>) => ({
            slug: String(rec.slug ?? ""),
            relevance_reason: String(rec.relevance_reason ?? ""),
            tcm_relevance: String(rec.tcm_relevance ?? ""),
          }))
        : [];
      model = ai.model;
      usage = ai.usage;
    } catch {
      explanation = `Your primary constitution tendency is ${CONSTITUTION_METADATA[result.primary].english_name}.`;
      lifestyleTips = [
        "Keep a consistent sleep schedule.",
        "Prioritize warm, easy-to-digest meals.",
        "Use moderate daily movement and stress release.",
      ];
    }

    const assessmentId = crypto.randomUUID();
    try {
      await admin.from("constitution_assessments").insert({
        id: assessmentId,
        store_id: store.id,
        profile_id: body.customer_id ?? null,
        session_id: body.session_id,
        answers: body.answers,
        scores: result.scores,
        normalized_scores: result.normalized_scores,
        primary_constitution: result.primary,
        secondary_constitution: result.secondary,
        element_scores: result.element_scores,
        confidence: result.confidence,
        explanation,
        product_recommendations: productRecommendations,
        lifestyle_tips: lifestyleTips,
        tokens_used_input: usage.input,
        tokens_used_output: usage.output,
      });
    } catch {
      // ignore persistence failure before phase migration runs
    }
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "constitution_quiz",
          model,
          tokensInput: usage.input,
          tokensOutput: usage.output,
          requestId: assessmentId,
        });
      } catch {
        // ignore missing table during rollout
      }
    }

    return ok({
      assessment_id: assessmentId,
      constitution: {
        primary: result.primary,
        secondary: result.secondary,
        chinese_name: CONSTITUTION_METADATA[result.primary].chinese_name,
        english_name: CONSTITUTION_METADATA[result.primary].english_name,
        description: CONSTITUTION_METADATA[result.primary].description,
      },
      element_scores: result.element_scores,
      confidence: result.confidence,
      explanation,
      product_recommendations: productRecommendations,
      lifestyle_tips: lifestyleTips,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
