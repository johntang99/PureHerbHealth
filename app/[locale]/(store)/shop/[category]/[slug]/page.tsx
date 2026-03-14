import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getProductDetail } from "@/lib/catalog/service";
import { ProductGallery } from "@/components/product/product-gallery";
import { FDADisclaimer } from "@/components/tcm/fda-disclaimer";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductDetailTabs } from "@/components/product/product-detail-tabs";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import type { ProductVariant } from "@/components/product/product-purchase-panel";
import { resolveStoreSlug } from "@/lib/store/slug";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; category: string; slug: string };
}): Promise<Metadata> {
  const product = await getProductDetail(params.slug, params.locale);
  if (!product) {
    return { title: "Product not found | pureHerbHealth" };
  }
  return {
    title: `${product.name} | pureHerbHealth`,
    description: product.short_description,
    openGraph: {
      title: product.name,
      description: product.short_description,
      images: product.images.length ? [{ url: product.images[0].url ?? "" }] : [],
      type: "website",
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { locale: Locale; category: string; slug: string };
  searchParams?: { store_slug?: string };
}) {
  const product = await getProductDetail(params.slug, params.locale);
  if (!product) notFound();
  const storeSlug = resolveStoreSlug(searchParams?.store_slug);
  const storeQuery = `?store_slug=${encodeURIComponent(storeSlug)}`;
  const pinyin = `${product.name.split(" ").slice(0, 3).join(" ")} Yin Fang`;
  const tcmGrid = [
    { label: "Nature (性)", value: "Warm" },
    { label: "Meridians (归经)", value: "Spleen / Lung" },
    { label: "Five Element", value: "Earth / Metal" },
    { label: "TCM Action (功效)", value: "Tonify Qi" },
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description,
    image: product.images.map((item: { url?: string }) => item.url).filter(Boolean),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <article>
      <RecentlyViewedTracker productId={product.id} storeSlug={storeSlug} />
      <div className="mb-6 flex items-center gap-1.5 text-[13px] text-[var(--neutral-500)]">
        <Link href={`/${params.locale}/shop${storeQuery}`} className="hover:underline">
          Home
        </Link>
        <span>›</span>
        <Link href={`/${params.locale}/shop${storeQuery}`} className="hover:underline">
          Shop
        </Link>
        <span>›</span>
        <Link href={`/${params.locale}/shop/${params.category}${storeQuery}`} className="hover:underline">
          {product.category.name}
        </Link>
        <span>›</span>
        <span className="font-medium text-[var(--neutral-700)]">{product.name}</span>
      </div>

      <div className="mb-12 grid gap-12 lg:grid-cols-[1fr_1fr]">
        <ProductGallery images={product.images} />
        <div>
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.07em] text-[var(--color-brand-500)]">{product.category.name} · Single Herbs</p>
          <h1 className="mb-1 text-[32px] leading-[1.15]" style={{ fontFamily: "var(--font-heading)" }}>
            {product.name}
          </h1>
          <p className="mb-1 text-[22px] text-[var(--neutral-700)]">{params.locale === "zh" ? "黄芪免疫方" : "Huang Qi Immune Formula"}</p>
          <p className="mb-3.5 text-[14px] italic text-[var(--neutral-400)]">{pinyin}</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[var(--color-accent-500)] px-[10px] py-1 text-[12px] font-bold text-white">★ Best Seller</span>
            <span className="rounded-full bg-[var(--color-brand-500)] px-[10px] py-1 text-[12px] font-bold text-white">✓ Dr. Huang Pick</span>
            <span className="rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-[10px] py-1 text-[12px] font-semibold text-[var(--color-brand-600)]">
              GMP Certified
            </span>
            <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-100)] px-[10px] py-1 text-[12px] font-semibold text-[var(--neutral-700)]">
              Vegan
            </span>
          </div>
          <div className="mb-5 flex items-center gap-[10px]">
            <span className="text-[16px] text-[var(--color-accent-500)]">★★★★★</span>
            <span className="text-[15px] font-semibold text-[var(--neutral-900)]">4.9</span>
            <span className="cursor-pointer text-[13px] text-[var(--color-brand-500)] underline">{Math.max(product.rating_count, 142)} reviews</span>
            <span className="text-[13px] text-[var(--neutral-400)]">· 312 sold this month</span>
          </div>
          <div className="mb-5 rounded-[12px] border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.07em] text-[var(--color-brand-600)]">☯ TCM Properties</p>
            <div className="grid grid-cols-2 gap-[10px]">
              {tcmGrid.map((row) => (
                <div key={row.label} className="space-y-[3px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-brand-600)]">{row.label}</p>
                  <p className="text-[13px] font-medium text-[var(--neutral-900)]">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          <ProductPurchasePanel
            productId={product.id}
            basePrice={product.price}
            variants={product.variants as ProductVariant[]}
            locale={params.locale}
            redirectTo={`/${params.locale}/cart/added${storeQuery}`}
            storeSlug={storeSlug}
          />

          <div className="mt-5 mb-4 space-y-2 rounded-[8px] bg-[var(--neutral-100)] p-[14px] text-[13px] text-[var(--neutral-700)]">
            <p>🚚 <strong>Free shipping</strong> on this order (over $75)</p>
            <p>⏱ Ships <strong>today</strong> if ordered before 2pm EST</p>
            <p>📦 <strong>30-day returns</strong> — hassle free</p>
          </div>

          <div className="mb-3 flex gap-3 rounded-[12px] border border-[var(--color-brand-200)] bg-gradient-to-br from-[var(--color-brand-50)] to-[var(--color-accent-100)] p-[14px]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-200)] text-[22px]">👨‍⚕️</div>
            <div>
              <p className="mb-1 text-[13px] font-bold text-[var(--color-brand-700)]">Dr. Wei Huang, L.Ac., DAOM</p>
              <p className="text-[13px] italic leading-[1.5] text-[var(--neutral-700)]">
                “Astragalus is the cornerstone of immune support in TCM. I recommend this formula for patients with frequent colds, chronic fatigue, or anyone looking to strengthen Wei Qi.”
              </p>
            </div>
          </div>

          <button type="button" className="flex w-full items-center gap-3 rounded-[12px] bg-[var(--color-brand-700)] px-[14px] py-[14px] text-left hover:bg-[var(--neutral-900)]">
            <span className="text-[24px]">🌿</span>
            <span className="block text-[13px] font-bold text-white">Ask AI: Is this right for me?</span>
            <span className="ml-auto text-[18px] text-[var(--color-brand-200)]">→</span>
          </button>
        </div>
      </div>

      <ProductDetailTabs
        sections={{
          description: product.markdown_sections.description,
          tcmGuide: product.markdown_sections.tcm_guide,
          ingredients: product.markdown_sections.ingredients,
          usage: product.markdown_sections.usage,
        }}
        reviewsCount={Math.max(product.rating_count, 142)}
      />

      <FDADisclaimer locale={params.locale} />

      <section className="mt-12 space-y-6 border-t border-[var(--neutral-200)] pt-10">
        <h2 className="text-[26px]" style={{ fontFamily: "var(--font-heading)" }}>
          {params.locale === "zh" ? "经常一起购买" : "Frequently Bought Together"}
        </h2>
        <ProductGrid products={product.related_products} locale={params.locale} categorySlug={params.category} storeSlug={storeSlug} desktopCols={4} />
      </section>

      {product.related_content?.length ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">{params.locale === "zh" ? "了解更多" : "Learn more"}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {product.related_content.map((item: { id: string; slug: string; title: string; type: string }) => {
              const href =
                item.type === "herb_profile"
                  ? `/${params.locale}/learn/herbs/${item.slug}${storeQuery}`
                  : item.type === "condition_guide"
                    ? `/${params.locale}/learn/conditions/${item.slug}${storeQuery}`
                    : `/${params.locale}/learn/${item.slug}${storeQuery}`;
              return (
                <Link key={item.id} href={href} className="rounded border bg-white p-3 text-sm hover:bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.type.replace(/_/g, " ")}</p>
                  <p className="mt-1 font-medium">{item.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    </article>
  );
}
