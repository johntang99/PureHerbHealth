import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { getSearchModel, runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";
import { createHash } from "crypto";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  query: z.string().min(1),
  context: z
    .object({
      current_category: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ interpreted: false, fallback_query: body.query, cached: false });

    const queryHash = createHash("md5").update(body.query.trim().toLowerCase()).digest("hex");
    const nowIso = new Date().toISOString();
    let cached: { interpretation: Record<string, unknown>; hit_count: number } | null = null;
    try {
      const result = await admin
        .from("ai_search_cache")
        .select("interpretation,hit_count")
        .eq("query_hash", queryHash)
        .gt("expires_at", nowIso)
        .maybeSingle();
      cached = (result.data as { interpretation: Record<string, unknown>; hit_count: number } | null) ?? null;
    } catch {
      cached = null;
    }
    if (cached?.interpretation) {
      void admin.from("ai_search_cache").update({ hit_count: (cached.hit_count ?? 0) + 1 }).eq("query_hash", queryHash);
      return ok({ interpreted: true, interpretation: cached.interpretation, fallback_query: body.query, cached: true });
    }

    const prompt = `Interpret TCM storefront query and return JSON only.
Query: ${body.query}
Context category: ${body.context?.current_category ?? ""}
Return keys: keywords[], category_slugs[], tcm_properties{nature,meridians,element,flavor}, intent, confidence, rewritten_query`;

    let interpretation: Record<string, unknown> | null = null;
    let usage = { input: 0, output: 0 };
    let model = getSearchModel();
    try {
      const ai = await runAiJson({ prompt, model, maxTokens: 280 });
      interpretation = ai.parsed;
      usage = ai.usage;
      model = ai.model;
    } catch {
      interpretation = null;
    }

    if (!interpretation || Number(interpretation.confidence ?? 0) < 0.3) {
      return ok({
        interpreted: false,
        interpretation: {
          keywords: body.query.split(/\s+/).filter(Boolean).slice(0, 8),
          category_slugs: [],
          tcm_properties: {},
          intent: "product_search",
          confidence: 0.2,
          rewritten_query: body.query,
        },
        fallback_query: body.query,
        cached: false,
      });
    }

    try {
      await admin.from("ai_search_cache").upsert({
        query_hash: queryHash,
        query_original: body.query,
        interpretation,
        hit_count: 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch {
      // ignore cache persistence errors during rollout
    }
    try {
      await logTokenUsage({
        admin,
        storeId: store.id,
        feature: "search",
        model,
        tokensInput: usage.input,
        tokensOutput: usage.output,
        requestId: queryHash,
      });
    } catch {
      // ignore missing table during rollout
    }

    return ok({
      interpreted: true,
      interpretation,
      fallback_query: body.query,
      cached: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
