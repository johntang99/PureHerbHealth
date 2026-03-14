"use client";

import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type DashboardResponse = {
  stats: {
    conversations_this_month: number;
    messages_this_month: number;
    ai_cost_this_month: number;
    content_generated: number;
    products_without_descriptions: number;
  };
  content_queue: Array<{
    id: string;
    kind: string;
    status: string;
    created_at: string;
    input?: Record<string, unknown>;
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700",
  processing: "bg-blue-50 text-blue-700",
  completed:  "bg-green-50 text-green-700",
  failed:     "bg-red-50 text-red-600",
  rejected:   "bg-red-50 text-red-600",
};

export default function AdminAiPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetch("/api/admin/ai/dashboard", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => { setData(json); setLoading(false); });
  }, []);

  async function action(id: string, type: "approve" | "reject" | "apply") {
    setActioning(id + type);
    await fetch(`/api/admin/ai/generation/${id}/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const refreshed = await fetch("/api/admin/ai/dashboard", { cache: "no-store" }).then((res) => res.json());
    setData(refreshed);
    setActioning(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-xl font-bold ${t.heading}`}>AI Engine</h1>
        <p className={`text-[13px] ${t.muted}`}>Usage statistics and content generation queue</p>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">
          Loading AI dashboard...
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              { label: "Conversations", value: data.stats.conversations_this_month,           icon: "💬" },
              { label: "Messages",      value: data.stats.messages_this_month,                icon: "📨" },
              { label: "AI Cost",       value: `$${data.stats.ai_cost_this_month.toFixed(2)}`, icon: "💰" },
              { label: "Generated",     value: data.stats.content_generated,                  icon: "✨" },
              { label: "Missing Desc",  value: data.stats.products_without_descriptions,      icon: "⚠" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <div className="mb-1 text-lg">{s.icon}</div>
                <p className={t.statLabel}>{s.label}</p>
                <p className={t.statValueSm}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Content queue */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className={`text-[13px] font-semibold ${t.heading}`}>Content Generation Queue</p>
              <p className={`text-[11px] ${t.muted}`}>{data.content_queue.length} items</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.content_queue.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.kind}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {item.status}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["approve", "reject", "apply"] as const).map((act) => (
                      <button
                        key={act}
                        disabled={actioning === item.id + act}
                        onClick={() => void action(item.id, act)}
                        className={`rounded-md border px-3 py-1 text-[12px] font-medium capitalize transition disabled:opacity-40 ${
                          act === "apply"
                            ? "border-[#2D8C54]/40 text-[#2D8C54] hover:bg-[#2D8C54]/5"
                            : act === "reject"
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {actioning === item.id + act ? "…" : act}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {data.content_queue.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  Queue is empty. All content generation tasks are processed.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
