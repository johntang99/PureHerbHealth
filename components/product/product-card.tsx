import Link from "next/link";
import Image from "next/image";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { ProductCardDto } from "@/lib/catalog/types";

export function ProductCard({
  product,
  locale,
  categorySlug,
  storeSlug,
}: {
  product: ProductCardDto;
  locale: string;
  categorySlug?: string;
  storeSlug?: string;
}) {
  const baseHref = `/${locale}/shop/${categorySlug ?? product.category.slug}/${product.slug}`;
  const href = storeSlug ? `${baseHref}?store_slug=${encodeURIComponent(storeSlug)}` : baseHref;
  const addToCartHref = storeSlug ? `/${locale}/cart/added?store_slug=${encodeURIComponent(storeSlug)}` : `/${locale}/cart/added`;
  const isLowStock = product.stock_status === "low_stock";
  const isOut = product.stock_status === "out_of_stock";
  const primaryBadge = product.sale_price ? "SALE" : "Best Seller";
  const showPractitioner = product.practitioner_recommended ?? product.rating_avg >= 4.8;

  return (
    <article className="group relative overflow-hidden rounded-[12px] border border-[var(--neutral-200)] bg-white transition-all duration-200 hover:-translate-y-[3px] hover:border-[var(--color-brand-200)] hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden bg-[var(--color-brand-100)]">
          <Image
            src={product.primary_image.url}
            alt={product.primary_image.alt}
            width={600}
            height={600}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
            <span className="inline-flex items-center rounded-full bg-[var(--color-accent-500)] px-2 py-[3px] text-[11px] font-semibold text-white">
              {primaryBadge}
            </span>
            {showPractitioner ? (
              <span className="inline-flex items-center rounded-full bg-[var(--color-brand-500)] px-2 py-[3px] text-[11px] font-semibold text-white">
                Practitioner Pick
              </span>
            ) : null}
          </div>
          <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white text-base text-[var(--neutral-400)] shadow-sm">
            ♡
          </span>
        </div>
      </Link>
      <div className="p-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--color-brand-500)]">{product.category.name}</p>
        <Link href={href} className="block">
          <h3 className="mb-2 line-clamp-2 text-[15px] font-semibold leading-[1.3] text-[var(--neutral-900)] hover:text-[var(--color-brand-600)]">{product.name}</h3>
        </Link>
        <p className="mb-2 text-[13px] text-[var(--color-accent-500)]">★★★★★ <span className="ml-1 text-[var(--neutral-400)]">({product.rating_count})</span></p>
        <div className="mb-2 flex items-baseline gap-2">
          <p className="text-[20px] font-bold text-[var(--neutral-900)]">${product.price.toFixed(2)}</p>
          {typeof product.sale_price === "number" ? <p className="text-sm text-[var(--neutral-400)] line-through">${product.sale_price.toFixed(2)}</p> : null}
        </div>
        <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--neutral-500)]">
          <span className={`h-[7px] w-[7px] rounded-full ${isOut ? "bg-red-500" : isLowStock ? "bg-yellow-500" : "bg-green-600"}`} />
          <span>{isOut ? "Out of stock" : isLowStock ? "Low stock" : "In stock"}</span>
        </div>
        <AddToCartButton
          productId={product.id}
          label="Add to Cart"
          redirectTo={addToCartHref}
          storeSlug={storeSlug}
          showIcon={false}
          className="rounded-md px-3 py-2 text-sm font-semibold"
        />
      </div>
    </article>
  );
}
