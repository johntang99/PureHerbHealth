import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { HerbMeridianVisualization } from "@/components/content/herb-meridian-visualization";
import { NewsletterSignup } from "@/components/content/newsletter-signup";

type HerbDetail = {
  id: string;
  slug: string;
  title: string;
  title_zh: string | null;
  body_markdown: string | null;
  featured_image: { url: string; alt: string } | null;
  linked_products: Array<{ id: string; slug: string; name: string; price: number; category_slug: string | null }>;
  tcm_data: Record<string, unknown>;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
  updated_at: string;
};

const STORE_SLUG_DEFAULT = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

async function loadHerb(slug: string, storeSlug = STORE_SLUG_DEFAULT): Promise<HerbDetail | null> {
  const query = new URLSearchParams({ store_slug: storeSlug });
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}/api/content/herbs/${slug}?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as HerbDetail;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; slug: string };
}): Promise<Metadata> {
  const herb = await loadHerb(params.slug, STORE_SLUG_DEFAULT);
  if (!herb) return { title: "Herb Profile | pureHerbHealth" };
  const chinese = typeof herb.tcm_data?.chinese_name === "string" ? ` (${String(herb.tcm_data.chinese_name)})` : "";
  return {
    title: herb.meta_title || `${herb.title}${chinese} | pureHerbHealth`,
    description: herb.meta_description || `Learn ${herb.title} properties, uses, and related products.`,
    openGraph: {
      title: herb.title,
      description: herb.meta_description || `Learn ${herb.title} properties and practical use guidance.`,
      type: "article",
      images: herb.featured_image?.url ? [{ url: herb.featured_image.url, alt: herb.featured_image.alt || herb.title }] : [],
    },
  };
}

export default async function HerbDetailPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; slug: string };
  searchParams?: { store_slug?: string };
}) {
  const storeSlug = searchParams?.store_slug || STORE_SLUG_DEFAULT;
  const data = await loadHerb(params.slug, storeSlug);
  if (!data) notFound();
  const storeQuery = `?store_slug=${encodeURIComponent(storeSlug)}`;
  const herbsBase = `/${params.locale}/learn/herbs`;
  const tcmData = data.tcm_data || {};
  const herbJsonLd = {
    "@context": "https://schema.org",
    "@type": "Thing",
    name: `${data.title}${typeof tcmData.chinese_name === "string" ? ` (${tcmData.chinese_name})` : ""}`,
    alternateName: typeof tcmData.pinyin === "string" ? tcmData.pinyin : undefined,
    description: data.meta_description || `${data.title} profile with TCM properties and usage guidance.`,
    image: data.featured_image?.url,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}${herbsBase}/${data.slug}`,
  };

  return (
    <article className="space-y-4">
      <Link href={`${herbsBase}${storeQuery}`} className="text-sm text-brand underline">
        Back to Herb Directory
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        {data.title_zh || typeof tcmData.chinese_name === "string" ? (
          <p className="text-sm text-slate-600">{data.title_zh || String(tcmData.chinese_name)}</p>
        ) : null}
        <p className="text-xs text-slate-500">Updated {new Date(data.updated_at).toLocaleDateString()} · {new Date(data.published_at).toLocaleDateString()}</p>
      </header>
      {data.featured_image?.url ? (
        <div className="overflow-hidden rounded border bg-slate-50">
          <Image src={data.featured_image.url} alt={data.featured_image.alt || data.title} width={1200} height={576} className="h-72 w-full object-cover" />
        </div>
      ) : null}
      <section className="grid gap-3 rounded border bg-slate-50 p-3 text-sm md:grid-cols-2">
        <div>
          <p className="font-medium">TCM Properties</p>
          <p>Nature: {typeof tcmData.nature === "string" ? tcmData.nature : "n/a"}</p>
          <p>Category: {typeof tcmData.category === "string" ? tcmData.category : "n/a"}</p>
          <p>Pinyin: {typeof tcmData.pinyin === "string" ? tcmData.pinyin : "n/a"}</p>
        </div>
        <div>
          <p>Elements: {Array.isArray(tcmData.elements) ? tcmData.elements.join(", ") : "n/a"}</p>
          <p>Meridians: {Array.isArray(tcmData.meridians) ? tcmData.meridians.join(", ") : "n/a"}</p>
          <p>Dosage: {typeof tcmData.dosage === "string" ? tcmData.dosage : "n/a"}</p>
        </div>
      </section>
      <HerbMeridianVisualization meridians={Array.isArray(tcmData.meridians) ? (tcmData.meridians as string[]) : []} />
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.body_markdown || "_No content yet._"}</ReactMarkdown>
      </div>
      {Array.isArray(tcmData.contraindications) && tcmData.contraindications.length > 0 ? (
        <section className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium">Precautions</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {(tcmData.contraindications as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {data.linked_products.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Shop Products Containing {data.title}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.linked_products.map((product) => (
              <Link
                key={product.id}
                href={`/${params.locale}/shop/${product.category_slug || "immune-support"}/${product.slug}${storeQuery}`}
                className="rounded border bg-white p-3 text-sm hover:bg-slate-50"
              >
                <p className="font-medium">{product.name}</p>
                <p className="mt-1">${product.price.toFixed(2)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <NewsletterSignup storeSlug={storeSlug} variant="inline" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(herbJsonLd) }} />
    </article>
  );
}
