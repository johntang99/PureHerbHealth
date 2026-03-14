"use client";

import { useCallback, useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type DistributionItem = {
  type: string;
  count: number;
  pct: number;
  english_name: string;
  chinese_name: string;
  color: string;
};

type ElementAverages = {
  wood: number; fire: number; earth: number; metal: number; water: number;
};

type TrendPoint = { week: string; count: number };

type RecentItem = {
  id: string;
  primary_constitution: string | null;
  secondary_constitution: string | null;
  confidence: number;
  created_at: string;
  label: { english_name: string; chinese_name: string; color: string } | null;
};

type AnalyticsData = {
  total: number;
  avg_confidence: number;
  distribution: DistributionItem[];
  element_averages: ElementAverages;
  trend: TrendPoint[];
  recent: RecentItem[];
  days: number;
};

const ELEMENT_META: Record<string, { icon: string; color: string; label: string }> = {
  wood:  { icon: "🌳", color: "#22c55e", label: "Wood (木)" },
  fire:  { icon: "🔥", color: "#ef4444", label: "Fire (火)" },
  earth: { icon: "⛰",  color: "#eab308", label: "Earth (土)" },
  metal: { icon: "⚙",  color: "#94a3b8", label: "Metal (金)" },
  water: { icon: "💧", color: "#3b82f6", label: "Water (水)" },
};

const DAYS_OPTIONS = [
  { value: 30,  label: "Last 30 days" },
  { value: 60,  label: "Last 60 days" },
  { value: 90,  label: "Last 90 days" },
  { value: 180, label: "Last 6 months" },
  { value: 365, label: "Last year" },
];

function fmtDt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ConstitutionAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/ai/constitution?days=${days}`, { cache: "no-store" });
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

  const maxCount = data ? Math.max(...data.distribution.map((d) => d.count), 1) : 1;
  const maxTrend = data ? Math.max(...data.trend.map((p) => p.count), 1) : 1;
  const maxElement = data ? Math.max(...Object.values(data.element_averages), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Constitution Analytics</h1>
          <p className={`text-[13px] ${t.muted}`}>TCM constitution quiz results and trends</p>
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
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>Total Assessments</p>
              <p className={t.statValue}>{data.total}</p>
              <p className={`text-[12px] ${t.muted}`}>last {data.days} days</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>Avg Confidence</p>
              <p className={t.statValue}>{Math.round(data.avg_confidence * 100)}%</p>
              <p className={`text-[12px] ${t.muted}`}>accuracy score</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className={t.statLabel}>Constitution Types</p>
              <p className={t.statValue}>{data.distribution.length}</p>
              <p className={`text-[12px] ${t.muted}`}>distinct types found</p>
            </div>
          </div>

          {/* Distribution + Elements side by side */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Constitution distribution */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">Primary Constitution Distribution</p>
              </div>
              <div className="space-y-3 px-5 py-4">
                {data.distribution.length === 0 ? (
                  <p className="text-[13px] text-gray-400">No data for this period.</p>
                ) : (
                  data.distribution.map((item) => (
                    <div key={item.type}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[13px] font-medium text-gray-800">{item.english_name}</span>
                          <span className="text-[11px] text-gray-400">{item.chinese_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-gray-700">{item.count}</span>
                          <span className="text-[11px] text-gray-400">{item.pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(item.count / maxCount) * 100}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Element balance */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">Five Element Balance (Average)</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Average element scores across all assessments</p>
              </div>
              <div className="space-y-4 px-5 py-5">
                {Object.entries(data.element_averages).map(([key, value]) => {
                  const meta = ELEMENT_META[key];
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13px]">
                          {meta?.icon} {meta?.label ?? key}
                        </span>
                        <span className="text-[13px] font-semibold text-gray-700">{value}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(value / maxElement) * 100}%`, backgroundColor: meta?.color ?? "#94a3b8" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pentagon visual */}
              <div className="flex justify-center pb-5">
                <svg width="140" height="130" viewBox="0 0 140 130" className="opacity-80">
                  {/* Pentagon shape filled */}
                  {(() => {
                    const el = data.element_averages;
                    const max = maxElement;
                    const cx = 70; const cy = 65; const r = 48;
                    const angles = [-90, -18, 54, 126, 198];
                    const keys = ["wood", "fire", "earth", "metal", "water"] as const;
                    const pts = keys.map((k, i) => {
                      const angle = (angles[i] * Math.PI) / 180;
                      const ratio = el[k] / max;
                      return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) };
                    });
                    const bg = keys.map((_, i) => {
                      const angle = (angles[i] * Math.PI) / 180;
                      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
                    });
                    const bgPath = bg.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
                    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
                    return (
                      <>
                        <path d={bgPath} fill="none" stroke="#e5e7eb" strokeWidth="1" />
                        <path d={path} fill="#2D8C54" fillOpacity="0.15" stroke="#2D8C54" strokeWidth="1.5" />
                        {keys.map((k, i) => {
                          const meta = ELEMENT_META[k];
                          const angle = (angles[i] * Math.PI) / 180;
                          const lx = cx + (r + 14) * Math.cos(angle);
                          const ly = cy + (r + 14) * Math.sin(angle);
                          return (
                            <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                              fontSize="13" fill={meta?.color ?? "#94a3b8"}>
                              {meta?.icon}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Weekly trend */}
          {data.trend.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="text-[13px] font-semibold text-gray-900">Weekly Quiz Activity</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-end gap-1" style={{ height: 80 }}>
                  {data.trend.map((pt) => (
                    <div key={pt.week} className="group relative flex flex-1 flex-col items-center">
                      <div
                        className="w-full rounded-t bg-[#2D8C54] opacity-80 transition-opacity group-hover:opacity-100"
                        style={{ height: `${(pt.count / maxTrend) * 72}px`, minHeight: pt.count > 0 ? 4 : 0 }}
                      />
                      {/* Tooltip */}
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

          {/* Recent assessments */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-900">Recent Assessments</p>
            </div>
            {data.recent.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-gray-400">No assessments in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Primary Constitution", "Secondary", "Confidence", "Date"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row) => (
                      <tr key={row.id} className={t.tableRow}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.label && (
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.label.color }} />
                            )}
                            <span className="font-medium text-gray-800">{row.label?.english_name ?? row.primary_constitution}</span>
                            {row.label?.chinese_name && (
                              <span className="text-[11px] text-gray-400">{row.label.chinese_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">
                          {row.secondary_constitution ? row.secondary_constitution.replace(/_/g, " ") : <span className="italic text-gray-300">None</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-[#2D8C54]" style={{ width: `${Math.round(row.confidence * 100)}%` }} />
                            </div>
                            <span className="text-[12px] text-gray-600">{Math.round(row.confidence * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDt(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
