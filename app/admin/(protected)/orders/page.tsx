"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  shipping_status: string;
  total: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped:   "bg-purple-50 text-purple-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export default function AdminOrdersPage() {
  const search = useSearchParams();
  const storeId = search.get("store_id");
  const customerEmail = search.get("customer_email");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: "1", per_page: "50" });
        if (storeId) params.set("store_id", storeId);
        if (customerEmail) params.set("customer_email", customerEmail);
        const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
        const data = (await response.json()) as { orders?: OrderRow[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to load orders");
        if (!cancelled) setOrders(data.orders || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [storeId, customerEmail]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-xl font-bold ${t.heading}`}>Order Management</h1>
        <p className={`text-[13px] ${t.muted}`}>
          {customerEmail ? `Customer: ${customerEmail}` : storeId ? `Store: ${storeId}` : "All stores"} · {orders.length} orders
        </p>
        {customerEmail && (
          <Link href="/admin/orders" className="mt-1 inline-block text-[12px] text-[#2D8C54] hover:underline">
            ← Clear filter
          </Link>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400 shadow-sm">
          Loading orders...
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
                {["Order #", "Customer", "Status", "Shipping", "Total", "Date", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 transition hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-[13px] font-semibold text-[#2D8C54]">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{order.customer_name || "Guest"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-500">{order.shipping_status}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${order.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[12px] text-gray-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    No orders found.
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
