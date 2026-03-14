import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { NewsletterSignup } from "@/components/content/newsletter-signup";

type ConditionDetail = {
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

async function loadCondition(slug: string, storeSlug = STORE_SLUG_DEFAULT): Promise<ConditionDetail | null> {
  const query = new URLSearchParams({ store_slug: storeSlug, type: "condition_guide" });
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}/api/content/${slug}?${query.toString()}`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as ConditionDetail;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; slug: string };
}): Promise<Metadata> {
  const guide = await loadCondition(params.slug, STORE_SLUG_DEFAULT);
  if (!guide) return { title: "Condition Guide | pureHerbHealth" };
  return {
    title: guide.meta_title || `${guide.title} TCM Guide | pureHerbHealth`,
    description: guide.meta_description || `Read ${guide.title} through the lens of TCM patterns and lifestyle support.`,
    openGraph: {
      title: guide.title,
      description: guide.meta_description || `TCM condition guide: ${guide.title}`,
      type: "article",
      images: guide.featured_image?.url ? [{ url: guide.featured_image.url, alt: guide.featured_image.alt || guide.title }] : [],
    },
  };
}

export default async function ConditionDetailPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; slug: string };
  searchParams?: { store_slug?: string };
}) {
  const storeSlug = searchParams?.store_slug || STORE_SLUG_DEFAULT;
  const data = await loadCondition(params.slug, storeSlug);
  if (!data) notFound();
  const conditionsBase = `/${params.locale}/learn/conditions`;
  const storeQuery = `?store_slug=${encodeURIComponent(storeSlug)}`;
  const tcmData = data.tcm_data || {};
  const conditionJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.meta_description || data.title,
    image: data.featured_image?.url,
    datePublished: data.published_at,
    dateModified: data.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}${conditionsBase}/${data.slug}` },
  };

  return (
    <article className="space-y-4">
      <Link href={`${conditionsBase}${storeQuery}`} className="text-sm text-brand underline">
        Back to Condition Library
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        {data.title_zh ? <p className="text-sm text-slate-600">{data.title_zh}</p> : null}
        <p className="text-xs text-slate-500">Updated {new Date(data.updated_at).toLocaleDateString()} · Published {new Date(data.published_at).toLocaleDateString()}</p>
      </header>
      {data.featured_image?.url ? (
        <div className="overflow-hidden rounded border bg-slate-50">
          <Image src={data.featured_image.url} alt={data.featured_image.alt || data.title} width={1200} height={576} className="h-72 w-full object-cover" />
        </div>
      ) : null}
      <section className="rounded border bg-slate-50 p-3 text-sm">
        <p className="font-medium">TCM Perspective</p>
        <p>Body System: {typeof tcmData.body_system === "string" ? tcmData.body_system : "n/a"}</p>
        <p>Element: {typeof tcmData.element === "string" ? tcmData.element : "n/a"}</p>
        <p>Pattern: {typeof tcmData.pattern === "string" ? tcmData.pattern : "n/a"}</p>
        <p>Organs: {Array.isArray(tcmData.organ_systems) ? tcmData.organ_systems.join(", ") : "n/a"}</p>
      </section>
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.body_markdown || "_No content yet._"}</ReactMarkdown>
      </div>
      <section className="grid gap-3 rounded border bg-white p-3 text-sm md:grid-cols-3">
        <div>
          <p className="font-medium">Diet</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {Array.isArray((tcmData.lifestyle as { diet?: string[] } | undefined)?.diet)
              ? (tcmData.lifestyle as { diet: string[] }).diet.map((item) => <li key={item}>{item}</li>)
              : <li>Warm, balanced nutrition.</li>}
          </ul>
        </div>
        <div>
          <p className="font-medium">Exercise</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {Array.isArray((tcmData.lifestyle as { exercise?: string[] } | undefined)?.exercise)
              ? (tcmData.lifestyle as { exercise: string[] }).exercise.map((item) => <li key={item}>{item}</li>)
              : <li>Gentle movement daily.</li>}
          </ul>
        </div>
        <div>
          <p className="font-medium">Habits</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {Array.isArray((tcmData.lifestyle as { habits?: string[] } | undefined)?.habits)
              ? (tcmData.lifestyle as { habits: string[] }).habits.map((item) => <li key={item}>{item}</li>)
              : <li>Consistent sleep and stress management.</li>}
          </ul>
        </div>
      </section>
      {data.linked_products.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Recommended Products</h2>
          {typeof tcmData.ai_recommendation_reasoning === "string" ? (
            <p className="rounded border border-blue-200 bg-blue-50 p-2 text-sm">{tcmData.ai_recommendation_reasoning}</p>
          ) : null}
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
      <section className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        These statements have not been evaluated by the FDA. This content is educational only and does not replace medical advice.
      </section>
      <NewsletterSignup storeSlug={storeSlug} variant="inline" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(conditionJsonLd) }} />
    </article>
  );
}
