"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminTheme as t } from "@/lib/admin/theme";

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  children: CategoryNode[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  name_zh?: string | null;
  price_cents: number;
  enabled: boolean;
  product_type?: string | null;
  category_id: string | null;
  categories: { id: string; slug: string; name: string } | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { categories?: CategoryNode[] }) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: "100" });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category_id", categoryFilter);
    void fetch(`/api/admin/products?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { products?: ProductRow[]; total?: number }) => {
        setProducts(d.products ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [search, categoryFilter]);

  const flatCategories: Array<{ id: string; name: string; depth: number }> = [];
  function flattenCategories(nodes: CategoryNode[], depth = 0) {
    for (const node of nodes) {
      flatCategories.push({ id: node.id, name: node.name, depth });
      flattenCategories(node.children ?? [], depth + 1);
    }
  }
  flattenCategories(categories);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`text-xl font-bold ${t.heading}`}>Products</h1>
          <p className={`text-[13px] ${t.muted}`}>{total} products total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/categories"
            className={t.btnOutline}
          >
            Manage Categories
          </Link>
          <Link
            href="/admin/products/new"
            className={t.btnPrimary}
          >
            ＋ New Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 min-w-[200px] ${t.input}`}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`min-w-[180px] ${t.input}`}
        >
          <option value="">All categories</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className={t.alertLoading}>Loading products…</div>
      )}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Category", "Price", "Status", "Actions"].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${t.tableHeader}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={t.tableRow}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.product_type === "bundle" && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Bundle</span>
                      )}
                    </div>
                    {p.name_zh && (
                      <p className="text-[11px] text-gray-400">{p.name_zh}</p>
                    )}
                    <p className="font-mono text-[11px] text-gray-400">{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.categories?.name ?? <span className="text-gray-300 italic">None</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    ${(p.price_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      p.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {p.enabled ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-[#2D8C54] hover:text-[#2D8C54]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    {search || categoryFilter
                      ? "No products match your filters."
                      : "No products yet. Create your first one."}
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
