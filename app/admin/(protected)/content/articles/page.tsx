"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminTheme as t } from "@/lib/admin/theme";

type ContentItem = {
  id: string;
  slug: string;
  title: string;
  title_zh: string | null;
  status: string;
  view_count: number;
  published_at: string | null;
  updated_at: string;
};

type NewForm = { title: string; slug: string; saving: boolean; error: string | null };

const STATUS_CLS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-500",
  review:    "bg-yellow-50 text-yellow-700",
  published: "bg-green-50 text-green-700",
  archived:  "bg-red-50 text-red-500",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ArticlesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [newForm, setNewForm] = useState<NewForm | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: "article", per_page: "100" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    void fetch(`/api/admin/content?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { items?: ContentItem[]; total?: number }) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function createArticle() {
    if (!newForm) return;
    if (!newForm.title.trim()) {
      setNewForm((f) => f ? { ...f, error: "Title is required" } : f);
      return;
    }
    setNewForm((f) => f ? { ...f, saving: true, error: null } : f);
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "article",
        title: newForm.title,
        slug: newForm.slug || slugify(newForm.title),
        status: "draft",
      }),
    });
    const data = (await res.json()) as { item?: { id: string }; error?: string };
    if (!res.ok || !data.item) {
      setNewForm((f) => f ? { ...f, saving: false, error: data.error ?? "Failed to create" } : f);
      return;
    }
    router.push(`/admin/content/articles/${data.item.id}`);
  }

  async function deleteItem(id: string) {
    if (deleting !== id + "-confirm") {
      setDeleting(id + "-confirm");
      return;
    }
    setDeleting(id);
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Articles</h1>
          <p className={`text-[13px] ${t.muted}`}>{total} articles · blog & educational content</p>
        </div>
        <button type="button" onClick={() => setNewForm({ title: "", slug: "", saving: false, error: null })} className={t.btnPrimary}>
          ＋ New Article
        </button>
      </div>

      {newForm && (
        <div className="rounded-xl border border-[#2D8C54]/30 bg-green-50 p-5 shadow-sm">
          <p className="mb-3 text-[13px] font-bold text-[#2D8C54]">New Article</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Title *</label>
              <input
                type="text"
                placeholder="e.g. The 5 Elements of TCM"
                autoFocus
                value={newForm.title}
                onChange={(e) => setNewForm((f) => f ? { ...f, title: e.target.value, slug: slugify(e.target.value) } : f)}
                className={t.input}
              />
            </div>
            <div>
              <label className={`mb-1 block ${t.labelClass}`}>Slug</label>
              <input
                type="text"
                value={newForm.slug}
                onChange={(e) => setNewForm((f) => f ? { ...f, slug: e.target.value } : f)}
                className={t.input}
              />
            </div>
          </div>
          {newForm.error && <p className="mt-2 text-[12px] text-red-600">{newForm.error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={newForm.saving} onClick={() => void createArticle()} className={t.btnPrimary}>
              {newForm.saving ? "Creating…" : "Create & Edit →"}
            </button>
            <button type="button" onClick={() => setNewForm(null)} className={t.btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 min-w-[180px] ${t.input}`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`min-w-[140px] ${t.input}`}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading && <div className={t.alertLoading}>Loading articles…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Title", "Slug", "Status", "Views", "Published", "Updated", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={t.tableRow}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    {item.title_zh && <p className="text-[11px] text-gray-400">{item.title_zh}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{item.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.view_count}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(item.published_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(item.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/content/articles/${item.id}`} className={t.btnOutlineGreen}>Edit</Link>
                      <button
                        type="button"
                        onClick={() => void deleteItem(item.id)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                          deleting === item.id + "-confirm"
                            ? "border-red-400 bg-red-50 text-red-600"
                            : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"
                        }`}
                      >
                        {deleting === item.id + "-confirm" ? "Confirm" : deleting === item.id ? "…" : "Delete"}
                      </button>
                      {deleting === item.id + "-confirm" && (
                        <button type="button" onClick={() => setDeleting(null)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    {search || statusFilter ? "No articles match your filters." : "No articles yet. Create your first one."}
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
