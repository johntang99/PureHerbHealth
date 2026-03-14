"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart/context";
import { ProductGrid } from "@/components/product/product-grid";
import type { ProductCardDto } from "@/lib/catalog/types";
import { resolveStoreSlug } from "@/lib/store/slug";

type SuggestedProduct = ProductCardDto;
type RecommendationPayload = {
  you_might_also_like?: SuggestedProduct[];
};

function CartPageClient() {
  const cart = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [suggested, setSuggested] = useState<SuggestedProduct[]>([]);
  const [promoCode, setPromoCode] = useState("DRHUANG10");
  const [promoApplied, setPromoApplied] = useState(true);
  const localePrefix = useMemo(() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return first ? `/${first}` : "/en";
  }, [pathname]);
  const locale = localePrefix.replace("/", "") || "en";
  const storeSlug = resolveStoreSlug(searchParams.get("store_slug"));

  useEffect(() => {
    let cancelled = false;
    async function loadSuggested() {
      const excludeIds = cart.items.map((item) => item.product_id).join(",");
      const params = new URLSearchParams({
        store_slug: storeSlug,
        locale: locale === "zh" ? "zh" : "en",
        per_section: "6",
        exclude_ids: excludeIds,
      });
      const response = await fetch(`/api/recommendations/cart?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as RecommendationPayload;
      if (!cancelled) setSuggested(payload.you_might_also_like || []);
    }
    void loadSuggested();
    return () => {
      cancelled = true;
    };
  }, [cart.items, locale, storeSlug]);

  const subtotal = cart.subtotal;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal >= 75 || cart.item_count === 0 ? 0 : 6.99;
  const estimatedTax = useMemo(() => (subtotal - discount) * 0.08, [subtotal, discount]);
  const estimatedTotal = useMemo(() => subtotal - discount + shipping + estimatedTax, [subtotal, discount, shipping, estimatedTax]);

  return (
    <section className="space-y-5 lg:space-y-6">
      <nav className="flex items-center gap-2 text-xs text-[var(--neutral-400)]">
        <Link href={`${localePrefix}`} className="hover:text-[var(--color-brand-600)]">
          Home
        </Link>
        <span>›</span>
        <span>Cart</span>
      </nav>

      <h1 className="text-4xl leading-[1.2] text-[var(--neutral-900)]" style={{ fontFamily: "var(--font-heading)" }}>
        Your Cart ({cart.item_count} item{cart.item_count === 1 ? "" : "s"})
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 lg:space-y-6">
          <div className="overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white">
            <div className="grid grid-cols-[1.7fr_0.8fr_0.7fr_0.7fr_40px] border-b border-[var(--neutral-200)] px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--neutral-400)]">
              <p>Product</p>
              <p className="text-center">Unit Price</p>
              <p className="text-center">Quantity</p>
              <p className="text-center">Total</p>
              <span />
            </div>

            {cart.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1.7fr_0.8fr_0.7fr_0.7fr_40px] items-center border-b border-[var(--neutral-100)] px-4 py-4 last:border-b-0">
                <Link
                  href={`${localePrefix}/shop/search?q=${encodeURIComponent(item.product.slug)}`}
                  className="flex items-start gap-3"
                >
                  <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md bg-[var(--neutral-100)]">
                    {item.product.image_url ? <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" /> : null}
                  </span>
                  <span className="block">
                    <span className="block text-sm font-semibold text-[var(--neutral-900)]">{item.product.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--neutral-500)]">{item.product.short_description || "TCM formula"}</span>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      In Stock
                    </span>
                  </span>
                </Link>
                <p className="text-center text-[15px] font-semibold text-[var(--neutral-800)]">${(item.unit_price_cents / 100).toFixed(2)}</p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center overflow-hidden rounded-md border border-[var(--neutral-200)]">
                    <button type="button" className="h-8 w-8 bg-[var(--neutral-50)] text-sm" onClick={() => void cart.updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      −
                    </button>
                    <span className="w-10 border-x border-[var(--neutral-200)] text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" className="h-8 w-8 bg-[var(--neutral-50)] text-sm" onClick={() => void cart.updateQuantity(item.id, Math.min(99, item.quantity + 1))}>
                      +
                    </button>
                  </div>
                </div>
                <p className="text-center text-[16px] font-bold text-[var(--neutral-800)]">${(item.total_price_cents / 100).toFixed(2)}</p>
                <button type="button" className="text-center text-xl text-[var(--neutral-300)] hover:text-red-500" onClick={() => void cart.removeItem(item.id)}>
                  ×
                </button>
              </div>
            ))}

            <div className="border-t border-[var(--neutral-200)] px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  className="h-10 flex-1 rounded-md border border-[var(--neutral-200)] px-3 text-sm"
                  placeholder="Promo code"
                />
                <button
                  type="button"
                  onClick={() => setPromoApplied((prev) => !prev)}
                  className={`h-10 rounded-md border px-4 text-sm font-semibold ${promoApplied ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-[var(--neutral-300)] text-[var(--neutral-700)]"}`}
                >
                  {promoApplied ? "Applied ✓" : "Apply"}
                </button>
              </div>
              {promoApplied ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  {promoCode || "DRHUANG10"} — 10% off applied. Saving ${discount.toFixed(2)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--neutral-200)] bg-white p-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-xl">🔒</p>
              <p className="mt-1 text-xs font-semibold text-[var(--neutral-600)]">SSL Secure</p>
            </div>
            <div className="text-center">
              <p className="text-xl">🏭</p>
              <p className="mt-1 text-xs font-semibold text-[var(--neutral-600)]">GMP Certified</p>
            </div>
            <div className="text-center">
              <p className="text-xl">↩️</p>
              <p className="mt-1 text-xs font-semibold text-[var(--neutral-600)]">30-Day Returns</p>
            </div>
            <div className="text-center">
              <p className="text-xl">📦</p>
              <p className="mt-1 text-xs font-semibold text-[var(--neutral-600)]">Free Ship over $75</p>
            </div>
          </div>

          {suggested.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-2xl leading-[1.2] text-[var(--neutral-800)]" style={{ fontFamily: "var(--font-heading)" }}>
                You might also like
              </h2>
              <ProductGrid products={suggested} locale={localePrefix.replace("/", "")} desktopCols={3} />
            </div>
          ) : null}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5 shadow-md">
            <h3 className="mb-3 text-lg font-semibold text-[var(--neutral-800)]">Order Summary</h3>
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Subtotal</span>
                <span className="font-medium text-[var(--neutral-800)]">${subtotal.toFixed(2)}</span>
              </div>
              {promoApplied ? (
                <div className="flex items-center justify-between">
                  <span className="font-normal text-emerald-600">Promo (10%)</span>
                  <span className="font-semibold text-emerald-600">-${discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Shipping</span>
                <span className={`${shipping === 0 ? "font-semibold text-emerald-600" : "font-medium"}`}>{shipping === 0 ? "FREE ✓" : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Est. Tax (NY)</span>
                <span className="font-medium">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="mt-2 border-t border-[var(--neutral-200)] pt-3">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-[var(--neutral-400)]">or 4 x ${(estimatedTotal / 4).toFixed(2)} with Afterpay</p>
            <Link
              href={`${localePrefix}/checkout`}
              className={`mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg px-4 text-[15px] font-semibold ${
                cart.item_count > 0 ? "bg-[#FFD814] text-[#111111] hover:bg-[#f7ca00]" : "cursor-not-allowed bg-[var(--neutral-200)] text-[var(--neutral-500)]"
              }`}
              aria-disabled={cart.item_count === 0}
              onClick={(event) => {
                if (cart.item_count === 0) event.preventDefault();
              }}
            >
              Proceed to Checkout →
            </Link>
            <Link
              href={`${localePrefix}/shop`}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--neutral-300)] px-4 text-sm font-medium text-[var(--neutral-700)]"
            >
              ← Continue Shopping
            </Link>
            <p className="mt-3 border-t border-[var(--neutral-200)] pt-3 text-[11px] leading-4 text-[var(--neutral-400)]">
              These statements have not been evaluated by the FDA. Not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function CartPage() {
  return <CartPageClient />;
}
