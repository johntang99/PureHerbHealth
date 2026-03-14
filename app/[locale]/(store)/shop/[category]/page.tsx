import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { getCategoryBySlug, listProducts } from "@/lib/catalog/service";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterPanel } from "@/components/product/filter-panel";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { PaginationControls } from "@/components/product/pagination-controls";
import { resolveStoreSlug } from "@/lib/store/slug";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; category: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.category, params.locale);
  return {
    title: category ? `${category.name} | pureHerbHealth` : "Category | pureHerbHealth",
    description:
      params.locale === "zh"
        ? "按中医分类浏览草本产品。"
        : "Browse curated herbal products by category.",
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; category: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const category = await getCategoryBySlug(params.category, params.locale);
  if (!category) notFound();

  const page = Number(searchParams.page ?? 1);
  const perPage = Number(searchParams.per_page ?? 20);
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest";
  // Prefer explicit query param; fall back to x-store-slug header injected by clinic-site middleware
  const headerStoreSlug = headers().get("x-store-slug") ?? undefined;
  const storeSlug = typeof searchParams.store_slug === "string" ? searchParams.store_slug : headerStoreSlug;
  const resolvedStoreSlug = resolveStoreSlug(storeSlug);

  const data = await listProducts({
    locale: params.locale,
    page: Number.isFinite(page) ? page : 1,
    perPage: Number.isFinite(perPage) ? perPage : 20,
    category: params.category,
    sort,
    storeSlug: resolvedStoreSlug,
  });

  return (
    <section className="space-y-8">
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{params.locale === "zh" ? "分类" : "Category"}</p>
        <h1 className="text-[42px]" style={{ fontFamily: "var(--font-heading)" }}>
          {category.name}
        </h1>
        <p className="text-[17px] text-[var(--neutral-500)]">{params.locale === "zh" ? "分类商品列表" : "Category product listing"}</p>
      </div>
      <div className="grid gap-7 lg:grid-cols-[260px_1fr]">
        <FilterPanel categories={data.filters.categories} />
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[category.name, "Wood (木)", "Hot Nature", "Tonify Qi", "4.0+ Stars"].map((chip) => (
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
          <ProductGrid products={data.products} locale={params.locale} categorySlug={params.category} storeSlug={storeSlug} desktopCols={3} />
          <PaginationControls page={data.pagination.page} totalPages={data.pagination.total_pages} />
        </div>
      </div>
    </section>
  );
}
