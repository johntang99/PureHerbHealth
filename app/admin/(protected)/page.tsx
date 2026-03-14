"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StoreSelector, type StoreOption } from "@/components/admin/store-selector";
import { adminTheme as t } from "@/lib/admin/theme";

type DashboardData = {
  store_id: string;
  revenue_cents: number;
  orders: number;
  top_products: Array<{ product_id: string; name: string; quantity: number }>;
  error?: string;
};

type AnalyticsData = {
  summary?: { total_revenue: number; total_orders: number; avg_order_value: number };
  chart_data?: Array<{ date: string; revenue: number; orders: number }>;
  error?: string;
};

const QUICK_LINKS = [
  { href: "/admin/orders",                icon: "📦", label: "View Orders",       sub: "All order management" },
  { href: "/admin/products",              icon: "🌿", label: "Products",           sub: "Manage catalog"       },
  { href: "/admin/stores",                icon: "🏪", label: "Stores",             sub: "All connected stores" },
  { href: "/admin/stores/new",            icon: "＋", label: "Onboard Store",      sub: "Wizard setup"         },
  { href: "/admin/content/five-elements", icon: "☯",  label: "Five Elements CMS",  sub: "Content editor"       },
  { href: "/admin/ai",                    icon: "✦",  label: "AI Engine",          sub: "Usage & config"       },
];

export default function AdminHomePage() {
  const search = useSearchParams();
  const selectedStoreId = useMemo(() => search.get("store_id") || "all", [search]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [storesRes, dashboardRes, analyticsRes] = await Promise.all([
          fetch("/api/stores", { cache: "no-store" }),
          fetch(`/api/admin/dashboard?store_id=${selectedStoreId}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics?store_id=${selectedStoreId}&period=30d`, { cache: "no-store" }),
        ]);
        const storesJson = (await storesRes.json()) as { stores?: StoreOption[]; error?: string };
        const dashboardJson = (await dashboardRes.json()) as DashboardData;
        const analyticsJson = (await analyticsRes.json()) as AnalyticsData;
        if (!cancelled) {
          setStores(storesJson.stores ?? []);
          setDashboard(dashboardJson);
          setAnalytics(analyticsJson);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [selectedStoreId]);

  const revenue = dashboard ? (dashboard.revenue_cents / 100).toFixed(2) : "—";
  const orders = dashboard ? String(dashboard.orders) : "—";
  const revenue30 = analytics?.summary ? `$${analytics.summary.total_revenue.toFixed(2)}` : "—";
  const avgOrder = analytics?.summary ? `$${analytics.summary.avg_order_value.toFixed(2)}` : "—";

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Dashboard</h1>
          <p className={`text-[13px] ${t.muted}`}>Platform overview · last 30 days</p>
        </div>
        <StoreSelector stores={stores} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Revenue",   value: `$${revenue}`, icon: "💰", delta: "+12%",    green: true  },
          { label: "Total Orders",    value: orders,        icon: "📦", delta: "+8%",     green: true  },
          { label: "30d Revenue",     value: revenue30,     icon: "📈", delta: "30 days", green: false },
          { label: "Avg Order Value", value: avgOrder,      icon: "🧾", delta: "per order", green: false },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg">{stat.icon}</span>
              <span className={`text-[11px] font-semibold ${stat.green ? "text-green-600" : t.muted}`}>
                {stat.delta}
              </span>
            </div>
            <p className={t.statLabel}>{stat.label}</p>
            <p className={t.statValue}>
              {loading ? <span className="inline-block h-6 w-20 animate-pulse rounded bg-gray-200" /> : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two-column: top products + revenue trend */}
      {!loading && dashboard && analytics && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Top products */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className={`mb-4 ${t.sectionLabel}`}>Top Products</p>
            {dashboard.top_products.length === 0 ? (
              <p className="text-sm text-gray-400">No product sales recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboard.top_products.map((item, i) => (
                  <div key={item.product_id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm text-gray-800">{item.name}</span>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      {item.quantity} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue trend */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className={`mb-4 ${t.sectionLabel}`}>Revenue Trend (30d)</p>
            {analytics.chart_data?.length ? (
              <div className="max-h-[200px] space-y-1.5 overflow-y-auto">
                {analytics.chart_data.slice(-14).map((row) => {
                  const maxRevenue = Math.max(...(analytics.chart_data ?? []).map((r) => r.revenue), 1);
                  const barPct = (row.revenue / maxRevenue) * 100;
                  return (
                    <div key={row.date} className="flex items-center gap-3 text-[12px]">
                      <span className="w-[68px] shrink-0 text-gray-400">{row.date.slice(5)}</span>
                      <div className="h-4 flex-1 rounded-sm bg-gray-100">
                        <div className="h-4 rounded-sm bg-[#2D8C54]" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="w-[60px] text-right text-gray-600">${row.revenue.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No chart data yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Quick nav grid */}
      <div>
        <p className={`mb-3 ${t.sectionLabel}`}>Quick Access</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-[#2D8C54]/40 hover:shadow-md"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">{item.label}</p>
                <p className="text-[11px] text-gray-400">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
