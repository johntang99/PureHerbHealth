"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type Customer = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  store_id: string | null;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  shipping_status: string;
  total: number;
  currency: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
  store_name: string;
  store_slug: string;
};

type Stats = {
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700",
  confirmed:  "bg-blue-50 text-blue-700",
  processing: "bg-blue-50 text-blue-700",
  shipped:    "bg-purple-50 text-purple-700",
  delivered:  "bg-green-50 text-green-700",
  cancelled:  "bg-red-50 text-red-600",
  refunded:   "bg-gray-100 text-gray-500",
  paid:       "bg-green-50 text-green-700",
  succeeded:  "bg-green-50 text-green-700",
  failed:     "bg-red-50 text-red-600",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDt(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id ?? "";

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, { cache: "no-store" });
      const data = (await res.json()) as {
        customer?: Customer; orders?: OrderRow[]; stats?: Stats; error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load customer");
      setCustomer(data.customer ?? null);
      setOrders(data.orders ?? []);
      setStats(data.stats ?? null);
      setEditName(data.customer?.full_name ?? "");
      setEditEmail(data.customer?.email ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ full_name: editName, email: editEmail }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCustomer((c) => c ? { ...c, full_name: editName, email: editEmail } : c);
      setEditing(false);
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={t.alertLoading}>Loading customer…</div>
    );
  }
  if (error || !customer) {
    return (
      <div className="space-y-4">
        <div className={t.alertError}>{error ?? "Customer not found"}</div>
        <Link href="/admin/customers" className={t.btnOutline}>← Back to Customers</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/customers" className="text-[13px] text-gray-400 hover:text-gray-600">
              Customers
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-[13px] text-gray-600">
              {customer.full_name ?? customer.email ?? customerId.slice(0, 8)}
            </span>
          </div>
          <h1 className={`mt-1 text-xl font-bold ${t.heading}`}>
            {customer.full_name ?? <span className="italic text-gray-400">No name</span>}
          </h1>
          <p className={`text-[13px] ${t.muted}`}>{customer.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className="text-[12px] text-green-600">{saveMsg}</span>
          )}
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setEditName(customer.full_name ?? ""); setEditEmail(customer.email ?? ""); }}
                className={t.btnOutline}
              >
                Cancel
              </button>
              <button onClick={() => void handleSave()} disabled={saving} className={t.btnPrimary}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className={t.btnOutline}>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className={t.statLabel}>Total Orders</p>
            <p className={t.statValueSm}>{stats.order_count}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className={t.statLabel}>Total Spent</p>
            <p className={t.statValueSm}>${stats.total_spent.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className={t.statLabel}>Last Order</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {stats.last_order_at ? fmt(stats.last_order_at) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <p className="mb-4 text-[13px] font-semibold text-gray-900">Profile</p>
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
                className={t.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email address"
                className={t.input}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Full Name</p>
              <p className="mt-1 text-sm text-gray-800">
                {customer.full_name ?? <span className="italic text-gray-400">Not set</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-1 text-sm text-gray-800">
                {customer.email ?? <span className="italic text-gray-400">Not set</span>}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Role</p>
              <p className="mt-1 text-sm text-gray-800 capitalize">{customer.role}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Customer ID</p>
              <p className="mt-1 font-mono text-[12px] text-gray-500">{customer.id}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Joined</p>
              <p className="mt-1 text-sm text-gray-800">{fmt(customer.created_at)}</p>
            </div>
            {customer.auth_user_id && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Auth User ID</p>
                <p className="mt-1 font-mono text-[12px] text-gray-500">{customer.auth_user_id.slice(0, 16)}…</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <p className="text-[13px] font-semibold text-gray-900">
            Order History
            {orders.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {orders.length}
              </span>
            )}
          </p>
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Order #", "Date", "Status", "Payment", "Shipping", "Total", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={t.tableRow}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-gray-800">{order.order_number}</p>
                      {order.store_name && (
                        <p className="text-[11px] text-gray-400">{order.store_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDt(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.payment_status] ?? "bg-gray-100 text-gray-500"}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.shipping_status] ?? "bg-gray-100 text-gray-500"}`}>
                        {order.shipping_status}
                      </span>
                      {order.tracking_number && (
                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">{order.tracking_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={t.btnOutlineGreen}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
