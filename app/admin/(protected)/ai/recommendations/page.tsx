"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type ProductRec = {
  id: string;
  slug: string;
  name: string;
  count: number;
  images: Array<{ url: string; alt: string }> | null;
};

type FeatureCosts = Record<string, number>;
type TrendPoint = { week: string; count: number };

type AnalyticsData = {
  total_conversations: number;
  conversations_with_recs: number;
  total_unique_products_recommended: number;
  top_products: ProductRec[];
  feature_costs: FeatureCosts;
  total_cost: number;
  trend: TrendPoint[];
  days: number;
};

const FEATURE_LABELS: Record<string, string> = {
  chat:                "AI Chat",
  product_description: "Product Descriptions",
  blog_post:           "Blog Posts",
  herb_profile:        "Herb Profiles",
  condition_guide:     "Condition Guides",
  search:              "Search",
  constitution_quiz:   "Constitution Quiz",
};

const DAYS_OPTIONS = [
  { value: 30,  label: "Last 30 days" },
  { value: 60,  label: "Last 60 days" },
  { value: 90,  label: "Last 90 days" },
  { value: 180, label: "Last 6 months" },
];

export default function RecommendationsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/ai/recommendations?days=${days}`, { cache: "no-store" });
      const json = (await res.json()) as AnalyticsData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const maxTrend = data ? Math.max(...data.trend.map((p) => p.count), 1) : 1;
  const maxRecCount = data?.top_products[0]?.count ?? 1;
  const recRate = data && data.total_conversations > 0
    ? Math.round((data.conversations_with_recs / data.total_conversations) * 100)
    : 0;

  const totalFeatureCost = data ? Object.values(data.feature_costs).reduce((a, b) => a + b, 0) : 0;
  const featureCostEntries = data
    ? Object.entries(data.feature_costs).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Recommendations</h1>
          <p className={`text-[13px] ${t.muted}`}>AI-powered product recommendations and usage analytics</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#2D8C54] focus:outline-none"
        >
          {DAYS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className={t.alertLoading}>Loading analytics…</div>}
      {error && <div className={t.alertError}>{error}</div>}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>AI Conversations</p>
              <p className={t.statValue}>{data.total_conversations}</p>
              <p className={`text-[12px] ${t.muted}`}>last {data.days} days</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>With Recs</p>
              <p className={t.statValue}>{data.conversations_with_recs}</p>
              <p className={`text-[12px] ${t.muted}`}>{recRate}% rec rate</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>Unique Products</p>
              <p className={t.statValue}>{data.total_unique_products_recommended}</p>
              <p className={`text-[12px] ${t.muted}`}>recommended</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>AI Cost</p>
              <p className={t.statValue}>${data.total_cost.toFixed(2)}</p>
              <p className={`text-[12px] ${t.muted}`}>last {data.days} days</p>
            </div>
          </div>

          {/* Top products + Cost breakdown */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Top recommended products */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">Most Recommended Products</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Products AI suggests most often in chat</p>
              </div>
              {data.top_products.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-gray-400">No recommendation data yet.</p>
                  <p className="mt-1 text-[12px] text-gray-300">Recommendations appear as customers use the AI chat.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 px-5">
                  {data.top_products.map((p, i) => {
                    const imgUrl = Array.isArray(p.images) ? p.images[0]?.url : null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 py-3">
                        <span className="text-[12px] font-bold text-gray-300 w-4 shrink-0">{i + 1}</span>
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={p.name} className="h-10 w-10 rounded-lg border border-gray-100 object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-300 text-lg">
                            🌿
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-gray-800">{p.name}</p>
                          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-[#2D8C54]"
                              style={{ width: `${(p.count / maxRecCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-semibold text-gray-700">{p.count}×</p>
                        </div>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="shrink-0 rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 hover:border-[#2D8C54] hover:text-[#2D8C54]"
                        >
                          Edit
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* AI cost by feature */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">AI Cost Breakdown</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Total: ${data.total_cost.toFixed(4)} USD in {data.days} days
                </p>
              </div>
              <div className="space-y-3 px-5 py-4">
                {featureCostEntries.length === 0 ? (
                  <p className="text-[13px] text-gray-400">No AI usage recorded.</p>
                ) : (
                  featureCostEntries.map(([feature, cost]) => {
                    const pct = totalFeatureCost > 0 ? (cost / totalFeatureCost) * 100 : 0;
                    return (
                      <div key={feature}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[13px] text-gray-700">
                            {FEATURE_LABELS[feature] ?? feature}
                          </span>
                          <span className="text-[12px] font-semibold text-gray-700">
                            ${cost.toFixed(4)}
                            <span className="ml-1 text-[11px] font-normal text-gray-400">({Math.round(pct)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-[#2D8C54] opacity-70" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Link to AI engine for queue management */}
              <div className="border-t border-gray-100 px-5 py-3">
                <Link href="/admin/ai" className="flex items-center justify-between text-[13px] text-gray-500 hover:text-[#2D8C54]">
                  <span>Manage AI content generation queue</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Weekly conversation trend */}
          {data.trend.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">Weekly AI Chat Activity</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-end gap-1" style={{ height: 80 }}>
                  {data.trend.map((pt) => (
                    <div key={pt.week} className="group relative flex flex-1 flex-col items-center">
                      <div
                        className="w-full rounded-t bg-[#2D8C54] opacity-80 transition-opacity group-hover:opacity-100"
                        style={{ height: `${(pt.count / maxTrend) * 72}px`, minHeight: pt.count > 0 ? 4 : 0 }}
                      />
                      <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        {pt.week}: {pt.count}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex gap-1">
                  {data.trend.map((pt) => (
                    <div key={pt.week} className="flex-1 truncate text-center text-[9px] text-gray-300">
                      {pt.week.slice(5)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* How it works callout */}
          {data.total_conversations === 0 && (
            <div className="rounded-xl border border-[#2D8C54]/20 bg-[#2D8C54]/5 px-5 py-5">
              <p className="text-[13px] font-semibold text-[#2D8C54]">How recommendations work</p>
              <ul className="mt-2 space-y-1 text-[13px] text-gray-600">
                <li>• Customer starts a conversation with the AI wellness consultant</li>
                <li>• AI analyzes symptoms and goals, then suggests relevant products using <code className="rounded bg-white px-1 text-[11px]">[PRODUCT_REC: slug | reason]</code> tags</li>
                <li>• Recommendations are extracted, hydrated from the product catalog, and shown to the customer</li>
                <li>• All conversations and recommendations are logged here for analytics</li>
              </ul>
              <Link href="/en/chat" target="_blank"
                className="mt-3 inline-block rounded-lg border border-[#2D8C54] px-3 py-1.5 text-[12px] font-medium text-[#2D8C54] hover:bg-[#2D8C54] hover:text-white transition-colors">
                Try AI Chat →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
