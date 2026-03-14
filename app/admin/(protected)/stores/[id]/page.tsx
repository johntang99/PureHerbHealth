"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Store = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  stripe_connect_onboarded: boolean;
  revenue_share_platform_pct: number;
};

type Dashboard = {
  revenue_cents: number;
  orders: number;
  top_products: Array<{ product_id: string; name: string; quantity: number }>;
  error?: string;
};

type Analytics = {
  summary?: { total_revenue: number; total_orders: number; avg_order_value: number };
  chart_data?: Array<{ date: string; revenue: number; orders: number }>;
  error?: string;
};

export default function AdminStoreDetailPage() {
  const params = useParams<{ id: string }>();
  const storeId = useMemo(() => params?.id || "", [params]);
  const [store, setStore] = useState<Store | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [storesRes, dashboardRes, analyticsRes] = await Promise.all([
          fetch("/api/stores", { cache: "no-store" }),
          fetch(`/api/admin/dashboard?store_id=${storeId}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics?store_id=${storeId}&period=30d`, { cache: "no-store" }),
        ]);
        const storesJson = (await storesRes.json()) as { stores?: Store[]; error?: string };
        const dashboardJson = (await dashboardRes.json()) as Dashboard;
        const analyticsJson = (await analyticsRes.json()) as Analytics;
        if (!storesRes.ok) throw new Error(storesJson.error || "Failed to load store");
        if (!dashboardRes.ok) throw new Error(dashboardJson.error || "Failed to load dashboard");
        if (!analyticsRes.ok) throw new Error(analyticsJson.error || "Failed to load analytics");
        if (!cancelled) {
          setStore((storesJson.stores || []).find((c) => c.id === storeId) || null);
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
  }, [storeId]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Per-Store Dashboard</h1>
          <p className="text-[13px] text-gray-400">Store analytics and performance metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/stores/${storeId}/settings`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]">
            Edit Settings
          </Link>
          <Link href={`/admin?store_id=${storeId}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-blue-400 hover:text-blue-600">
            Global Dashboard
          </Link>
          <Link href="/admin/stores" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-400">
            ← All Stores
          </Link>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">
          Loading store data...
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && store && dashboard && analytics ? (
        <>
          {/* Store info */}
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="font-semibold text-gray-900">{store.name}</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="text-gray-400">Slug: </span>{store.slug}
              {" · "}
              <span className="text-gray-400">Active: </span>
              <span className={store.is_active ? "text-green-600" : "text-red-600"}>
                {store.is_active ? "Yes" : "No"}
              </span>
              {" · "}
              <span className="text-gray-400">Stripe: </span>
              <span className={store.stripe_connect_onboarded ? "text-green-600" : "text-yellow-600"}>
                {store.stripe_connect_onboarded ? "Connected" : "Pending"}
              </span>
              {" · "}
              <span className="text-gray-400">Platform Share: </span>
              <span className="text-gray-700">{store.revenue_share_platform_pct}%</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Revenue",     value: `$${(dashboard.revenue_cents / 100).toFixed(2)}`,         icon: "💰" },
              { label: "Orders",      value: String(dashboard.orders),                                   icon: "📦" },
              { label: "30d Revenue", value: `$${(analytics.summary?.total_revenue || 0).toFixed(2)}`,   icon: "📈" },
              { label: "Avg Order",   value: `$${(analytics.summary?.avg_order_value || 0).toFixed(2)}`, icon: "🧾" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <div className="mb-1 text-lg">{s.icon}</div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Top products */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-[13px] font-semibold text-gray-900">Top Products</p>
            </div>
            <div className="divide-y divide-gray-50 px-5">
              {dashboard.top_products.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No product sales yet.</p>
              ) : (
                dashboard.top_products.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between py-3">
                    <p className="text-sm text-gray-700">{item.name}</p>
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      {item.quantity} sold
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
