import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import { getProductDetail } from "@/lib/catalog/service";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export async function EmbeddedProductCard({ productSlug, locale }: { productSlug: string; locale: Locale }) {
  const product = await getProductDetail(productSlug, locale);
  if (!product) return <p className="my-3 text-sm text-slate-500">Product `{productSlug}` not found.</p>;

  return (
    <div className="my-4 rounded border bg-slate-50 p-3">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded border bg-white">
          <Image
            src={product.images[0]?.url || "https://images.unsplash.com/photo-1611071536590-1450f0ea49c9?auto=format&fit=crop&w=600&q=80"}
            alt={product.images[0]?.alt || product.name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/${locale}/shop/${product.category.slug}/${product.slug}`} className="text-sm font-semibold hover:underline">
            {product.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{product.short_description}</p>
          <p className="mt-1 text-sm font-semibold">${product.price.toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-3">
        <AddToCartButton productId={product.id} />
      </div>
    </div>
  );
}
