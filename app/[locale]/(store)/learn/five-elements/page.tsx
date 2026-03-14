import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { FiveElementsDiagram, type ElementNode } from "@/components/content/five-elements-diagram";
import { NewsletterSignup } from "@/components/content/newsletter-signup";
import { PreviewStoreBadge } from "@/components/content/preview-store-badge";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ElementId = "wood" | "fire" | "earth" | "metal" | "water";

const ELEMENTS_FALLBACK: ElementNode[] = [
  { id: "wood", label: "Wood", emoji: "🪵", color: "#22c55e", season: "Spring", organs: "Liver / Gallbladder", summary: "Growth and smooth qi movement.", generates: "fire", controls: "earth" },
  { id: "fire", label: "Fire", emoji: "🔥", color: "#ef4444", season: "Summer", organs: "Heart / Small Intestine", summary: "Warmth, circulation, and joy.", generates: "earth", controls: "metal" },
  { id: "earth", label: "Earth", emoji: "🌍", color: "#eab308", season: "Late Summer", organs: "Spleen / Stomach", summary: "Nourishment and transformation.", generates: "metal", controls: "water" },
  { id: "metal", label: "Metal", emoji: "🌬️", color: "#94a3b8", season: "Autumn", organs: "Lung / Large Intestine", summary: "Boundary, breath, and release.", generates: "water", controls: "wood" },
  { id: "water", label: "Water", emoji: "💧", color: "#3b82f6", season: "Winter", organs: "Kidney / Bladder", summary: "Restoration and foundational essence.", generates: "wood", controls: "fire" },
];

export const metadata: Metadata = {
  title: "Five Elements Guide | pureHerbHealth",
  description: "Understand Wood, Fire, Earth, Metal, and Water cycles in traditional Chinese medicine.",
};

export default async function FiveElementsPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { store_slug?: string };
}) {
  const locale = params.locale;
  const requestedStoreSlug = searchParams?.store_slug?.trim() || process.env.NEXT_PUBLIC_STORE_SLUG || "pureherbhealth";
  const storeQuery = requestedStoreSlug ? `?store_slug=${encodeURIComponent(requestedStoreSlug)}` : "";
  const herbsHref = `/${locale}/learn/herbs${storeQuery}`;
  const conditionsHref = `/${locale}/learn/conditions${storeQuery}`;
  const admin = getSupabaseAdminClient();
  let { data: store } = await admin.from("stores").select("id,slug,name").eq("slug", requestedStoreSlug).maybeSingle();
  if (!store) {
    const fallbackSlug = process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth";
    const fallback = await admin.from("stores").select("id,slug,name").eq("slug", fallbackSlug).maybeSingle();
    store = fallback.data || null;
  }

  let elements = ELEMENTS_FALLBACK;
  if (store?.id) {
    const { data: configRows } = await admin
      .from("five_elements_config")
      .select("element_id,label,emoji,color,season,organs,summary,generates_element_id,controls_element_id,display_order")
      .eq("store_id", store.id)
      .order("display_order", { ascending: true });
    if (configRows && configRows.length > 0) {
      elements = configRows.map((row) => ({
        id: row.element_id as ElementId,
        label: row.label,
        emoji: row.emoji,
        color: row.color,
        season: row.season,
        organs: row.organs,
        summary: row.summary,
        generates: row.generates_element_id as ElementId,
        controls: row.controls_element_id as ElementId,
      }));
    }
  }

  let contentQuery = admin
    .from("content")
    .select("id,slug,title,title_zh,type,tcm_data,linked_product_ids")
    .eq("status", "published")
    .in("type", ["herb_profile", "condition_guide"]);
  if (store?.id) contentQuery = contentQuery.eq("store_id", store.id);
  const { data: contentRows } = await contentQuery;

  const productIds = new Set<string>();
  for (const row of contentRows || []) {
    for (const productId of Array.isArray(row.linked_product_ids) ? row.linked_product_ids : []) {
      if (typeof productId === "string") productIds.add(productId);
    }
  }
  let productById = new Map<string, { slug: string; label: string; categorySlug: string }>();
  if (productIds.size > 0) {
    const { data: products } = await admin
      .from("products")
      .select("id,slug,name,name_zh,category_id,categories:category_id(slug)")
      .in("id", Array.from(productIds))
      .eq("enabled", true);
    productById = new Map(
      (products || []).map((product) => {
        const category = Array.isArray(product.categories)
          ? product.categories[0]
          : (product.categories as { slug?: string } | null);
        return [
          product.id,
          {
            slug: product.slug,
            label: locale === "zh" && product.name_zh ? product.name_zh : product.name,
            categorySlug: category?.slug || "immune-support",
          },
        ];
      }),
    );
  }

  const dataByElement: Record<
    ElementId,
    {
      herbs: Array<{ slug: string; label: string }>;
      conditions: Array<{ slug: string; label: string }>;
      products: Array<{ slug: string; label: string; categorySlug: string }>;
    }
  > = {
    wood: { herbs: [], conditions: [], products: [] },
    fire: { herbs: [], conditions: [], products: [] },
    earth: { herbs: [], conditions: [], products: [] },
    metal: { herbs: [], conditions: [], products: [] },
    water: { herbs: [], conditions: [], products: [] },
  };

  for (const row of contentRows || []) {
    const tcmData = row.tcm_data && typeof row.tcm_data === "object" ? (row.tcm_data as Record<string, unknown>) : {};
    const elementList = new Set<string>();
    if (typeof tcmData.element === "string") elementList.add(tcmData.element.toLowerCase());
    for (const item of Array.isArray(tcmData.elements) ? tcmData.elements : []) {
      if (typeof item === "string") elementList.add(item.toLowerCase());
    }
    const normalizedElements = Array.from(elementList).filter((el): el is ElementId => ["wood", "fire", "earth", "metal", "water"].includes(el));

    for (const element of normalizedElements) {
      const target = dataByElement[element];
      const label = locale === "zh" && row.title_zh ? row.title_zh : row.title;
      if (row.type === "herb_profile") {
        if (!target.herbs.find((entry) => entry.slug === row.slug)) target.herbs.push({ slug: row.slug, label });
      } else if (row.type === "condition_guide") {
        if (!target.conditions.find((entry) => entry.slug === row.slug)) target.conditions.push({ slug: row.slug, label });
      }
      for (const productId of Array.isArray(row.linked_product_ids) ? row.linked_product_ids : []) {
        if (typeof productId !== "string") continue;
        const product = productById.get(productId);
        if (!product) continue;
        if (!target.products.find((entry) => entry.slug === product.slug)) {
          target.products.push(product);
        }
      }
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: elements.map((element) => ({
      "@type": "Question",
      name: `What is the ${element.label} element in TCM?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${element.label} relates to ${element.season}, ${element.organs}, and emphasizes cyclical balance across body systems.`,
      },
    })),
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Five Elements</h1>
        <p className="mt-1 text-sm text-slate-600">A practical clinical overview of Wood, Fire, Earth, Metal, and Water dynamics.</p>
        <PreviewStoreBadge className="mt-1" storeSlug={store?.slug || requestedStoreSlug} storeName={store?.name} />
      </header>

      <FiveElementsDiagram locale={locale} elements={elements} dataByElement={dataByElement} storeSlug={store?.slug || requestedStoreSlug} />

      <div className="grid gap-3 md:grid-cols-2">
        {elements.map((element) => (
          <article key={element.id} className="rounded border bg-white p-4">
            <h2 className="text-lg font-medium">{element.label}</h2>
            <p className="mt-1 text-sm text-slate-600">Season: {element.season}</p>
            <p className="text-sm text-slate-600">Organs: {element.organs}</p>
            <p className="mt-2 text-sm">{element.summary}</p>
            <p className="mt-1 text-xs text-slate-500">Generation: {element.generates} · Control: {element.controls}</p>
          </article>
        ))}
      </div>

      <div className="rounded border bg-slate-50 p-3 text-sm">
        <p>Continue exploration in the structured content libraries:</p>
        <div className="mt-2 flex gap-3">
          <Link href={herbsHref} className="text-brand underline">
            Herb Directory
          </Link>
          <Link href={conditionsHref} className="text-brand underline">
            Condition Library
          </Link>
        </div>
      </div>
      <NewsletterSignup storeSlug={store?.slug || requestedStoreSlug} variant="inline" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
