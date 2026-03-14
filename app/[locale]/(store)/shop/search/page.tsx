import type { Locale } from "@/lib/i18n/config";
import { ProductGrid } from "@/components/product/product-grid";
import { PaginationControls } from "@/components/product/pagination-controls";
import { listProducts } from "@/lib/catalog/service";
import { resolveStoreSlug } from "@/lib/store/slug";

export const dynamic = "force-dynamic";

type AiInterpretation = {
  keywords?: string[];
  category_slugs?: string[];
  tcm_properties?: {
    nature?: string;
    meridians?: string[];
    element?: string;
    flavor?: string;
  };
  intent?: string;
  confidence?: number;
  rewritten_query?: string;
};

type AiSearchResult = {
  interpreted: boolean;
  interpretation?: AiInterpretation;
  fallback_query?: string;
  cached?: boolean;
  error?: string;
};

async function runAiSearch(query: string, storeSlug: string): Promise<AiSearchResult | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005";
    const res = await fetch(`${baseUrl}/api/ai/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_slug: storeSlug, query }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as AiSearchResult;
  } catch {
    return null;
  }
}

export default async function ShopSearchPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const page = Number(searchParams.page ?? 1);
  const perPage = Number(searchParams.per_page ?? 20);
  const storeSlug = typeof searchParams.store_slug === "string" ? searchParams.store_slug : undefined;
  const resolvedStoreSlug = resolveStoreSlug(storeSlug);
  const isZh = params.locale === "zh";

  // Run AI search and product listing in parallel
  const [data, aiResult] = await Promise.all([
    listProducts({
      locale: params.locale,
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 20,
      search: query || undefined,
      sort: "newest",
      storeSlug: resolvedStoreSlug,
    }),
    query ? runAiSearch(query, resolvedStoreSlug) : Promise.resolve(null),
  ]);

  const interp = aiResult?.interpreted ? aiResult.interpretation : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "AI 搜索" : "AI Search"}
        </p>
        <h1 className="text-[38px]" style={{ fontFamily: "var(--font-heading)" }}>
          {query
            ? (isZh ? `"${query}"` : `"${query}"`)
            : (isZh ? "全部产品" : "All products")}
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-500)]">
          {data.pagination.total} {isZh ? "个结果" : "results"}
          {aiResult?.cached ? (
            <span className="ml-2 rounded-full bg-[var(--color-brand-50,#f0fdf4)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand-600)]">
              {isZh ? "AI 缓存" : "AI cached"}
            </span>
          ) : interp ? (
            <span className="ml-2 rounded-full bg-[var(--color-brand-50,#f0fdf4)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-brand-600)]">
              ✦ {isZh ? "AI 解析" : "AI interpreted"}
            </span>
          ) : null}
        </p>
      </div>

      {/* AI interpretation banner */}
      {interp && (
        <div className="rounded-xl border border-[var(--color-brand-200,#bbf7d0)] bg-[var(--color-brand-50,#f0fdf4)] px-5 py-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-600,#16a34a)]">
            ✦ {isZh ? "AI 搜索解读" : "AI Search Interpretation"}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            {interp.keywords && interp.keywords.length > 0 && (
              <div>
                <span className="text-xs text-[var(--neutral-500)]">{isZh ? "关键词：" : "Keywords: "}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {interp.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-[var(--neutral-700)] shadow-sm">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {interp.tcm_properties && (
              <div className="flex flex-wrap gap-3 text-xs text-[var(--neutral-600)]">
                {interp.tcm_properties.element && (
                  <span>🌱 {isZh ? "五行：" : "Element: "}<strong>{interp.tcm_properties.element}</strong></span>
                )}
                {interp.tcm_properties.nature && (
                  <span>🌡 {isZh ? "性：" : "Nature: "}<strong>{interp.tcm_properties.nature}</strong></span>
                )}
                {interp.tcm_properties.meridians && interp.tcm_properties.meridians.length > 0 && (
                  <span>⚡ {isZh ? "归经：" : "Meridians: "}<strong>{interp.tcm_properties.meridians.join(", ")}</strong></span>
                )}
                {interp.tcm_properties.flavor && (
                  <span>🍃 {isZh ? "味：" : "Flavor: "}<strong>{interp.tcm_properties.flavor}</strong></span>
                )}
              </div>
            )}
            {interp.rewritten_query && interp.rewritten_query !== query && (
              <div className="text-xs text-[var(--neutral-500)]">
                {isZh ? "优化查询：" : "Enhanced query: "}
                <em className="text-[var(--neutral-700)]">{interp.rewritten_query}</em>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {data.products.length === 0 ? (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-12 text-center">
          <p className="text-4xl">🌿</p>
          <p className="mt-3 font-semibold text-[var(--neutral-800)]">
            {isZh ? "没有找到相关产品" : "No products found"}
          </p>
          <p className="mt-1 text-sm text-[var(--neutral-500)]">
            {isZh ? "请尝试其他关键词或浏览全部产品。" : "Try a different search term or browse all products."}
          </p>
        </div>
      ) : (
        <>
          <ProductGrid products={data.products} locale={params.locale} storeSlug={storeSlug} />
          <PaginationControls page={data.pagination.page} totalPages={data.pagination.total_pages} />
        </>
      )}
    </section>
  );
}
