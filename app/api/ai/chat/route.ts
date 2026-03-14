import { aiChatSchema } from "@/lib/utils/validation";
import { handleApiError } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStore } from "@/lib/cart/service";
import { runAiText } from "@/lib/ai/client";
import { applySafetyFilters } from "@/lib/ai/safety";
import { extractRecommendations, hydrateRecommendations } from "@/lib/ai/recommendations";
import { logTokenUsage } from "@/lib/ai/cost";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = aiChatSchema.parse(await request.json());
    const admin = getSupabaseAdminClient();
    const store = await resolveStore(admin, body.store_slug);
    if (!store) throw new Error("Store not found");
    const lastUserMessage = body.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

    const profileId = body.customer_profile?.customer_id ?? null;
    let hourlyCount = 0;
    let dailyCount = 0;
    try {
      const { count } = await admin
        .from("ai_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", body.session_id)
        .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
      hourlyCount = count ?? 0;
      if (profileId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const daily = await admin
          .from("ai_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profileId)
          .gte("created_at", startOfDay.toISOString());
        dailyCount = daily.count ?? 0;
      }
    } catch {
      hourlyCount = 0;
      dailyCount = 0;
    }
    if (hourlyCount >= 20 || dailyCount >= 100) {
      const stream = new ReadableStream({
        start(controller) {
          const retryAfter = hourlyCount >= 20 ? 60 * 60 : 24 * 60 * 60;
          controller.enqueue(
            sse("error", {
              code: "RATE_LIMITED",
              message: "Rate limit reached. Please wait before sending another message.",
              retry_after_seconds: retryAfter,
            }),
          );
          controller.close();
        },
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
    }

    const { data: catalogRows } = await admin
      .from("store_products")
      .select("products:product_id(id,slug,name,short_description,price_cents,images)")
      .eq("store_id", store.id)
      .eq("enabled", true)
      .limit(25);
    const catalog = (catalogRows ?? [])
      .map((row) => (Array.isArray(row.products) ? row.products[0] : row.products))
      .filter(Boolean)
      .map((product) => `- ${product.name} (slug: ${product.slug}) | ${product.short_description ?? ""}`);
    const system = `You are a TCM wellness advisor. Keep answers educational and safe.
You may recommend at most 3 products and include tag format:
[PRODUCT_REC: product_slug | relevance_reason | tcm_relevance | confidence_score]
Response format rules:
- Use short paragraphs and bullet points only.
- Avoid markdown tables and avoid long heading chains.
- Keep response concise and readable on mobile.
Catalog:\n${catalog.join("\n")}`;

    let aiText = "";
    let model = "fallback";
    let usage = { input: 0, output: 0 };
    try {
      const result = await runAiText({
        system,
        prompt: `Conversation locale: ${body.locale}\nCustomer: ${JSON.stringify(body.customer_profile ?? {})}\nLast user message: ${lastUserMessage}`,
        maxTokens: 800,
      });
      aiText = result.text;
      model = result.model;
      usage = result.usage;
    } catch {
      aiText =
        body.locale === "zh"
          ? "我收到了你的问题。根据中医养生原则，我建议先从作息、饮食和压力管理入手。"
          : "I received your question. From a TCM wellness perspective, begin with sleep rhythm, diet balance, and stress support.";
    }

    const extracted = extractRecommendations(aiText);
    const hydrated = await hydrateRecommendations(admin, store.id, extracted.recommendations);
    const safe = applySafetyFilters(extracted.cleanText, hydrated.length > 0);
    const conversationId = crypto.randomUUID();
    const messageId = crypto.randomUUID();

    try {
      await admin.from("ai_chat_messages").insert({
        session_id: body.session_id,
        profile_id: profileId,
      });
    } catch {
      // ignore if phase-3 tables are not migrated yet
    }
    const conversationPayload = {
      id: conversationId,
      store_id: store.id,
      profile_id: body.customer_profile?.customer_id ?? null,
      session_id: body.session_id,
      messages: [
        { id: crypto.randomUUID(), role: "user", content: lastUserMessage, timestamp: new Date().toISOString() },
        { id: messageId, role: "assistant", content: safe.filtered_content, timestamp: new Date().toISOString() },
      ],
      product_recommendations: hydrated,
      tokens_used_input: usage.input,
      tokens_used_output: usage.output,
    };
    const { error: conversationError } = await admin.from("ai_conversations").insert(conversationPayload);
    if (conversationError) {
      await admin.from("ai_chat_logs").insert({
        store_id: store.id,
        profile_id: body.customer_profile?.customer_id ?? null,
        locale: body.locale,
        input: lastUserMessage,
        output: safe.filtered_content,
      });
    }
    if (model !== "fallback") {
      try {
        await logTokenUsage({
          admin,
          storeId: store.id,
          feature: "chat",
          model,
          tokensInput: usage.input,
          tokensOutput: usage.output,
          requestId: conversationId,
        });
      } catch {
        // ignore missing tracking table during rollout
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        const chunks = safe.filtered_content.split(/(\s+)/).filter(Boolean);
        chunks.forEach((token) => controller.enqueue(sse("text", { token })));
        if (hydrated.length) controller.enqueue(sse("products", { products: hydrated }));
        controller.enqueue(
          sse("done", {
            conversation_id: conversationId,
            message_id: messageId,
            tokens_used: usage.input + usage.output,
          }),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
