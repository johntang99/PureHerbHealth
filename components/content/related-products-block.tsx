import { ProductGrid } from "@/components/product/product-grid";
import { listProducts } from "@/lib/catalog/service";
import type { Locale } from "@/lib/i18n/config";

export async function RelatedProductsBlock({ categorySlug, locale }: { categorySlug: string; locale: Locale }) {
  const response = await listProducts({ locale, page: 1, perPage: 4, category: categorySlug, storeSlug: process.env.NEXT_PUBLIC_STORE_SLUG ?? "pureherbhealth" });
  if (!response.products.length) return null;

  return (
    <div className="my-5 space-y-2 rounded border bg-slate-50 p-3">
      <h3 className="text-sm font-semibold">Shop Related Products</h3>
      <ProductGrid products={response.products} locale={locale} categorySlug={categorySlug} />
    </div>
  );
}
