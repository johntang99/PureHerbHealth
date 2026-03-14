import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/config";
import { NewsletterSignup } from "@/components/content/newsletter-signup";
import { renderContentMarkdown, extractProductSlugsFromEmbeds } from "@/lib/content/markdown-renderer";
import { ProductsMentionedSection } from "@/components/content/products-mentioned-section";

type ContentDetail = {
  id: string;
  slug: string;
  title: string;
  title_zh: string | null;
  body_markdown: string | null;
  body_markdown_zh: string | null;
  type: string;
  featured_image: { url: string; alt: string } | null;
  created_at: string;
  updated_at: string;
};

const STORE_SLUG_DEFAULT = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";

async function resolveStoreId(storeSlug: string) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
  return data?.id || null;
}

async function loadBySlug(slug: string, storeSlug = STORE_SLUG_DEFAULT) {
  const admin = getSupabaseAdminClient();
  const storeId = await resolveStoreId(storeSlug);
  let query = admin
    .from("content")
    .select("id,slug,title,title_zh,body_markdown,body_markdown_zh,type,featured_image,created_at,updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .in("type", ["article", "blog_post", "seasonal_guide", "element_guide"]);
  if (storeId) {
    query = query.eq("store_id", storeId);
  }
  const { data } = await query.maybeSingle();
  return (data as ContentDetail | null) ?? null;
}

function normalizeImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const url = typeof obj.url === "string" ? obj.url : "";
  if (!url) return null;
  return { url, alt: typeof obj.alt === "string" ? obj.alt : "" };
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; slug: string };
}): Promise<Metadata> {
  const content = await loadBySlug(params.slug, STORE_SLUG_DEFAULT);
  if (!content) return { title: "Learn | pureHerbHealth" };
  const title = params.locale === "zh" && content.title_zh ? content.title_zh : content.title;
  const body = params.locale === "zh" && content.body_markdown_zh ? content.body_markdown_zh : content.body_markdown || "";
  const description = body.replace(/[#*_>`~-]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  const image = normalizeImage(content.featured_image);
  return {
    title: `${title} | pureHerbHealth`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: image ? [{ url: image.url, alt: image.alt }] : [],
    },
  };
}

export default async function LearnArticlePage({
  params,
  searchParams,
}: {
  params: { locale: Locale; slug: string };
  searchParams?: { store_slug?: string };
}) {
  const storeSlug = searchParams?.store_slug || STORE_SLUG_DEFAULT;
  const storeQuery = `?store_slug=${encodeURIComponent(storeSlug)}`;
  const content = await loadBySlug(params.slug, storeSlug);
  if (!content) notFound();
  const basePath = `/${params.locale}`;
  const body = params.locale === "zh" && content.body_markdown_zh ? content.body_markdown_zh : content.body_markdown || "";

  const admin = getSupabaseAdminClient();
  const storeId = await resolveStoreId(storeSlug);
  let relatedQuery = admin
    .from("content")
    .select("slug,title,type")
    .eq("status", "published")
    .neq("id", content.id)
    .in("type", ["article", "blog_post", "seasonal_guide", "element_guide"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (storeId) relatedQuery = relatedQuery.eq("store_id", storeId);
  const { data: relatedRows } = await relatedQuery;

  const mentioned = extractProductSlugsFromEmbeds(body);
  const image = normalizeImage(content.featured_image);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.title,
    datePublished: content.created_at,
    dateModified: content.updated_at,
    image: image?.url,
    author: { "@type": "Organization", name: "pureHerbHealth" },
    publisher: { "@type": "Organization", name: "pureHerbHealth" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3005"}/${params.locale}/learn/${content.slug}` },
  };

  return (
    <article className="space-y-4">
      <Link href={`/${params.locale}/learn${storeQuery}`} className="text-sm text-brand underline">
        Back to Learn
      </Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">{content.type.replace(/_/g, " ")}</p>
            <h1 className="text-3xl font-semibold">{params.locale === "zh" && content.title_zh ? content.title_zh : content.title}</h1>
            <p className="text-xs text-slate-500">{new Date(content.created_at).toLocaleDateString()}</p>
          </header>
          {image?.url ? (
            <div className="overflow-hidden rounded border bg-slate-50">
              <Image src={image.url} alt={image.alt || content.title} width={1200} height={576} className="h-72 w-full object-cover" />
            </div>
          ) : null}
          <div>{await renderContentMarkdown({ body, locale: params.locale, basePath })}</div>
          <NewsletterSignup storeSlug={storeSlug} variant="inline" />
          <ProductsMentionedSection productSlugs={mentioned} locale={params.locale} />
        </div>

        <aside className="space-y-3">
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-medium">Related Articles</p>
            <div className="mt-2 space-y-2">
              {(relatedRows || []).map((row) => (
                <Link key={row.slug} href={`/${params.locale}/learn/${row.slug}${storeQuery}`} className="block text-sm text-brand underline">
                  {row.title}
                </Link>
              ))}
            </div>
          </div>
          <NewsletterSignup storeSlug={storeSlug} />
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    </article>
  );
}
