import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  store_id: z.string().uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    const since = new Date(Date.now() - q.days * 86_400_000).toISOString();

    // AI conversations with recommendations
    let convBuilder = admin
      .from("ai_conversations")
      .select("id,product_recommendations,tokens_used_input,tokens_used_output,created_at,store_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (q.store_id) convBuilder = convBuilder.eq("store_id", q.store_id);
    const { data: conversations, error: convError } = await convBuilder;
    if (convError) throw convError;
    const convRows = conversations ?? [];

    // Count product slug appearances across all recommendations
    const slugCounts: Record<string, number> = {};
    let conversationsWithRecs = 0;
    for (const conv of convRows) {
      const recs = conv.product_recommendations as Array<{ slug?: string; product_slug?: string }> | null;
      if (recs && recs.length > 0) {
        conversationsWithRecs++;
        for (const r of recs) {
          const slug = r.slug ?? r.product_slug ?? "";
          if (slug) slugCounts[slug] = (slugCounts[slug] ?? 0) + 1;
        }
      }
    }

    // Hydrate top recommended product slugs
    const topSlugs = Object.entries(slugCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug]) => slug);

    let topProducts: Array<{ id: string; slug: string; name: string; count: number; images: unknown }> = [];
    if (topSlugs.length > 0) {
      const { data: products } = await admin
        .from("products")
        .select("id,slug,name,images")
        .in("slug", topSlugs);
      topProducts = (products ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        count: slugCounts[p.slug] ?? 0,
        images: p.images,
      })).sort((a, b) => b.count - a.count);
    }

    // Token usage stats
    let tokenBuilder = admin
      .from("ai_token_usage")
      .select("feature,tokens_input,tokens_output,cost_total,created_at")
      .gte("created_at", since);
    if (q.store_id) tokenBuilder = tokenBuilder.eq("store_id", q.store_id);
    const { data: tokenRows } = await tokenBuilder;

    const featureCosts: Record<string, number> = {};
    let totalCost = 0;
    for (const row of tokenRows ?? []) {
      const cost = Number(row.cost_total ?? 0);
      featureCosts[row.feature ?? "unknown"] = (featureCosts[row.feature ?? "unknown"] ?? 0) + cost;
      totalCost += cost;
    }

    // Weekly conversation trend
    const weeklyBuckets: Record<string, number> = {};
    for (const conv of convRows) {
      const d = new Date(conv.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weeklyBuckets[key] = (weeklyBuckets[key] ?? 0) + 1;
    }
    const trend = Object.entries(weeklyBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count }));

    return ok({
      total_conversations: convRows.length,
      conversations_with_recs: conversationsWithRecs,
      total_unique_products_recommended: Object.keys(slugCounts).length,
      top_products: topProducts,
      feature_costs: featureCosts,
      total_cost: Number(totalCost.toFixed(4)),
      trend,
      days: q.days,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
