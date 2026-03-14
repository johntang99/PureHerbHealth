import { z } from "zod";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CONSTITUTION_LABELS: Record<string, { english_name: string; chinese_name: string; color: string }> = {
  balanced:          { english_name: "Balanced",          chinese_name: "Ping He",  color: "#2D8C54" },
  qi_deficient:      { english_name: "Qi Deficiency",     chinese_name: "Qi Xu",    color: "#60a5fa" },
  yang_deficient:    { english_name: "Yang Deficiency",   chinese_name: "Yang Xu",  color: "#818cf8" },
  yin_deficient:     { english_name: "Yin Deficiency",    chinese_name: "Yin Xu",   color: "#f472b6" },
  phlegm_damp:       { english_name: "Phlegm-Dampness",   chinese_name: "Tan Shi",  color: "#a78bfa" },
  damp_heat:         { english_name: "Damp-Heat",         chinese_name: "Shi Re",   color: "#fb923c" },
  blood_stagnation:  { english_name: "Blood Stagnation",  chinese_name: "Xue Yu",   color: "#f87171" },
  qi_stagnation:     { english_name: "Qi Stagnation",     chinese_name: "Qi Yu",    color: "#facc15" },
  inherited_special: { english_name: "Inherited/Special", chinese_name: "Te Bing",  color: "#94a3b8" },
};

const querySchema = z.object({
  store_id: z.string().uuid().optional(),
  days: z.coerce.number().int().min(1).max(365).default(90),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const admin = getSupabaseAdminClient();

    const since = new Date(Date.now() - q.days * 86_400_000).toISOString();

    let builder = admin
      .from("constitution_assessments")
      .select("id,primary_constitution,secondary_constitution,confidence,element_scores,created_at,store_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (q.store_id) builder = builder.eq("store_id", q.store_id);

    const { data, error } = await builder;
    if (error) throw error;
    const rows = data ?? [];

    // Count by primary constitution
    const typeCounts: Record<string, number> = {};
    for (const row of rows) {
      const k = row.primary_constitution ?? "unknown";
      typeCounts[k] = (typeCounts[k] ?? 0) + 1;
    }

    // Avg confidence
    const avgConfidence = rows.length
      ? rows.reduce((sum, r) => sum + Number(r.confidence ?? 0), 0) / rows.length
      : 0;

    // Element balance averages
    const elementSums = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    let elementCount = 0;
    for (const row of rows) {
      const el = row.element_scores as Record<string, number> | null;
      if (el) {
        elementSums.wood  += el.wood  ?? 0;
        elementSums.fire  += el.fire  ?? 0;
        elementSums.earth += el.earth ?? 0;
        elementSums.metal += el.metal ?? 0;
        elementSums.water += el.water ?? 0;
        elementCount++;
      }
    }
    const elementAverages = elementCount > 0
      ? Object.fromEntries(Object.entries(elementSums).map(([k, v]) => [k, Math.round(v / elementCount)]))
      : { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    // Weekly trend (last 12 weeks bucketed)
    const weeklyBuckets: Record<string, number> = {};
    for (const row of rows) {
      const d = new Date(row.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weeklyBuckets[key] = (weeklyBuckets[key] ?? 0) + 1;
    }
    const trend = Object.entries(weeklyBuckets)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count }));

    // Build distribution array sorted by count
    const distribution = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        pct: rows.length ? Math.round((count / rows.length) * 100) : 0,
        ...(CONSTITUTION_LABELS[type] ?? { english_name: type, chinese_name: "", color: "#94a3b8" }),
      }))
      .sort((a, b) => b.count - a.count);

    // Recent assessments (latest 10)
    const recent = rows.slice(0, 10).map((r) => ({
      id: r.id,
      primary_constitution: r.primary_constitution,
      secondary_constitution: r.secondary_constitution,
      confidence: r.confidence,
      created_at: r.created_at,
      label: CONSTITUTION_LABELS[r.primary_constitution ?? ""] ?? null,
    }));

    return ok({
      total: rows.length,
      avg_confidence: Number(avgConfidence.toFixed(2)),
      distribution,
      element_averages: elementAverages,
      trend,
      recent,
      days: q.days,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
