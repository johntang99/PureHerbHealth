"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type StoreItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  is_active: boolean;
  contact_email: string | null;
  stripe_connect_onboarded: boolean;
  revenue_share_platform_pct: number;
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [storesRes, meRes] = await Promise.all([
          fetch("/api/stores", { cache: "no-store" }),
          fetch("/api/account/me", { cache: "no-store" }),
        ]);
        const data = (await storesRes.json()) as { stores?: StoreItem[]; error?: string };
        if (!storesRes.ok) throw new Error(data.error || "Failed to load stores");
        if (!cancelled) setStores(data.stores || []);
        if (meRes.ok) {
          const me = (await meRes.json()) as { profile?: { role?: string } };
          if (!cancelled) setIsSuperAdmin(me.profile?.role === "platform_super_admin");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(store: StoreItem) {
    if (!confirm(`Delete "${store.name}"? This cannot be undone.`)) return;
    setDeletingId(store.id);
    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { alert(json.error ?? "Delete failed"); return; }
      setStores((prev) => prev.filter((s) => s.id !== store.id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Stores</h1>
          <p className={`text-[13px] ${t.muted}`}>All connected stores on this platform</p>
        </div>
        <Link
          href="/admin/stores/new"
          className="rounded-lg bg-[#2D8C54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#22764a]"
        >
          ＋ New Store Wizard
        </Link>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">
          Loading stores...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Store", "Slug", "Type", "Status", "Stripe", "Revenue Split", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-b border-gray-50 transition hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{store.name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-gray-500">{store.slug}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{store.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      store.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${store.is_active ? "bg-green-500" : "bg-red-500"}`} />
                      {store.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      store.stripe_connect_onboarded
                        ? "bg-blue-50 text-blue-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {store.stripe_connect_onboarded ? "Connected" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{store.revenue_share_platform_pct}% platform</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { href: `/admin/stores/${store.id}`,          label: "View"      },
                        { href: `/admin/stores/${store.id}/settings`, label: "Settings"  },
                        { href: `/admin?store_id=${store.id}`,        label: "Dashboard" },
                        { href: `/admin/orders?store_id=${store.id}`, label: "Orders"    },
                      ].map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
                        >
                          {link.label}
                        </Link>
                      ))}
                      {isSuperAdmin && store.slug !== "pureherbhealth" && (
                        <button
                          onClick={() => void handleDelete(store)}
                          disabled={deletingId === store.id}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === store.id ? "Deleting…" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    No stores found. Use the wizard to create your first store.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
