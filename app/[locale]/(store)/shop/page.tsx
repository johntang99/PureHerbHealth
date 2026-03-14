import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n/config";
import { listProducts } from "@/lib/catalog/service";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterPanel } from "@/components/product/filter-panel";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { PaginationControls } from "@/components/product/pagination-controls";
import { resolveStoreSlug } from "@/lib/store/slug";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const page = Number(searchParams.page ?? 1);
  const perPage = Number(searchParams.per_page ?? 20);
  const category = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest";
  // Prefer explicit query param; fall back to x-store-slug header injected by clinic-site middleware
  const headerStoreSlug = headers().get("x-store-slug") ?? undefined;
  const storeSlug = typeof searchParams.store_slug === "string" ? searchParams.store_slug : headerStoreSlug;
  const resolvedStoreSlug = resolveStoreSlug(storeSlug);

  const data = await listProducts({
    locale: params.locale,
    page: Number.isFinite(page) ? page : 1,
    perPage: Number.isFinite(perPage) ? perPage : 20,
    category,
    sort,
    storeSlug: resolvedStoreSlug,
  });

  return (
    <section className="space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{params.locale === "zh" ? "商店" : "Shop"}</p>
        <h1 className="text-[42px]" style={{ fontFamily: "var(--font-heading)" }}>
          {params.locale === "zh" ? "探索本草系列" : "Explore Our Herbal Collection"}
        </h1>
        <p className="mx-auto max-w-[560px] text-[17px] text-[var(--neutral-500)]">
          {params.locale === "zh"
            ? "按分类浏览、筛选与搜索，找到适合你的中草本调理产品。"
            : "Browse, filter, and search the catalog for your wellness goals."}
        </p>
      </div>
      <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
        <FilterPanel categories={data.filters.categories} />
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[category || "Herbal Formulas", "Wood (木)", "Hot Nature", "Tonify Qi", "4.0+ Stars"].map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-2.5 py-1 text-xs text-[var(--color-brand-700)]">
                  {chip}
                  <span>×</span>
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-[12px] border border-[var(--neutral-200)] bg-white px-4 py-3">
              <p className="text-sm text-[var(--neutral-500)]">
                <strong className="text-[var(--neutral-900)]">{data.pagination.total}</strong> {params.locale === "zh" ? "件商品" : "products found"}
              </p>
              <div className="flex items-center gap-2">
                <SortDropdown />
                <div className="flex overflow-hidden rounded-md border border-[var(--neutral-200)]">
                  <button type="button" className="h-8 w-8 bg-[var(--color-brand-50)] text-[var(--color-brand-500)]">
                    ≡
                  </button>
                  <button type="button" className="h-8 w-8 bg-white text-[var(--neutral-400)]">
                    ⬚
                  </button>
                </div>
              </div>
            </div>
          </div>
          <ProductGrid products={data.products} locale={params.locale} storeSlug={storeSlug} desktopCols={3} />
          <PaginationControls page={data.pagination.page} totalPages={data.pagination.total_pages} />
        </div>
      </div>
    </section>
  );
}
