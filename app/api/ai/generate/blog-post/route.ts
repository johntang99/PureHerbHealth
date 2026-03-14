import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiJson } from "@/lib/ai/client";
import { logTokenUsage } from "@/lib/ai/cost";

const schema = z.object({
  store_slug: z.string().default("pureherbhealth"),
  topic: z.string().min(1),
  target_keywords: z.array(z.string()).default([]),
  word_count_target: z.number().int().min(500).max(2500).default(1200),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) return ok({ error: "Store not found" }, { status: 404 });
    const prompt = `Generate JSON for TCM blog post.
Topic: ${body.topic}
Keywords: ${body.target_keywords.join(", ")}
Word count target: ${body.word_count_target}
Return keys: title, meta_description, body, internal_link_suggestions, social_snippets, estimated_read_time`;

    let output: Record<string, unknown>;
    let usage = { input: 0, output: 0 };
    let model = "fallback";
    try {
      const ai = await runAiJson({ prompt, maxTokens: 1300 });
      output = ai.parsed;
      usage = ai.usage;
      model = ai.model;
    } catch {
      output = {
        title: body.topic,
        meta_description: `${body.topic} with TCM wellness insights.`,
        body: `## ${body.topic}\n\nThis draft introduces a TCM perspective and practical daily tips.`,
        internal_link_suggestions: [],
        social_snippets: { twitter: body.topic, facebook: body.topic, instagram: body.topic },
        estimated_read_time: 6,
      };
    }

    const generationId = crypto.randomUUID();
    await admin.from("ai_generations").insert({
      id: generationId,
      store_id: store.id,
      kind: "blog_post",
      input: body,
      output,
      status: "generated",
    });
    await admin.from("content").insert({
      store_id: store.id,
      type: "blog_post",
      slug: String(output.title ?? body.topic)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      title: String(output.title ?? body.topic),
      body_markdown: String(output.body ?? ""),
      status: "draft",
    });
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "blog_post",
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
