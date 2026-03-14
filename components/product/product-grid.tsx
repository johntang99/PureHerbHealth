import type { ProductCardDto } from "@/lib/catalog/types";
import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  locale,
  categorySlug,
  storeSlug,
  desktopCols = 4,
}: {
  products: ProductCardDto[];
  locale: string;
  categorySlug?: string;
  storeSlug?: string;
  desktopCols?: 3 | 4;
}) {
  if (products.length === 0) {
    return <p className="rounded-[12px] border border-dashed border-[var(--neutral-300)] bg-white p-6 text-sm text-[var(--neutral-500)]">No products found.</p>;
  }

  const desktopClass = desktopCols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-5 md:grid-cols-3 ${desktopClass}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} categorySlug={categorySlug} storeSlug={storeSlug} />
      ))}
    </div>
  );
}
