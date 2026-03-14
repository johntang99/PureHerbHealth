import { getDictionaries } from "@/lib/i18n/dictionaries";
import { type Locale } from "@/lib/i18n/config";
import Link from "next/link";
import Image from "next/image";
import { listProducts } from "@/lib/catalog/service";
import { NewsletterSignup } from "@/components/content/newsletter-signup";
import { getStoreSiteConfig } from "@/lib/store/site-config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductCardDto } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

type LearnPreview = {
  id: string;
  slug: string;
  title: string;
  type: "blog_post" | "seasonal_guide" | "element_guide" | "herb_profile" | "condition_guide";
  excerpt: string;
  image: { url: string; alt: string } | null;
};

type CategoryPreview = {
  slug: string;
  name: string;
  nameZh?: string;
  count: number;
};

function normalizeImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  return typeof obj.url === "string" && obj.url
    ? {
        url: obj.url,
        alt: typeof obj.alt === "string" ? obj.alt : "",
      }
    : null;
}

function learnHref(locale: Locale, item: LearnPreview, storeSlug: string) {
  const storeQuery = `store_slug=${encodeURIComponent(storeSlug)}`;
  if (item.type === "herb_profile") return `/${locale}/learn/herbs/${item.slug}?${storeQuery}`;
  if (item.type === "condition_guide") return `/${locale}/learn/conditions/${item.slug}?${storeQuery}`;
  return `/${locale}/learn/${item.slug}?${storeQuery}`;
}

function productHref(locale: Locale, product: ProductCardDto, storeSlug: string) {
  return `/${locale}/shop/${product.category.slug}/${product.slug}?store_slug=${encodeURIComponent(storeSlug)}`;
}

function categoryEmoji(slug: string) {
  if (slug.includes("formula")) return "🧪";
  if (slug.includes("single") || slug.includes("herb")) return "🌿";
  if (slug.includes("tea")) return "🍵";
  if (slug.includes("moxi")) return "🔥";
  if (slug.includes("tool")) return "🧰";
  if (slug.includes("book") || slug.includes("guide")) return "📚";
  return "🌱";
}

function categoryRank(slug: string) {
  const key = slug.toLowerCase();
  if (key.includes("formula")) return 1;
  if (key.includes("single") || key.includes("herb")) return 2;
  if (key.includes("tea")) return 3;
  if (key.includes("moxi")) return 4;
  if (key.includes("tool")) return 5;
  if (key.includes("book") || key.includes("guide")) return 6;
  return 99;
}

export default async function StoreHomePage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { store_slug?: string };
}) {
  const requestedStoreSlug = searchParams?.store_slug?.trim();
  const store = await getStoreSiteConfig(requestedStoreSlug);
  const dict = await getDictionaries(params.locale);
  const locale = params.locale;
  const admin = getSupabaseAdminClient();

  const productData = await listProducts({
    locale,
    page: 1,
    perPage: 8,
    sort: "newest",
    storeSlug: store.slug,
  });

  let contentQuery = admin
    .from("content")
    .select("id,slug,title,title_zh,type,featured_image,meta_description,body_markdown,published_at")
    .eq("status", "published")
    .in("type", ["blog_post", "seasonal_guide", "element_guide", "herb_profile", "condition_guide"])
    .order("published_at", { ascending: false })
    .limit(3);

  if (store.id) contentQuery = contentQuery.eq("store_id", store.id);
  const { data: learnRows } = await contentQuery;

  const learnItems: LearnPreview[] = (learnRows || []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: locale === "zh" && row.title_zh ? row.title_zh : row.title,
    type: row.type as LearnPreview["type"],
    excerpt:
      row.meta_description ||
      (row.body_markdown || "").replace(/[#*_>`~-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) ||
      (locale === "zh" ? "查看完整内容" : "Read the full guide"),
    image: normalizeImage(row.featured_image),
  }));

  const { data: categoryRows } = await admin.from("categories").select("id,slug,name,name_zh").order("created_at", { ascending: true });
  let categoryCountById: Record<string, number> = {};
  if (store.id) {
    const { data: storeProducts } = await admin.from("store_products").select("product_id").eq("store_id", store.id).eq("enabled", true);
    const productIds = (storeProducts || []).map((item) => item.product_id);
    if (productIds.length > 0) {
      const { data: productRows } = await admin
        .from("products")
        .select("category_id")
        .eq("enabled", true)
        .in("id", productIds);
      categoryCountById = (productRows || []).reduce<Record<string, number>>((acc, row) => {
        if (row.category_id) acc[row.category_id] = (acc[row.category_id] || 0) + 1;
        return acc;
      }, {});
    }
  } else {
    const { data: productRows } = await admin.from("products").select("category_id").eq("enabled", true);
    categoryCountById = (productRows || []).reduce<Record<string, number>>((acc, row) => {
      if (row.category_id) acc[row.category_id] = (acc[row.category_id] || 0) + 1;
      return acc;
    }, {});
  }

  const categoryHighlights: CategoryPreview[] = (categoryRows || [])
    .map((row) => ({
      slug: row.slug,
      name: locale === "zh" && row.name_zh ? row.name_zh : row.name,
      nameZh: row.name_zh || undefined,
      count: categoryCountById[row.id] || 0,
    }))
    .sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug) || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);

  const heroTitle =
    locale === "zh" ? "古法智慧，现代验证，为你定制的日常调理方案" : "Ancient Wisdom. Modern Science. Personalized for You.";
  const heroBody =
    locale === "zh"
      ? "从体质辨识、知识学习到产品购买与咨询建议，构建一站式中医养生体验。"
      : "Practitioner-curated herbal products and AI-powered guidance, so you can discover, learn, and shop with confidence.";
  const learnQuery = `?store_slug=${encodeURIComponent(store.slug)}`;
  const shopQuery = `?store_slug=${encodeURIComponent(store.slug)}`;

  return (
    <section>
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 w-screen overflow-hidden bg-gradient-to-br from-[var(--color-brand-800)] via-[var(--color-brand-600)] to-[var(--color-brand-700)] text-white">
        <div className="absolute -right-24 -top-24 h-[520px] w-[520px] rounded-full bg-[var(--color-accent-500)]/10 blur-3xl" />
        <div className="mx-auto max-w-[1280px] px-4 py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-[1.15fr_1fr]">
            <div className="relative z-10 space-y-5">
              <span className="inline-flex rounded-full border border-[var(--color-accent-300)]/50 bg-[var(--color-accent-500)]/20 px-3 py-1 text-xs uppercase tracking-widest text-[var(--color-accent-300)]">
                AI + TCM Wellness Store
              </span>
              <h1 className="max-w-xl text-4xl font-normal leading-[1.1] text-white md:text-[52px]" style={{ fontFamily: "var(--font-heading)" }}>
                {locale === "zh" ? (
                  heroTitle
                ) : (
                  <>
                    Ancient Wisdom.
                    <br />
                    <span className="text-[var(--color-accent-300)]">Modern Science.</span>
                    <br />
                    Personalized for You.
                  </>
                )}
              </h1>
              <p className="max-w-xl text-[16px] text-[var(--color-brand-200)]">{heroBody}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/shop${shopQuery}`}
                  className="rounded-md bg-[var(--color-accent-500)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-700)]"
                >
                  {locale === "zh" ? "浏览精选产品" : "Shop Herbal Formulas"}
                </Link>
                <Link
                  href={`/${locale}/ai-wellness${shopQuery}`}
                  className="rounded-md border border-white/50 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  {locale === "zh" ? "开始体质问答" : "Take Constitution Quiz"}
                </Link>
              </div>
              <div className="flex gap-8 pt-3">
                <div>
                  <p className="text-2xl font-bold">{productData.pagination.total}+</p>
                  <p className="text-xs text-[var(--color-brand-300)]">{locale === "zh" ? "可选产品" : "Products"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">4.9★</p>
                  <p className="text-xs text-[var(--color-brand-300)]">{locale === "zh" ? "平均评分" : "Avg Rating"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">24/7</p>
                  <p className="text-xs text-[var(--color-brand-300)]">{locale === "zh" ? "AI 指导" : "AI Guides"}</p>
                </div>
              </div>
            </div>
            <div className="relative z-10 rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="mb-3 text-sm text-[var(--color-brand-300)]">{locale === "zh" ? "AI 问答预览" : "AI wellness assistant preview"}</p>
              <div className="space-y-3 rounded-lg bg-white/10 p-3">
                <div className="rounded-md bg-white/15 p-3 text-sm">{locale === "zh" ? "最近总是睡不好，晚上容易醒，该如何调理？" : "I wake up often at night. Any TCM suggestions?"}</div>
                <div className="rounded-md bg-[var(--color-brand-500)]/70 p-3 text-sm">
                  {locale === "zh"
                    ? "先从睡前 2 小时停止生冷与咖啡因开始，并尝试温和养心安神方案。建议查看「睡眠调理」和「心脾两虚」内容。"
                    : "Start with a warming evening routine and reduce stimulants after 3pm. Explore sleep-focused formulas and Heart-Spleen support guides."}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-[var(--color-accent-300)]/40 bg-[var(--color-accent-500)]/20 p-3 text-sm">
                <p className="font-semibold text-[var(--color-accent-300)]">{locale === "zh" ? "推荐下一步" : "Suggested next step"}</p>
                <Link href={`/${locale}/learn/five-elements${learnQuery}`} className="mt-1 inline-block underline">
                  {locale === "zh" ? "查看五行体质内容" : "Open Five Elements Guide"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-b border-[var(--neutral-200)] bg-white px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-[1280px] text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{locale === "zh" ? "分类导航" : "Browse by category"}</p>
          <h2 className="text-[36px] leading-tight text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-heading)" }}>
            {locale === "zh" ? "你在找什么？" : "What are you looking for?"}
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1280px] gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {categoryHighlights.length > 0 ? (
            categoryHighlights.map((category, idx) => (
              <Link
                key={category.slug}
                href={`/${locale}/shop?category=${encodeURIComponent(category.slug)}&store_slug=${encodeURIComponent(store.slug)}`}
                className={`flex flex-col items-center gap-2 rounded-[12px] border p-5 text-center no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-100)] hover:shadow-md ${
                  idx === 0 ? "border-[var(--color-brand-500)] bg-[var(--color-brand-100)]" : "border-[var(--neutral-200)] bg-[var(--neutral-50)]"
                }`}
              >
                <p className="text-[32px]">{categoryEmoji(category.slug)}</p>
                <p className="text-[13px] font-semibold text-[var(--neutral-900)]">{category.name}</p>
                {category.nameZh ? <p className="text-xs text-[var(--neutral-500)]">{category.nameZh}</p> : null}
                <p className="text-[11px] text-[var(--neutral-400)]">
                  {category.count} {locale === "zh" ? "件商品" : "products"}
                </p>
              </Link>
            ))
          ) : (
            <p className="rounded border border-dashed p-4 text-sm text-slate-600">{locale === "zh" ? "暂无分类数据。" : "No category data yet."}</p>
          )}
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[var(--neutral-50)] px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-[1280px] text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{locale === "zh" ? "精选产品" : "Featured products"}</p>
          <h2 className="mb-2 text-[48px] leading-[1.08] text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-heading)" }}>
            {locale === "zh" ? "专业师资推荐热销品" : "Practitioner-Recommended Bestsellers"}
          </h2>
          <p className="mx-auto max-w-[560px] text-[17px] text-[var(--neutral-500)]">
            {locale === "zh" ? "每款产品均由执业中医团队审核，兼顾品质与适配场景。" : "Every product is vetted for quality and efficacy by our licensed TCM practitioners."}
          </p>
        </div>
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-5 lg:grid-cols-4">
          {productData.products.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              href={productHref(locale, product, store.slug)}
              className="group relative overflow-hidden rounded-[12px] border border-[var(--neutral-200)] bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[var(--color-brand-200)] hover:shadow-lg"
            >
              <div className="relative">
                <div className="aspect-square overflow-hidden bg-[var(--color-brand-100)]">
                  <Image src={product.primary_image.url} alt={product.primary_image.alt} width={600} height={600} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-500)] px-2 py-[3px] text-[11px] font-semibold text-white">
                    {locale === "zh" ? "热销" : "Best Seller"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-500)] px-2 py-[3px] text-[11px] font-semibold text-white">
                    {locale === "zh" ? "师资推荐" : "Practitioner Pick"}
                  </span>
                </div>
                <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-base text-[var(--neutral-400)] shadow-sm">
                  ♡
                </span>
              </div>
              <div className="p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-brand-500)]">{product.category.name}</p>
                <p className="mb-2 line-clamp-2 text-[15px] font-semibold leading-[1.3] text-[var(--neutral-900)]">{product.name}</p>
                <p className="mb-2 text-[13px] text-[var(--color-accent-500)]">★★★★★ <span className="ml-1 text-[var(--neutral-400)]">({product.rating_count})</span></p>
                <div className="mb-2 flex items-baseline gap-2">
                  <p className="text-[20px] font-bold text-[var(--neutral-900)]">${product.price.toFixed(2)}</p>
                </div>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--neutral-500)]">
                  <span className={`h-[7px] w-[7px] rounded-full ${product.stock_status === "out_of_stock" ? "bg-red-500" : "bg-green-600"}`} />
                  <span>{product.stock_status === "out_of_stock" ? (locale === "zh" ? "缺货" : "Out of stock") : locale === "zh" ? "有库存" : "In stock"}</span>
                </div>
                <span className="block w-full rounded-md bg-[var(--color-brand-500)] px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-[var(--color-brand-600)]">
                  {locale === "zh" ? "加入购物车" : "Add to Cart"}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-[1280px] justify-center">
          <Link href={`/${locale}/shop${shopQuery}`} className="inline-flex items-center rounded-md border border-[var(--color-brand-500)] px-7 py-3 text-sm font-semibold text-[var(--color-brand-600)] transition hover:bg-[var(--color-brand-100)]">
            {locale === "zh" ? "查看全部产品" : "View all products"}
          </Link>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[var(--color-brand-900)] px-4 py-16 text-white md:px-8">
        <div className="mx-auto grid max-w-[1280px] gap-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-accent-300)]">{locale === "zh" ? "五行引导" : "TCM Foundation"}</p>
            <h2 className="mb-4 text-[36px] text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {locale === "zh" ? "五行体质引导你的健康路径" : "The Five Elements Guide Your Wellness"}
            </h2>
            <p className="mb-8 text-[15px] leading-[1.7] text-[var(--color-brand-200)]">
              {locale === "zh"
                ? "传统中医将人体与五行对应：木、火、土、金、水。通过体质倾向、季节与情志，建立更可持续的调理方案。"
                : "Traditional Chinese Medicine maps constitution to Five Elements — Wood, Fire, Earth, Metal, and Water — to guide seasonal and lifestyle balance."}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="rounded border border-white/20 px-4 py-2">Wood • Liver • Tendons</span>
              <span className="rounded border border-white/20 px-4 py-2">Fire • Heart • Joy</span>
              <span className="rounded border border-white/20 px-4 py-2">Earth • Spleen • Digestion</span>
              <span className="rounded border border-white/20 px-4 py-2">Water • Kidney • Vitality</span>
            </div>
            <Link href={`/${locale}/learn/five-elements${learnQuery}`} className="mt-4 inline-flex rounded-md bg-[var(--color-accent-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-accent-700)]">
              {locale === "zh" ? "探索体质" : "Discover your constitution"}
            </Link>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-80 w-80">
              <span className="absolute left-1/2 top-1/2 h-1 w-56 -translate-x-1/2 -translate-y-1/2 rotate-12 bg-white/20" />
              <span className="absolute left-1/2 top-1/2 h-1 w-56 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-white/20" />
              <div className="absolute left-[50%] top-2 h-14 w-14 -translate-x-1/2 rounded-full border-2 border-[#4AA370] bg-[#4AA370]/20 text-center text-xs leading-[56px]">WOOD</div>
              <div className="absolute right-3 top-[34%] h-14 w-14 rounded-full border-2 border-[#DC4A3F] bg-[#DC4A3F]/20 text-center text-xs leading-[56px]">FIRE</div>
              <div className="absolute right-[20%] bottom-3 h-14 w-14 rounded-full border-2 border-[#D4A843] bg-[#D4A843]/20 text-center text-xs leading-[56px]">EARTH</div>
              <div className="absolute left-[20%] bottom-3 h-14 w-14 rounded-full border-2 border-[#2563EB] bg-[#2563EB]/20 text-center text-xs leading-[56px]">WATER</div>
              <div className="absolute left-3 top-[34%] h-14 w-14 rounded-full border-2 border-[#A0A0A0] bg-[#A0A0A0]/20 text-center text-xs leading-[56px]">METAL</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-white px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-[1280px] text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{locale === "zh" ? "知识内容" : "TCM Knowledge Hub"}</p>
          <h2 className="mb-3 text-[36px]" style={{ fontFamily: "var(--font-heading)" }}>
            {locale === "zh" ? "先学习，再安心选购" : "Learn, Then Shop with Confidence"}
          </h2>
          <p className="mx-auto max-w-[560px] text-[17px] text-[var(--neutral-500)]">
            {locale === "zh" ? "AI+人工审核内容帮助你理解体质、草药与日常调理，再做购买决策。" : "AI-written, practitioner-reviewed content explains TCM concepts, herbs, and conditions in plain language."}
          </p>
        </div>
        <div className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-3">
          {learnItems.length > 0 ? (
            learnItems.map((item) => (
              <Link key={item.id} href={learnHref(locale, item, store.slug)} className="overflow-hidden rounded-[12px] border border-[var(--neutral-200)] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                {item.image?.url ? (
                  <div className="h-[180px] overflow-hidden border-b bg-slate-100">
                    <Image src={item.image.url} alt={item.image.alt || item.title} width={720} height={288} className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div className="p-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-brand-500)]">{item.type.replace(/_/g, " ")}</p>
                  <p className="mb-2 text-[17px] leading-[1.4] text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-heading)" }}>
                    {item.title}
                  </p>
                  <p className="mb-3 text-sm leading-[1.6] text-[var(--neutral-500)]">{item.excerpt}</p>
                  <p className="text-[13px] font-semibold text-[var(--color-brand-500)]">{locale === "zh" ? "阅读 →" : "Read →"}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded border border-dashed p-4 text-sm text-slate-600">{locale === "zh" ? "暂无内容更新。" : "No learn content yet."}</p>
          )}
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-t border-[var(--neutral-200)] bg-[var(--neutral-100)] px-4 py-16 md:px-8">
        <div className="mx-auto mb-10 max-w-[1280px] text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">{locale === "zh" ? "信任与保障" : "Why shop with us"}</p>
          <h2 className="text-[36px]" style={{ fontFamily: "var(--font-heading)" }}>
            {locale === "zh" ? "安全、稳定、可信赖" : "Safe, Secure & Trusted"}
          </h2>
        </div>
        <div className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-4">
          <article className="rounded-[12px] border border-[var(--neutral-200)] bg-white px-6 py-7 text-center shadow-sm">
            <p className="mb-3 text-4xl">🔒</p>
            <p className="mt-2 font-semibold">{locale === "zh" ? "安全支付" : "Secure Payments"}</p>
            <p className="mt-1 text-[13px] text-[var(--neutral-500)]">{locale === "zh" ? "256-bit SSL 加密与多渠道支付。" : "256-bit SSL encryption and trusted payment gateways."}</p>
          </article>
          <article className="rounded-[12px] border border-[var(--neutral-200)] bg-white px-6 py-7 text-center shadow-sm">
            <p className="mb-3 text-4xl">✅</p>
            <p className="mt-2 font-semibold">{locale === "zh" ? "品质验证" : "Quality Verified"}</p>
            <p className="mt-1 text-[13px] text-[var(--neutral-500)]">{locale === "zh" ? "严格来源与批次管理" : "Sourcing and manufacturing standards you can trust."}</p>
          </article>
          <article className="rounded-[12px] border border-[var(--neutral-200)] bg-white px-6 py-7 text-center shadow-sm">
            <p className="mb-3 text-4xl">↩️</p>
            <p className="mt-2 font-semibold">{locale === "zh" ? "轻松售后" : "Easy Returns"}</p>
            <p className="mt-1 text-[13px] text-[var(--neutral-500)]">{locale === "zh" ? "30 天保障政策" : "Hassle-free support and return policy."}</p>
          </article>
          <article className="rounded-[12px] border border-[var(--neutral-200)] bg-white px-6 py-7 text-center shadow-sm">
            <p className="mb-3 text-4xl">🧑‍⚕️</p>
            <p className="mt-2 font-semibold">{locale === "zh" ? "师资支持" : "Practitioner Network"}</p>
            <p className="mt-1 text-[13px] text-[var(--neutral-500)]">{locale === "zh" ? "AI + 人工双重建议" : "Products backed by licensed practitioner guidance."}</p>
          </article>
        </div>
        <div className="mx-auto mt-8 flex max-w-[1280px] flex-wrap items-center justify-center gap-4">
          {["SSL Secured", "Stripe Payments", "GMP Certified", "UPS/USPS", "30-Day Returns"].map((label) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-4 py-2 text-[13px] text-[var(--neutral-700)] shadow-sm">
              <span className="text-green-600">✓</span>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-gradient-to-br from-[var(--color-brand-700)] to-[var(--color-brand-500)] px-4 py-16 text-center text-white md:px-8">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2 text-[36px]" style={{ fontFamily: "var(--font-heading)" }}>
            {locale === "zh" ? "你的免费中医养生指南" : "Your Free TCM Wellness Guide"}
          </h2>
          <p className="mb-7 text-base text-[var(--color-brand-200)]">
            {locale === "zh"
              ? "加入我们的养生社区，每周获取调理建议与内容更新。"
              : "Join wellness seekers and get practical weekly TCM insights."}
          </p>
          <div className="mx-auto max-w-[440px]">
            <NewsletterSignup storeSlug={store.slug} variant="footer" />
          </div>
          <p className="mt-3 text-xs text-[var(--color-brand-300)]">{dict.common.siteName}</p>
        </div>
      </section>
    </section>
  );
}
