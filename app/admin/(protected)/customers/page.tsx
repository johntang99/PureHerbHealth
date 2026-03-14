"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type CustomerRow = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string | null;
  store_id: string | null;
  created_at: string;
  order_count: number;
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100" });
    if (search) params.set("search", search);
    void fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { customers?: CustomerRow[]; total?: number }) => {
        setCustomers(d.customers ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Customer Management</h1>
          <p className={`text-[13px] ${t.muted}`}>{total} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={t.input}
        />
      </div>

      {loading && <div className={t.alertLoading}>Loading customers…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Customer", "Email", "Orders", "Joined", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={t.tableRow}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {c.full_name ?? <span className="italic text-gray-400">No name</span>}
                    </p>
                    <p className="font-mono text-[11px] text-gray-400">{c.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email ?? <span className="italic text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.order_count > 0 ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        {c.order_count} order{c.order_count !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[12px] text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
                      >
                        View Profile
                      </Link>
                      {c.email && (
                        <Link
                          href={`/admin/orders?customer_email=${encodeURIComponent(c.email)}`}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
                        >
                          Orders
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    {search ? "No customers match your search." : "No customers yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary stats */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Customers",
              value: total,
              icon: "👥",
            },
            {
              label: "With Orders",
              value: customers.filter((c) => c.order_count > 0).length,
              icon: "📦",
            },
            {
              label: "Avg Orders / Customer",
              value: (
                customers.reduce((sum, c) => sum + c.order_count, 0) /
                Math.max(customers.filter((c) => c.order_count > 0).length, 1)
              ).toFixed(1),
              icon: "📈",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <span className="text-xl">{s.icon}</span>
              <p className={`mt-2 ${t.statLabel}`}>{s.label}</p>
              <p className={t.statValueSm}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
