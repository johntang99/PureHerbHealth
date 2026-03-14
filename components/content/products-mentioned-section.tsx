import { ProductGrid } from "@/components/product/product-grid";
import type { Locale } from "@/lib/i18n/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ProductsMentionedSection({
  productSlugs,
  locale,
}: {
  productSlugs: string[];
  locale: Locale;
}) {
  if (!productSlugs.length) return null;
  const admin = getSupabaseAdminClient();
  const uniqueSlugs = Array.from(new Set(productSlugs));
  const { data } = await admin
    .from("products")
    .select("id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,category_id,categories:category_id(slug,name,name_zh)")
    .in("slug", uniqueSlugs)
    .eq("enabled", true)
    .limit(8);
  if (!data?.length) return null;

  const products = data.map((item) => {
    const category = Array.isArray(item.categories) ? item.categories[0] : item.categories;
    return {
      id: item.id,
      slug: item.slug,
      name: locale === "zh" && item.name_zh ? item.name_zh : item.name,
      short_description: locale === "zh" && item.short_description_zh ? item.short_description_zh : item.short_description || "",
      price: Number((item.price_cents / 100).toFixed(2)),
      sale_price: null,
      primary_image: { url: item.images?.[0]?.url || "", alt: item.images?.[0]?.alt || "" },
      category: {
        slug: category?.slug || "uncategorized",
        name: locale === "zh" && category?.name_zh ? category.name_zh : category?.name || "Uncategorized",
      },
      rating_avg: 4.8,
      rating_count: 0,
      stock_status: "in_stock" as const,
      badges: [],
      tcm_elements: [],
    };
  });

  return (
    <section className="space-y-2 rounded border bg-slate-50 p-3">
      <h3 className="text-sm font-semibold">{locale === "zh" ? "文中提到的产品" : "Products Mentioned"}</h3>
      <ProductGrid products={products} locale={locale} />
    </section>
  );
}
