"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/context";

export function CartHeaderLink({ locale }: { locale: string }) {
  const cart = useCart();

  return (
    <Link
      href={`/${locale}/cart`}
      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-brand-500)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-brand-600)]"
    >
      Cart <span className="rounded-full bg-[var(--color-accent-500)] px-1.5 text-[10px]">{cart.item_count}</span>
    </Link>
  );
}
