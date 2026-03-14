import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/config";
import { NewsletterSignup } from "@/components/content/newsletter-signup";
import { PreviewStoreBadge } from "@/components/content/preview-store-badge";

export const metadata: Metadata = {
  title: "Condition Guides | pureHerbHealth",
  description: "Understand common wellness concerns through practical TCM condition guides.",
};

const BODY_SYSTEM_LABELS: Record<string, string> = {
  immune: "Immune System",
  digestive: "Digestive Health",
  mind: "Mind & Emotions",
  sleep: "Sleep & Rest",
  pain: "Pain & Movement",
  womens: "Women's Health",
  seasonal: "Seasonal Wellness",
  energy: "Energy & Vitality",
};

export default async function LearnConditionsPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { search?: string; store_slug?: string };
}) {
  const locale = params.locale;
  const basePath = `/${locale}/learn/conditions`;
  const selectedStoreSlug = searchParams.store_slug || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const admin = getSupabaseAdminClient();
  let { data: store } = await admin.from("stores").select("id,slug,name").eq("slug", selectedStoreSlug).maybeSingle();
  if (!store) {
    const fallbackSlug = process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
    const fallback = await admin.from("stores").select("id,slug,name").eq("slug", fallbackSlug).maybeSingle();
    store = fallback.data || null;
  }
  let query = admin
    .from("content")
    .select("id,slug,title,title_zh,body_markdown,featured_image,tcm_data")
    .eq("status", "published")
    .eq("type", "condition_guide")
    .order("published_at", { ascending: false });
  if (store?.id) query = query.eq("store_id", store.id);
  if (searchParams.search) {
    query = query.or(`title.ilike.%${searchParams.search}%,body_markdown.ilike.%${searchParams.search}%`);
  }
  const { data: rows } = await query;

  const grouped = new Map<
    string,
    Array<{ id: string; slug: string; title: string; excerpt: string; featured_image: { url: string; alt: string } | null }>
  >();
  for (const row of rows || []) {
    const tcmData = row.tcm_data && typeof row.tcm_data === "object" ? (row.tcm_data as Record<string, unknown>) : {};
    const bodySystem = typeof tcmData.body_system === "string" ? tcmData.body_system : "general";
    const excerpt = (row.body_markdown || "").replace(/[#*_>`~-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
    const image = row.featured_image && typeof row.featured_image === "object" ? (row.featured_image as { url?: string; alt?: string }) : null;
    const entry = {
      id: row.id,
      slug: row.slug,
      title: locale === "zh" && row.title_zh ? row.title_zh : row.title,
      excerpt,
      featured_image: image?.url ? { url: image.url, alt: image.alt || row.title } : null,
    };
    const arr = grouped.get(bodySystem) || [];
    arr.push(entry);
    grouped.set(bodySystem, arr);
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Condition Library</h1>
        <p className="mt-1 text-sm text-slate-600">Evidence-informed TCM context for common condition patterns.</p>
        <PreviewStoreBadge className="mt-1" storeSlug={store?.slug || selectedStoreSlug} storeName={store?.name} />
      </div>

      <form action={basePath} className="flex gap-2">
        <input type="hidden" name="store_slug" value={store?.slug || selectedStoreSlug} />
        <input type="text" name="search" defaultValue={searchParams.search || ""} placeholder="Search conditions..." className="w-full rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-brand px-3 py-1 text-sm text-white">
          Search
        </button>
      </form>

      {Array.from(grouped.entries()).map(([bodySystem, items]) => (
        <section key={bodySystem} className="space-y-2">
          <h2 className="text-lg font-semibold">{BODY_SYSTEM_LABELS[bodySystem] || bodySystem}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded border bg-white p-3">
                {item.featured_image?.url ? (
                  <div className="mb-2 h-40 overflow-hidden rounded border bg-slate-50">
                    <Image src={item.featured_image.url} alt={item.featured_image.alt || item.title} width={800} height={320} className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.excerpt || "Guide overview coming soon."}</p>
                <Link href={`${basePath}/${item.slug}?store_slug=${encodeURIComponent(store?.slug || selectedStoreSlug)}`} className="mt-2 inline-block text-sm text-brand underline">
                  Read guide
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}

      {grouped.size === 0 ? <p className="text-sm text-slate-600">No condition guides found.</p> : null}
      <NewsletterSignup storeSlug={store?.slug || selectedStoreSlug} variant="inline" />
    </section>
  );
}
