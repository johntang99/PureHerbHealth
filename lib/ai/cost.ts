import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL_PRICING = {
  sonnet: { input: 3.0, output: 15.0 },
  haiku: { input: 0.25, output: 1.25 },
} as const;

function modelKind(model: string) {
  return model.toLowerCase().includes("haiku") ? "haiku" : "sonnet";
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  const pricing = MODEL_PRICING[modelKind(model)];
  const inCost = (inputTokens / 1_000_000) * pricing.input;
  const outCost = (outputTokens / 1_000_000) * pricing.output;
  const total = inCost + outCost;
  return {
    input: Number(inCost.toFixed(4)),
    output: Number(outCost.toFixed(4)),
    total: Number(total.toFixed(4)),
  };
}

export async function logTokenUsage(params: {
  admin: SupabaseClient;
  storeId: string;
  feature: "chat" | "product_description" | "blog_post" | "herb_profile" | "condition_guide" | "search" | "constitution_quiz";
  model: string;
  tokensInput: number;
  tokensOutput: number;
  requestId: string;
}) {
  const costs = calculateCost(params.model, params.tokensInput, params.tokensOutput);
  await params.admin.from("ai_token_usage").insert({
    store_id: params.storeId,
    feature: params.feature,
    model: params.model,
    tokens_input: params.tokensInput,
    tokens_output: params.tokensOutput,
    cost_input: costs.input,
    cost_output: costs.output,
    cost_total: costs.total,
    request_id: params.requestId,
  });
}
