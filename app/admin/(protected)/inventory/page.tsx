"use client";

import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

type InventoryRow = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  last_restocked_at: string | null;
  last_sold_at: string | null;
  enabled: boolean;
  category: string | null;
  stock_status: StockStatus;
};

type AdjustModal = {
  product: InventoryRow;
  delta: string;
  reason: "restock" | "manual" | "damaged";
  notes: string;
  saving: boolean;
  error: string | null;
};

const STATUS_LABELS: Record<StockStatus, { label: string; cls: string }> = {
  in_stock:      { label: "In Stock",   cls: "bg-green-50 text-green-700 ring-1 ring-green-200"  },
  low_stock:     { label: "Low Stock",  cls: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  out_of_stock:  { label: "Out of Stock", cls: "bg-red-50 text-red-600 ring-1 ring-red-200"       },
};

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type StatusSummary = { all: number; in_stock: number; low_stock: number; out_of_stock: number };

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [summary, setSummary] = useState<StatusSummary>({ all: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all");
  const [adjust, setAdjust] = useState<AdjustModal | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100", status: statusFilter });
    if (search) params.set("search", search);
    void fetch(`/api/admin/inventory?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products?: InventoryRow[]; total?: number; summary?: StatusSummary }) => {
        setRows(d.products ?? []);
        if (d.summary) setSummary(d.summary);
        setLoading(false);
      });
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function applyAdjustment() {
    if (!adjust) return;
    const delta = parseInt(adjust.delta, 10);
    if (isNaN(delta) || delta === 0) {
      setAdjust((a) => a ? { ...a, error: "Enter a non-zero number (+ to add, − to remove)" } : a);
      return;
    }
    setAdjust((a) => a ? { ...a, saving: true, error: null } : a);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: adjust.product.id,
          adjustment: delta,
          reason: adjust.reason,
          notes: adjust.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Adjustment failed");
      }
      setAdjust(null);
      setSuccessMsg(`Stock updated for "${adjust.product.name}"`);
      setTimeout(() => setSuccessMsg(null), 3000);
      load();
    } catch (err) {
      setAdjust((a) => a ? { ...a, saving: false, error: err instanceof Error ? err.message : "Error" } : a);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Inventory Management</h1>
          <p className={`text-[13px] ${t.muted}`}>{summary.all} products · manage stock levels</p>
        </div>
      </div>

      {successMsg && (
        <div className={t.alertSuccess}>{successMsg}</div>
      )}

      {/* Status filter tabs — counts always reflect total across ALL products */}
      <div className="flex flex-wrap gap-2">
        {(["all", "in_stock", "low_stock", "out_of_stock"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-semibold transition",
              statusFilter === s
                ? "bg-[#2D8C54] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#2D8C54] hover:text-[#2D8C54]",
            ].join(" ")}
          >
            {s === "all" ? "All" : STATUS_LABELS[s].label}
            <span className="ml-1 opacity-70">({summary[s]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={t.input}
        />
      </div>

      {loading && <div className={t.alertLoading}>Loading inventory…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Product", "SKU", "Category", "Stock", "Threshold", "Last Restocked", "Last Sold", "Status", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const st = STATUS_LABELS[row.stock_status];
                return (
                  <tr key={row.id} className={t.tableRow}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="font-mono text-[11px] text-gray-400">{row.slug}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-500">
                      {row.sku ?? <span className="italic text-gray-300">none</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.category ?? <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[15px] font-bold ${
                        row.stock_status === "out_of_stock" ? "text-red-600" :
                        row.stock_status === "low_stock"    ? "text-yellow-600" :
                        "text-gray-900"
                      }`}>
                        {row.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.low_stock_threshold}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(row.last_restocked_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(row.last_sold_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setAdjust({ product: row, delta: "", reason: "restock", notes: "", saving: false, error: null })}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Modal */}
      {adjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-bold text-gray-900">Adjust Stock</h2>
            <p className="mb-4 text-[13px] text-gray-500">{adjust.product.name}</p>
            <p className="mb-3 text-[13px] text-gray-700">
              Current: <strong>{adjust.product.stock_quantity}</strong> units
            </p>

            <div className="space-y-3">
              <div>
                <label className={`mb-1 block ${t.labelClass}`}>Adjustment (+ add / − remove)</label>
                <input
                  type="number"
                  placeholder="e.g. +50 or -5"
                  value={adjust.delta}
                  onChange={(e) => setAdjust((a) => a ? { ...a, delta: e.target.value } : a)}
                  className={t.input}
                  autoFocus
                />
              </div>
              <div>
                <label className={`mb-1 block ${t.labelClass}`}>Reason</label>
                <select
                  value={adjust.reason}
                  onChange={(e) => setAdjust((a) => a ? { ...a, reason: e.target.value as AdjustModal["reason"] } : a)}
                  className={t.input}
                >
                  <option value="restock">Restock</option>
                  <option value="manual">Manual correction</option>
                  <option value="damaged">Damaged / write-off</option>
                </select>
              </div>
              <div>
                <label className={`mb-1 block ${t.labelClass}`}>Notes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Received PO-2024-091"
                  value={adjust.notes}
                  onChange={(e) => setAdjust((a) => a ? { ...a, notes: e.target.value } : a)}
                  className={t.input}
                />
              </div>
            </div>

            {adjust.error && <p className="mt-3 text-[12px] text-red-600">{adjust.error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={adjust.saving}
                onClick={() => void applyAdjustment()}
                className={`flex-1 ${t.btnPrimary}`}
              >
                {adjust.saving ? "Saving…" : "Apply Adjustment"}
              </button>
              <button
                type="button"
                onClick={() => setAdjust(null)}
                className={t.btnOutline}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
