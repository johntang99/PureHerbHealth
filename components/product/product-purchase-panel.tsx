"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/context";
import { resolveStoreSlug } from "@/lib/store/slug";

const STORE_SLUG = resolveStoreSlug();

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  is_default: boolean;
  stock_quantity: number;
};

export function ProductPurchasePanel({
  productId,
  basePrice,
  variants,
  locale,
  redirectTo,
  storeSlug,
}: {
  productId: string;
  basePrice: number;
  variants: ProductVariant[];
  locale: string;
  redirectTo?: string;
  storeSlug?: string;
}) {
  const hasRealVariants = variants.length > 1 || (variants.length === 1 && !variants[0].id.endsWith("-default"));
  const defaultVariant = variants.find((v) => v.is_default) ?? variants[0];
  const [selected, setSelected] = useState<ProductVariant>(defaultVariant ?? { id: `${productId}-default`, name: "Standard", sku: "", price: basePrice, compare_at_price: null, is_default: true, stock_quantity: 100 });
  const [qty, setQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cart = useCart();
  const router = useRouter();

  const displayPrice = selected.price;
  const compareAtPrice = selected.compare_at_price;
  const savings = compareAtPrice ? compareAtPrice - displayPrice : null;
  const savingsPct = savings && compareAtPrice ? Math.round((savings / compareAtPrice) * 100) : null;

  async function handleAddToCart() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setHasError(false);
    try {
      await cart.addItem({
        product_id: productId,
        quantity: qty,
        store_slug: storeSlug || STORE_SLUG,
      });
      if (redirectTo) {
        const target = new URL(redirectTo, window.location.origin);
        target.searchParams.set("added_product_id", productId);
        router.push(`${target.pathname}${target.search}`);
      }
    } catch {
      setHasError(true);
      setTimeout(() => setHasError(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <p className="text-[34px] font-bold text-[var(--neutral-900)]">${displayPrice.toFixed(2)}</p>
        {compareAtPrice && (
          <p className="text-[20px] text-[var(--neutral-400)] line-through">${compareAtPrice.toFixed(2)}</p>
        )}
        {savingsPct && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[12px] font-bold text-red-600">
            Save {savingsPct}%
          </span>
        )}
      </div>
      {displayPrice > 4 && (
        <p className="text-[13px] text-[var(--neutral-500)]">
          or 4 interest-free payments of ${(displayPrice / 4).toFixed(2)} with Afterpay
        </p>
      )}

      {/* Variant selector — only shown if real variants exist */}
      {hasRealVariants && (
        <div>
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.07em] text-[var(--neutral-600)]">
            {locale === "zh" ? "选择规格" : "Choose Option"}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSelected = selected.id === v.id;
              const perUnit = variants.length > 1 ? detectPerUnit(v.name) : null;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelected(v)}
                  className={[
                    "relative flex flex-col items-center rounded-[10px] border-2 px-4 py-2.5 text-left transition",
                    isSelected
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]"
                      : "border-[var(--neutral-200)] bg-white hover:border-[var(--color-brand-300)]",
                  ].join(" ")}
                >
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-[9px] font-bold text-white">✓</span>
                  )}
                  <span className={`text-[13px] font-semibold ${isSelected ? "text-[var(--color-brand-700)]" : "text-[var(--neutral-800)]"}`}>
                    {v.name}
                  </span>
                  <span className={`text-[13px] font-bold ${isSelected ? "text-[var(--color-brand-600)]" : "text-[var(--neutral-600)]"}`}>
                    ${v.price.toFixed(2)}
                  </span>
                  {v.compare_at_price && (
                    <span className="text-[11px] text-[var(--neutral-400)] line-through">${v.compare_at_price.toFixed(2)}</span>
                  )}
                  {perUnit && (
                    <span className="mt-0.5 rounded-sm bg-[var(--color-brand-100)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-brand-600)]">
                      {perUnit}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock status */}
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--neutral-700)]">
        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
        <span className="text-[var(--success)]">In Stock</span>
        <span className="text-[12px] text-[var(--neutral-400)]">· Ships in 1-2 business days</span>
      </div>

      <div className="h-px bg-[var(--neutral-200)]" />

      {/* Quantity */}
      <div className="flex items-center gap-3">
        <p className="text-[13px] font-semibold text-[var(--neutral-700)]">
          {locale === "zh" ? "数量" : "Quantity"}
        </p>
        <div className="inline-flex items-center overflow-hidden rounded-[8px] border border-[var(--neutral-200)]">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-9 w-9 bg-[var(--neutral-100)] text-[17px] font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]">−</button>
          <span className="flex h-9 w-11 items-center justify-center border-x border-[var(--neutral-200)] text-[15px] font-semibold text-[var(--neutral-900)]">{qty}</span>
          <button type="button" onClick={() => setQty((q) => q + 1)} className="h-9 w-9 bg-[var(--neutral-100)] text-[17px] font-semibold text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]">+</button>
        </div>
        <span className="text-[13px] text-[var(--neutral-400)]">
          {selected.stock_quantity} {locale === "zh" ? "件库存" : "units available"}
        </span>
      </div>

      {/* Buttons */}
      <div className="space-y-[10px]">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAddToCart()}
          className={`flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-[14px] text-[15px] font-bold text-white disabled:opacity-60 ${hasError ? "bg-red-500 hover:bg-red-600" : "bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)]"}`}
        >
          <span aria-hidden>🛒</span>
          {isSubmitting
            ? (locale === "zh" ? "添加中…" : "Adding…")
            : hasError
              ? (locale === "zh" ? "失败 – 重试" : "Failed – retry")
              : `${locale === "zh" ? "加入购物车" : "Add to Cart"} — $${(displayPrice * qty).toFixed(2)}`}
        </button>
        <button type="button" className="w-full rounded-[8px] bg-[var(--neutral-900)] px-4 py-[14px] text-[15px] font-bold text-white hover:bg-[var(--neutral-700)]">
          ⚡ {locale === "zh" ? "立即购买" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}

// Detect per-unit cost hint from variant name like "3-Pack", "6-Pack"
function detectPerUnit(name: string): string | null {
  const match = /(\d+)[\s-]?[Pp]ack/i.exec(name);
  return null; // extend later: return `$X/bottle` if base price is known
  void match;
}
