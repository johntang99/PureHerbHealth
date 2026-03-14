"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type CategoryFlat = { id: string; name: string; depth: number };
type CategoryNode = { id: string; name: string; children: CategoryNode[] };

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryFlat[] {
  const result: CategoryFlat[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth });
    result.push(...flattenCategories(n.children ?? [], depth + 1));
  }
  return result;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    name_zh: "",
    category_id: "",
    price: "0.00",
    short_description: "",
    short_description_zh: "",
    store_slug: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/categories").then((r) => r.json()).then((d: { categories?: CategoryNode[] }) => {
      setCategories(flattenCategories(d.categories ?? []));
    });
    void fetch("/api/stores").then((r) => r.json()).then((d: { stores?: Array<{ id: string; slug: string; name: string }> }) => {
      const list = d.stores ?? [];
      setStores(list);
      if (list[0]) setForm((prev) => ({ ...prev, store_slug: list[0].slug }));
    });
  }, []);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === slugify(prev.name) || prev.slug === "" ? slugify(name) : prev.slug,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-store-slug": form.store_slug,
        },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          name_zh: form.name_zh || undefined,
          short_description: form.short_description || undefined,
          short_description_zh: form.short_description_zh || undefined,
          category_id: form.category_id || undefined,
          price_cents: Math.max(0, Math.round(Number(form.price || "0") * 100)),
          image_asset_ids: [],
          video_asset_ids: [],
        }),
      });
      const payload = (await response.json()) as { item?: { id: string }; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to create product.");
      const id = (payload.item as { id: string } | undefined)?.id;
      if (id) {
        router.push(`/admin/products/${id}`);
      } else {
        router.push("/admin/products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-xl font-bold ${t.heading}`}>New Product</h1>
        <p className={`text-[13px] ${t.muted}`}>Create a new product, then add images and content in the editor</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className={`mb-4 text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>Basic Info</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className={t.labelClass}>Product Name (English) *</span>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className={t.input}
                placeholder="e.g. Ginseng Energy Boost"
              />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Product Name (Chinese)</span>
              <input
                value={form.name_zh}
                onChange={(e) => setForm((p) => ({ ...p, name_zh: e.target.value }))}
                className={t.input}
                placeholder="e.g. 人参能量饮"
              />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>URL Slug *</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                required
                className={`${t.input} font-mono`}
                placeholder="e.g. ginseng-energy-boost"
              />
              <p className="text-[11px] text-gray-400">Used in product URL. Auto-generated from name.</p>
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Price (USD)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className={t.input}
              />
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Category</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                className={t.input}
              >
                <option value="">— No category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={t.labelClass}>Store</span>
              <select
                value={form.store_slug}
                onChange={(e) => setForm((p) => ({ ...p, store_slug: e.target.value }))}
                className={t.input}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Short Description (English)</span>
              <input
                value={form.short_description}
                onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                className={t.input}
                placeholder="One sentence summary"
              />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className={t.labelClass}>Short Description (Chinese)</span>
              <input
                value={form.short_description_zh}
                onChange={(e) => setForm((p) => ({ ...p, short_description_zh: e.target.value }))}
                className={t.input}
                placeholder="一句话描述"
              />
            </label>
          </div>
        </div>

        {error && <p className={t.alertError}>{error}</p>}

        <div className="flex justify-end gap-3">
          <a href="/admin/products" className={t.btnOutline}>Cancel</a>
          <button type="submit" disabled={saving} className={t.btnPrimary}>
            {saving ? "Creating…" : "Create Product & Edit →"}
          </button>
        </div>
      </form>
    </div>
  );
}
