"use client";

import { useEffect, useState, useCallback } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type ReviewRow = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  status: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  products: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

const STATUS_CLS: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  approved: "bg-green-50 text-green-700 ring-1 ring-green-200",
  rejected: "bg-red-50 text-red-600 ring-1 ring-red-200",
  flagged:  "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
};

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function productName(p: ReviewRow["products"]) {
  if (!p) return "—";
  return Array.isArray(p) ? p[0]?.name ?? "—" : p.name;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    void fetch(`/api/admin/reviews?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { reviews?: ReviewRow[]; total?: number; summary?: Record<string, number> }) => {
        setReviews(d.reviews ?? []);
        setTotal(d.total ?? 0);
        if (d.summary) setSummary(d.summary);
        setLoading(false);
      });
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
    load();
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    load();
  }

  const pendingCount = summary.pending ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Reviews</h1>
          <p className={`text-[13px] ${t.muted}`}>
            {total} reviews
            {pendingCount > 0 && <span className="ml-2 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[11px] font-bold text-yellow-700">{pendingCount} pending</span>}
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "",         label: "All",      count: Object.values(summary).reduce((a, b) => a + b, 0) },
          { key: "pending",  label: "Pending",  count: summary.pending  ?? 0 },
          { key: "approved", label: "Approved", count: summary.approved ?? 0 },
          { key: "rejected", label: "Rejected", count: summary.rejected ?? 0 },
          { key: "flagged",  label: "Flagged",  count: summary.flagged  ?? 0 },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-semibold transition",
              statusFilter === s.key
                ? "bg-[#2D8C54] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#2D8C54] hover:text-[#2D8C54]",
            ].join(" ")}
          >
            {s.label} <span className="opacity-70">({s.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by reviewer name, title, or body…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={t.input}
        />
      </div>

      {loading && <div className={t.alertLoading}>Loading reviews…</div>}

      {!loading && (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-yellow-500">{STARS(r.rating)}</span>
                    <span className="text-[14px] font-semibold text-gray-900">{r.title || <span className="italic text-gray-400">No title</span>}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {r.status}
                    </span>
                    {r.verified_purchase && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">✓ Verified</span>
                    )}
                  </div>
                  {r.body && <p className="mb-2 text-[13px] text-gray-700 leading-relaxed">{r.body}</p>}
                  <div className="flex flex-wrap gap-3 text-[12px] text-gray-400">
                    <span>👤 {r.reviewer_name ?? "Anonymous"}{r.reviewer_email ? ` · ${r.reviewer_email}` : ""}</span>
                    <span>📦 {productName(r.products)}</span>
                    <span>🕐 {fmt(r.created_at)}</span>
                    {r.helpful_count > 0 && <span>👍 {r.helpful_count} helpful</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" && (
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => void updateStatus(r.id, "approved")}
                      className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => void updateStatus(r.id, "rejected")}
                      className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                  {r.status !== "flagged" && (
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => void updateStatus(r.id, "flagged")}
                      className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                    >
                      Flag
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void deleteReview(r.id)}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition hover:border-red-300 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {reviews.length === 0 && (
            <div className={t.alertLoading}>
              {statusFilter || search ? "No reviews match your filters." : "No reviews yet."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
