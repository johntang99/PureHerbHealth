"use client";

import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  parent_id: string | null;
};

type CategoryNode = CategoryRow & { children: CategoryNode[] };

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of Array.from(map.values())) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

type FormState = {
  id: string;
  name: string;
  name_zh: string;
  slug: string;
  parent_id: string;
};

function emptyForm(): FormState {
  return { id: "", name: "", name_zh: "", slug: "", parent_id: "" };
}

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const d = await fetch("/api/admin/categories", { cache: "no-store" }).then((r) => r.json()) as { categories?: CategoryRow[] };
    setRows(d.categories ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === slugify(prev.name) || prev.slug === "" ? slugify(name) : prev.slug,
    }));
  }

  function startEdit(row: CategoryRow) {
    setForm({ id: row.id, name: row.name, name_zh: row.name_zh ?? "", slug: row.slug, parent_id: row.parent_id ?? "" });
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setForm(emptyForm);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { setError("Name and slug are required."); return; }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const isEdit = Boolean(form.id);
      const response = await fetch("/api/admin/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: form.id } : {}),
          slug: form.slug,
          name: form.name,
          name_zh: form.name_zh || undefined,
          parent_id: form.parent_id || null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save.");
      setSuccess(isEdit ? "Category updated." : "Category created.");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete.");
      setDeleteConfirm(null);
      setSuccess("Category deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  const tree = buildTree(rows);
  const isEditing = Boolean(form.id);
  const parentOptions = rows.filter((r) => r.id !== form.id && !r.parent_id);

  function renderTree(nodes: CategoryNode[], depth = 0): React.ReactNode {
    return nodes.map((node) => (
      <div key={node.id}>
        <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-gray-50 ${depth > 0 ? "ml-6 border-l border-gray-200 pl-4" : ""}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {depth > 0 && <span className="text-gray-300">└</span>}
              <p className="font-medium text-gray-900">{node.name}</p>
              {node.name_zh && <p className="text-[12px] text-gray-400">{node.name_zh}</p>}
            </div>
            <p className="font-mono text-[11px] text-gray-400">{node.slug}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => startEdit(node)}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
            >
              Edit
            </button>
            {deleteConfirm === node.id ? (
              <div className="flex gap-1">
                <button
                  onClick={() => void handleDelete(node.id)}
                  disabled={saving}
                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(node.id)}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-400 transition hover:border-red-200 hover:text-red-500"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1">
            <a href="/admin/products" className="text-[13px] text-gray-400 hover:text-gray-600">← Back to Products</a>
          </div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Category Management</h1>
          <p className={`text-[13px] ${t.muted}`}>Organize products into categories and subcategories</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className={`mb-4 text-[13px] font-semibold ${t.heading}`}>
            {isEditing ? "Edit Category" : "Add New Category"}
          </p>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <label className="block space-y-1.5">
              <span className={t.labelClass}>Name (English) *</span>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={t.input}
                placeholder="e.g. Herbal Teas"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={t.labelClass}>Name (Chinese)</span>
              <input
                value={form.name_zh}
                onChange={(e) => setForm((p) => ({ ...p, name_zh: e.target.value }))}
                className={t.input}
                placeholder="e.g. 草本茶"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={t.labelClass}>URL Slug *</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                required
                className={`${t.input} font-mono`}
                placeholder="e.g. herbal-teas"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={t.labelClass}>Parent Category (optional)</span>
              <select
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
                className={t.input}
              >
                <option value="">— Top-level category —</option>
                {parentOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">Only top-level categories can be parents.</p>
            </label>

            {error && <p className={t.alertError}>{error}</p>}
            {success && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

            <div className="flex gap-2">
              {isEditing && (
                <button type="button" onClick={cancelEdit} className={t.btnOutline}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving} className={t.btnPrimary}>
                {saving ? "Saving…" : isEditing ? "Update Category" : "Add Category"}
              </button>
            </div>
          </form>
        </div>

        {/* Tree */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className={`mb-4 text-[13px] font-semibold ${t.heading}`}>
            Categories ({rows.length})
          </p>
          {loading ? (
            <p className="text-[13px] text-gray-400">Loading…</p>
          ) : tree.length === 0 ? (
            <p className="text-[13px] text-gray-400">No categories yet. Add your first category.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {renderTree(tree)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
