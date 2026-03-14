"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/context";

export function CartDrawer() {
  const cart = useCart();
  const pathname = usePathname();

  useEffect(() => {
    // Avoid overlaying the dedicated cart page.
    if (pathname.includes("/cart") && cart.isOpen) {
      cart.closeCart();
    }
  }, [pathname, cart]);

  if (!cart.isOpen) return null;

  return (
    <aside className="fixed right-0 top-0 z-50 h-full w-[360px] border-l border-[var(--neutral-200)] bg-white p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Cart ({cart.item_count})</h3>
        <button onClick={cart.closeCart} className="text-sm">
          Close
        </button>
      </div>
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="rounded border p-3">
            <p className="text-sm font-semibold">{item.product.name}</p>
            <p className="text-xs text-neutral-600">Qty: {item.quantity}</p>
            <p className="text-sm">${(item.total_price_cents / 100).toFixed(2)}</p>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => cart.updateQuantity(item.id, Math.max(1, item.quantity - 1))}
              >
                -
              </button>
              <button className="rounded border px-2 py-1 text-xs" onClick={() => cart.updateQuantity(item.id, Math.min(99, item.quantity + 1))}>
                +
              </button>
              <button className="rounded border px-2 py-1 text-xs" onClick={() => cart.removeItem(item.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-semibold">Subtotal: ${cart.subtotal.toFixed(2)}</p>
        <a href="/en/checkout" className="mt-2 inline-block rounded bg-brand px-4 py-2 text-sm text-white">
          Checkout
        </a>
          <a href="/en/cart/added" className="ml-2 mt-2 inline-block rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Recommendations
          </a>
      </div>
    </aside>
  );
}
