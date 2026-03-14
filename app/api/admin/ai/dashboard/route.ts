import { ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = getSupabaseAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [chatLogs, generations, productsMissing] = await Promise.all([
    admin.from("ai_chat_logs").select("id,created_at").gte("created_at", monthStart),
    admin.from("ai_generations").select("id,kind,status,created_at,input").gte("created_at", monthStart),
    admin.from("products").select("id").or("description.is.null,description.eq."),
  ]);

  let messages = 0;
  try {
    const msg = await admin.from("ai_chat_messages").select("id", { count: "exact", head: true }).gte("created_at", monthStart);
    messages = msg.count ?? 0;
  } catch {
    messages = 0;
  }

  const queue = (generations.data ?? [])
    .filter((item) => ["processing", "generated", "approved", "rejected", "failed", "applied"].includes(item.status))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 20);
  let tokenRows: Array<{ cost_total: number }> = [];
  try {
    const tokens = await admin.from("ai_token_usage").select("feature,cost_total,tokens_input,tokens_output").gte("created_at", monthStart);
    tokenRows = (tokens.data as Array<{ cost_total: number }>) ?? [];
  } catch {
    tokenRows = [];
  }
  const totalCost = (tokenRows ?? []).reduce((sum, row) => sum + Number(row.cost_total ?? 0), 0);

  return ok({
    stats: {
      conversations_this_month: chatLogs.data?.length ?? 0,
      messages_this_month: messages,
      ai_cost_this_month: Number(totalCost.toFixed(2)),
      content_generated: generations.data?.length ?? 0,
      products_without_descriptions: productsMissing.data?.length ?? 0,
      chat_to_cart_conversion: 0,
    },
    content_queue: queue ?? [],
    token_usage: {
      chat: { input: 0, output: 0, cost: 0 },
      content: { input: 0, output: 0, cost: 0 },
      search: { input: 0, output: 0, cost: 0 },
      quiz: { input: 0, output: 0, cost: 0 },
      total_cost: Number(totalCost.toFixed(2)),
      monthly_budget: 25,
      projected_cost: Number((totalCost * 1.3).toFixed(2)),
    },
    chat_analytics: {
      conversations_per_day: [],
      top_recommended_products: [],
      chat_to_cart_rate: 0,
      chat_to_purchase_rate: 0,
    },
  });
}
