import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  product_data: z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    form: z.string().min(1),
    key_ingredients: z.array(z.string()).optional(),
    existing_description: z.string().optional(),
  }),
  tone: z.enum(["professional", "educational", "conversational"]).optional(),
  include_seo: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });

    const prompt = `Generate product description JSON.
Name: ${body.product_data.name}
Category: ${body.product_data.category}
Form: ${body.product_data.form}
Ingredients: ${(body.product_data.key_ingredients ?? []).join(", ")}
Tone: ${body.tone ?? "educational"}
Return JSON with keys: title, short_description, long_description, bullet_points[], seo_title, seo_description, suggested_tags[], usage_instructions`;

    let output: Record<string, unknown>;
    let usage = { input: 0, output: 0 };
    let model = "fallback";
    try {
      const ai = await runAiJson({ prompt, maxTokens: 900 });
      output = ai.parsed;
      usage = ai.usage;
      model = ai.model;
    } catch {
      output = {
        title: body.product_data.name,
        short_description: `${body.product_data.name} for daily TCM wellness support.`,
        long_description: `${body.product_data.name} is positioned for balanced wellness and gentle daily use.`,
        bullet_points: ["Supports daily wellness", "TCM-aligned positioning", "Quality-focused formulation"],
        seo_title: body.product_data.name,
        seo_description: `${body.product_data.name} with TCM-inspired wellness support.`,
        suggested_tags: ["tcm", "wellness", body.product_data.category.toLowerCase()],
        usage_instructions: `Use ${body.product_data.form} as directed on label.`,
      };
    }

    const generationId = crypto.randomUUID();
    await admin.from("ai_generations").insert({
      id: generationId,
      store_id: store.id,
      kind: "product_description",
      input: body,
      output,
      status: "generated",
    });
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "product_description",
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
      status: "generated",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
