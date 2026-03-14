"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ContentCard, type LearnContentItem } from "@/components/content/content-card";
import { NewsletterSignup } from "@/components/content/newsletter-signup";
import { PreviewStoreBadge } from "@/components/content/preview-store-badge";

type LearnHubResponse = {
  items: LearnContentItem[];
  featured: LearnContentItem | null;
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  sidebar: {
    popular: LearnContentItem[];
    categories: Array<{ type: string; label: string; count: number }>;
  };
};

const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

function buildQuery(next: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    params.set(key, String(value));
  });
  return params.toString();
}

async function getLearnData(searchParams: URLSearchParams): Promise<LearnHubResponse> {
  const selectedStoreSlug = searchParams.get("store_slug") || STORE_SLUG;
  const query = buildQuery({
    store_slug: selectedStoreSlug,
    type: searchParams.get("type") || undefined,
    search: searchParams.get("search") || undefined,
    page: searchParams.get("page") || 1,
    per_page: 12,
    sort: "newest",
  });
  const response = await fetch(`/api/content?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load learn content.");
  return (await response.json()) as LearnHubResponse;
}

export default function LearnHubPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryKey = useMemo(() => searchParams.toString(), [searchParams]);
  const locale = useMemo(() => {
    const segment = pathname.split("/")[1];
    return segment || "en";
  }, [pathname]);
  const isZh = locale === "zh";
  const learnBase = useMemo(() => `/${locale}/learn`, [locale]);
  const [data, setData] = useState<LearnHubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const state = useMemo(
    () =>
      ({
        type: searchParams.get("type") || "",
        search: searchParams.get("search") || "",
        page: Number(searchParams.get("page") || "1"),
        storeSlug: searchParams.get("store_slug") || STORE_SLUG,
      }) as const,
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await getLearnData(new URLSearchParams(queryKey));
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load learn content.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  return (
    <section className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "学习中心" : "Learn Hub"}
        </p>
        <h1 className="text-[42px]" style={{ fontFamily: "var(--font-heading)" }}>
          {isZh ? "学习中心" : "Learn"}
        </h1>
        <p className="mx-auto mt-1 max-w-[560px] text-[17px] text-[var(--neutral-500)]">
          {isZh ? "探索中医养生指南、本草档案与健康文章。" : "Explore TCM guides, herb profiles, and wellness articles."}
        </p>
        <PreviewStoreBadge className="mt-1" storeSlug={state.storeSlug} />
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
          <Link href={`${learnBase}/herbs?store_slug=${encodeURIComponent(state.storeSlug)}`} className="rounded-full border border-[var(--color-brand-200)] px-3 py-1 hover:bg-[var(--color-brand-100)]">
            {isZh ? "本草图鉴" : "Herb Directory"}
          </Link>
          <Link href={`${learnBase}/conditions?store_slug=${encodeURIComponent(state.storeSlug)}`} className="rounded-full border border-[var(--color-brand-200)] px-3 py-1 hover:bg-[var(--color-brand-100)]">
            {isZh ? "症状指南" : "Condition Library"}
          </Link>
          <Link href={`${learnBase}/five-elements?store_slug=${encodeURIComponent(state.storeSlug)}`} className="rounded-full border border-[var(--color-brand-200)] px-3 py-1 hover:bg-[var(--color-brand-100)]">
            {isZh ? "五行理论" : "Five Elements"}
          </Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-[var(--neutral-500)]">{isZh ? "正在加载内容…" : "Loading content..."}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {data ? <LearnHubResolved state={state} data={data} basePath={learnBase} isZh={isZh} /> : null}
    </section>
  );
}

function LearnHubResolved({
  state,
  data,
  basePath,
  isZh,
}: {
  state: { type: string; search: string; page: number; storeSlug: string };
  data: LearnHubResponse;
  basePath: string;
  isZh: boolean;
}) {
  const typeOptions = [
    { value: "", en: "All", zh: "全部" },
    { value: "herb_profile", en: "Herbs", zh: "本草" },
    { value: "condition_guide", en: "Conditions", zh: "症状" },
    { value: "blog_post", en: "Blog", zh: "文章" },
    { value: "article", en: "Articles", zh: "健康文章" },
    { value: "seasonal_guide", en: "Guides", zh: "指南" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        {data.featured ? (
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--neutral-700)]">{isZh ? "精选" : "Featured"}</p>
            <ContentCard content={data.featured} featured basePath={basePath} storeSlug={state.storeSlug} />
          </div>
        ) : null}

        <div className="rounded-[12px] border border-[var(--neutral-200)] bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {typeOptions.map((option) => {
              const query = buildQuery({
                type: option.value || undefined,
                search: state.search || undefined,
                page: 1,
                store_slug: state.storeSlug,
              });
              const active = state.type === option.value;
              return (
                <Link
                  key={option.value || "all"}
                  href={query ? `${basePath}?${query}` : basePath}
                  className={`rounded px-2 py-1 text-xs ${active ? "bg-[var(--color-brand-700)] text-white" : "bg-[var(--neutral-100)] text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]"}`}
                >
                  {isZh ? option.zh : option.en}
                </Link>
              );
            })}
          </div>

          <form action={basePath} className="flex gap-2">
            {state.type ? <input type="hidden" name="type" value={state.type} /> : null}
            <input type="hidden" name="store_slug" value={state.storeSlug} />
            <input
              type="text"
              name="search"
              defaultValue={state.search}
              placeholder={isZh ? "搜索内容…" : "Search content..."}
              className="w-full rounded border border-[var(--neutral-200)] px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded bg-[var(--color-brand-500)] px-3 py-1 text-sm text-white">
              {isZh ? "搜索" : "Search"}
            </button>
          </form>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {data.items.map((item) => (
            <ContentCard key={item.id} content={item} basePath={basePath} storeSlug={state.storeSlug} />
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <Link
            href={`${basePath}?${buildQuery({ type: state.type || undefined, search: state.search || undefined, page: Math.max(1, data.pagination.page - 1), store_slug: state.storeSlug })}`}
            className={`rounded border px-3 py-1 ${data.pagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-[var(--neutral-50)]"}`}
          >
            {isZh ? "← 上一页" : "← Prev"}
          </Link>
          <span>
            {isZh ? `第 ${data.pagination.page} / ${data.pagination.total_pages} 页` : `Page ${data.pagination.page} of ${data.pagination.total_pages}`}
          </span>
          <Link
            href={`${basePath}?${buildQuery({
              type: state.type || undefined,
              search: state.search || undefined,
              page: Math.min(data.pagination.total_pages, data.pagination.page + 1),
              store_slug: state.storeSlug,
            })}`}
            className={`rounded border px-3 py-1 ${data.pagination.page >= data.pagination.total_pages ? "pointer-events-none opacity-50" : "hover:bg-[var(--neutral-50)]"}`}
          >
            {isZh ? "下一页 →" : "Next →"}
          </Link>
        </div>
      </div>

      <aside className="space-y-3 rounded-[12px] border border-[var(--neutral-200)] bg-white p-4 text-sm">
        <div>
          <p className="font-medium">{isZh ? "热门内容" : "Popular"}</p>
          <div className="mt-2 space-y-1">
            {data.sidebar.popular.length === 0 ? <p className="text-[var(--neutral-500)]">{isZh ? "暂无内容" : "No content yet."}</p> : null}
            {data.sidebar.popular.map((item) => (
              <Link
                key={item.id}
                href={
                  item.type === "herb_profile"
                    ? `${basePath}/herbs/${item.slug}?store_slug=${encodeURIComponent(state.storeSlug)}`
                    : item.type === "condition_guide"
                      ? `${basePath}/conditions/${item.slug}?store_slug=${encodeURIComponent(state.storeSlug)}`
                      : `${basePath}?search=${encodeURIComponent(item.slug)}&store_slug=${encodeURIComponent(state.storeSlug)}`
                }
                className="block text-[var(--color-brand-600)] underline"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-medium">{isZh ? "分类" : "Categories"}</p>
          <div className="mt-2 space-y-1">
            {data.sidebar.categories.map((category) => (
              <Link
                key={category.type}
                href={`${basePath}?${buildQuery({ type: category.type, search: state.search || undefined, page: 1, store_slug: state.storeSlug })}`}
                className="block text-[var(--neutral-700)] hover:underline"
              >
                {category.label} ({category.count})
              </Link>
            ))}
          </div>
        </div>
        <NewsletterSignup storeSlug={state.storeSlug} variant="sidebar" />
      </aside>
    </div>
  );
}
