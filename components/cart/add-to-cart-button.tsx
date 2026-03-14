"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart/context";
import { resolveStoreSlug } from "@/lib/store/slug";

const STORE_SLUG = resolveStoreSlug();

export function AddToCartButton({
  productId,
  className,
  label,
  redirectTo,
  showIcon = true,
  storeSlug,
}: {
  productId: string;
  className?: string;
  label?: string;
  redirectTo?: string;
  showIcon?: boolean;
  storeSlug?: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  return (
    <button
      className={`flex w-full items-center justify-center gap-2 rounded-[8px] px-4 py-[14px] text-[15px] font-bold text-white ${hasError ? "bg-red-500 hover:bg-red-600" : "bg-[var(--color-brand-500)] hover:bg-[var(--color-brand-600)]"} ${className || ""}`.trim()}
      disabled={isSubmitting}
      onClick={async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setHasError(false);
        try {
          await cart.addItem({ product_id: productId, quantity: 1, store_slug: storeSlug || STORE_SLUG });
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
      }}
    >
      {showIcon ? <span aria-hidden>🛒</span> : null}
      {isSubmitting ? "Adding…" : hasError ? "Failed – retry" : (label || "Add to Cart")}
    </button>
  );
}
