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
  based_on_added?: SuggestedProduct[];
  also_bought?: SuggestedProduct[];
  you_might_also_like?: SuggestedProduct[];
};

export default function CartAddedPage() {
  const cart = useCart();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [basedOnAdded, setBasedOnAdded] = useState<SuggestedProduct[]>([]);
  const [alsoBought, setAlsoBought] = useState<SuggestedProduct[]>([]);
  const localePrefix = useMemo(() => {
    const first = pathname.split("/").filter(Boolean)[0];
    return first ? `/${first}` : "/en";
  }, [pathname]);
  const locale = localePrefix.replace("/", "") || "en";
  const storeSlug = resolveStoreSlug(searchParams.get("store_slug"));
  const addedProductId = searchParams.get("added_product_id");

  // Refresh cart on mount to ensure we always have the latest data after navigation
  useEffect(() => {
    void cart.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRecommendations() {
      const excludeIds = cart.items.map((item) => item.product_id).join(",");
      const params = new URLSearchParams({
        store_slug: storeSlug,
        locale: locale === "zh" ? "zh" : "en",
        per_section: "6",
        exclude_ids: excludeIds,
      });
      if (addedProductId) params.set("anchor_product_id", addedProductId);
      const response = await fetch(`/api/recommendations/cart?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as RecommendationPayload;
      if (!cancelled) {
        setBasedOnAdded(payload.based_on_added || []);
        setAlsoBought(payload.also_bought || []);
      }
    }
    void loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [addedProductId, cart.items, locale, storeSlug]);

  const latestAdded = useMemo(() => {
    if (!addedProductId) return cart.items[0] || null;
    return cart.items.find((item) => item.product_id === addedProductId) || cart.items[0] || null;
  }, [addedProductId, cart.items]);
  const estimatedTax = useMemo(() => cart.subtotal * 0.08, [cart.subtotal]);
  const estimatedTotal = useMemo(() => cart.subtotal + estimatedTax, [cart.subtotal, estimatedTax]);

  return (
    <section className="space-y-3 lg:space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_336px] 2xl:grid-cols-[minmax(0,1fr)_352px] 2xl:gap-5">
        <div className="space-y-3 lg:space-y-4">
          {latestAdded ? (
            <div className="rounded border border-[var(--neutral-200)] bg-white px-3 py-3 lg:px-4 lg:py-3.5">
              <div className="grid gap-3 sm:grid-cols-[92px_1fr] sm:items-center lg:grid-cols-[96px_1fr] xl:grid-cols-[102px_1fr]">
                <Link
                  href={`${localePrefix}/shop/search?q=${encodeURIComponent(latestAdded.product.slug)}`}
                  className="relative h-[92px] w-[92px] overflow-hidden rounded border border-[var(--neutral-200)] bg-[var(--neutral-100)] lg:h-[96px] lg:w-[96px] xl:h-[102px] xl:w-[102px]"
                >
                  {latestAdded.product.image_url ? <Image src={latestAdded.product.image_url} alt={latestAdded.product.name} fill className="object-cover" /> : null}
                </Link>
                <div>
                  <p className="text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--neutral-900)] lg:text-[24px] xl:text-[26px]">Added to cart</p>
                  <p className="mt-1 text-[20px] font-semibold leading-[1.2] text-[var(--neutral-900)] lg:text-[22px] xl:text-[23px]">{latestAdded.product.name}</p>
                  <p className="text-[12px] text-[var(--neutral-500)] lg:text-[13px]">Qty: {latestAdded.quantity}</p>
                </div>
              </div>
            </div>
          ) : null}

          {basedOnAdded.length > 0 ? (
            <div className="rounded border border-[var(--neutral-200)] bg-white p-2.5 lg:p-3">
              <div className="mb-3.5 flex items-center justify-between px-0.5">
                <p className="text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--neutral-900)] lg:text-[22px] xl:text-[24px]">Based on what you added</p>
                <p className="text-[11px] text-[var(--neutral-500)] lg:text-[12px]">Page 1 of 1</p>
              </div>
              <ProductGrid products={basedOnAdded} locale={localePrefix.replace("/", "")} desktopCols={3} />
            </div>
          ) : null}

          {alsoBought.length > 0 ? (
            <div className="rounded border border-[var(--neutral-200)] bg-white p-2.5 lg:p-3">
              <div className="mb-3.5 flex items-center justify-between px-0.5">
                <p className="text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--neutral-900)] lg:text-[22px] xl:text-[24px]">
                  Customers who bought this also bought
                </p>
                <p className="text-[11px] text-[var(--neutral-500)] lg:text-[12px]">Page 1 of 1</p>
              </div>
              <ProductGrid products={alsoBought} locale={localePrefix.replace("/", "")} desktopCols={3} />
            </div>
          ) : null}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5 shadow-md">
            <h3 className="mb-3 text-lg font-semibold text-[var(--neutral-800)]">Order Summary</h3>
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Subtotal</span>
                <span className="font-medium text-[var(--neutral-800)]">${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Shipping</span>
                <span className={`${cart.subtotal >= 75 ? "font-semibold text-emerald-600" : "font-medium text-[var(--neutral-800)]"}`}>
                  {cart.subtotal >= 75 ? "FREE ✓" : "$6.99"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-normal text-[var(--neutral-500)]">Est. Tax (NY)</span>
                <span className="font-medium text-[var(--neutral-800)]">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="mt-2 border-t border-[var(--neutral-200)] pt-3">
                <div className="flex items-center justify-between text-lg font-bold text-[var(--neutral-900)]">
                  <span>Total</span>
                  <span>${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
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
              Proceed to checkout ({cart.item_count} items)
            </Link>
            <Link
              href={`${localePrefix}/cart`}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--neutral-300)] px-4 text-sm font-medium text-[var(--neutral-700)]"
            >
              Go to Cart
            </Link>

            <div className="mt-4 border-t border-[var(--neutral-200)] pt-3">
              <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--neutral-500)]">Items in your cart</h4>
              {cart.items.length > 0 ? (
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 border-b border-[var(--neutral-100)] pb-3 last:border-b-0 last:pb-0">
                      <Link
                        href={`${localePrefix}/shop/search?q=${encodeURIComponent(item.product.slug)}`}
                        className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-md bg-[var(--neutral-100)]"
                      >
                        {item.product.image_url ? <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" /> : null}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--neutral-900)]">{item.product.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--neutral-500)]">Qty: {item.quantity}</p>
                        <p className="text-[15px] font-semibold text-[var(--neutral-800)]">${(item.total_price_cents / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--neutral-500)]">Your cart is empty.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
