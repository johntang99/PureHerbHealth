import Link from "next/link";
import Image from "next/image";

export type LearnContentItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  type: "article" | "blog_post" | "herb_profile" | "condition_guide" | "seasonal_guide" | "element_guide";
  featured_image: { url: string; alt: string } | null;
  published_at: string;
  reading_time_minutes: number;
};

const TYPE_THEME: Record<string, { label: string; classes: string }> = {
  article:         { label: "Blog", classes: "bg-blue-100 text-blue-700" },
  blog_post:       { label: "Blog", classes: "bg-blue-100 text-blue-700" },
  herb_profile:    { label: "Herb", classes: "bg-green-100 text-green-700" },
  condition_guide: { label: "Condition", classes: "bg-purple-100 text-purple-700" },
  seasonal_guide:  { label: "Guide", classes: "bg-amber-100 text-amber-700" },
  element_guide:   { label: "Element", classes: "bg-rose-100 text-rose-700" },
};

function withStoreSlug(url: string, storeSlug?: string) {
  if (!storeSlug) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}store_slug=${encodeURIComponent(storeSlug)}`;
}

function contentHref(basePath: string, content: LearnContentItem, storeSlug?: string) {
  if (content.type === "herb_profile") return withStoreSlug(`${basePath}/herbs/${content.slug}`, storeSlug);
  if (content.type === "condition_guide") return withStoreSlug(`${basePath}/conditions/${content.slug}`, storeSlug);
  return withStoreSlug(`${basePath}/${content.slug}`, storeSlug);
}

export function ContentCard({
  content,
  featured = false,
  basePath = "/learn",
  storeSlug,
}: {
  content: LearnContentItem;
  featured?: boolean;
  basePath?: string;
  storeSlug?: string;
}) {
  const theme = TYPE_THEME[content.type];
  return (
    <article className={`rounded border bg-white ${featured ? "p-4" : "p-3"}`}>
      {content.featured_image?.url ? (
        <div className={`mb-3 overflow-hidden rounded border bg-slate-50 ${featured ? "h-56" : "h-36"}`}>
          <Image src={content.featured_image.url} alt={content.featured_image.alt || content.title} width={800} height={featured ? 448 : 288} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${theme.classes}`}>{theme.label}</span>
        <span className="text-xs text-slate-500">{content.reading_time_minutes} min</span>
      </div>
      <h3 className={`font-semibold ${featured ? "text-xl" : "text-base"}`}>
        <Link href={contentHref(basePath, content, storeSlug)} className="hover:underline">
          {content.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-slate-600">{content.excerpt || "No excerpt available."}</p>
      <p className="mt-2 text-xs text-slate-500">{new Date(content.published_at).toLocaleDateString()}</p>
    </article>
  );
}
