"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PreviewStoreBadge } from "@/components/content/preview-store-badge";

type HerbsResponse = {
  herbs: Array<{
    id: string;
    slug: string;
    title: string;
    featured_image: { url: string; alt: string } | null;
  }>;
  alphabet: Array<{ letter: string; count: number }>;
  pagination: { page: number; per_page: number; total: number; total_pages: number };
};

const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

function buildQuery(next: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  });
  return params.toString();
}

export default function LearnHerbsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "en";
  const basePath = `/${locale}/learn/herbs`;
  const [data, setData] = useState<HerbsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const state = useMemo(
    () => ({
      search: searchParams.get("search") || "",
      letter: searchParams.get("letter") || "",
      page: Number(searchParams.get("page") || "1"),
      storeSlug: searchParams.get("store_slug") || STORE_SLUG,
    }),
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const query = buildQuery({
          store_slug: state.storeSlug,
          search: state.search || undefined,
          letter: state.letter || undefined,
          page: state.page,
          per_page: 24,
        });
        const response = await fetch(`/api/content/herbs?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load herbs.");
        const payload = (await response.json()) as HerbsResponse;
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load herbs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [state.letter, state.page, state.search, state.storeSlug]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Herb Directory</h1>
        <p className="mt-1 text-sm text-slate-600">Browse published herb profiles and clinical education notes.</p>
        <PreviewStoreBadge className="mt-1" storeSlug={state.storeSlug} />
      </div>

      <form action={basePath} className="flex gap-2">
        {state.letter ? <input type="hidden" name="letter" value={state.letter} /> : null}
        <input type="hidden" name="store_slug" value={state.storeSlug} />
        <input
          type="text"
          name="search"
          defaultValue={state.search}
          placeholder="Search herb name..."
          className="w-full rounded border px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded bg-brand px-3 py-1 text-sm text-white">
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={state.search ? `${basePath}?search=${encodeURIComponent(state.search)}&store_slug=${encodeURIComponent(state.storeSlug)}` : `${basePath}?store_slug=${encodeURIComponent(state.storeSlug)}`}
          className={`rounded px-2 py-1 text-xs ${!state.letter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          All
        </Link>
        {data?.alphabet.map((entry) => (
          <Link
            key={entry.letter}
            href={`${basePath}?${buildQuery({ search: state.search || undefined, letter: entry.letter, page: 1, store_slug: state.storeSlug })}`}
            className={`rounded px-2 py-1 text-xs ${state.letter === entry.letter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {entry.letter} ({entry.count})
          </Link>
        ))}
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading herbs...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.herbs.map((herb) => (
          <article key={herb.id} className="rounded border bg-white p-3">
            {herb.featured_image?.url ? (
              <div className="mb-2 h-32 overflow-hidden rounded border bg-slate-50">
                <Image src={herb.featured_image.url} alt={herb.featured_image.alt || herb.title} width={600} height={256} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <p className="font-medium">{herb.title}</p>
            <Link href={`${basePath}/${herb.slug}?store_slug=${encodeURIComponent(state.storeSlug)}`} className="mt-2 inline-block text-sm text-brand underline">
              View profile
            </Link>
          </article>
        ))}
      </div>

      {data ? (
        <div className="flex items-center justify-between text-sm">
          <Link
            href={`${basePath}?${buildQuery({ search: state.search || undefined, letter: state.letter || undefined, page: Math.max(1, data.pagination.page - 1), store_slug: state.storeSlug })}`}
            className={`rounded border px-3 py-1 ${data.pagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          >
            Prev
          </Link>
          <span>
            Page {data.pagination.page} of {data.pagination.total_pages}
          </span>
          <Link
            href={`${basePath}?${buildQuery({
              search: state.search || undefined,
              letter: state.letter || undefined,
              page: Math.min(data.pagination.total_pages, data.pagination.page + 1),
              store_slug: state.storeSlug,
            })}`}
            className={`rounded border px-3 py-1 ${data.pagination.page >= data.pagination.total_pages ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </section>
  );
}
