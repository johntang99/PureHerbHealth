"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type WishlistProduct = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  short_description: string | null;
  short_description_zh: string | null;
  price_cents: number;
  images: string[] | null;
};

type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  product: WishlistProduct | null;
};

export default function WishlistPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isZh = locale === "zh";

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    const res = await fetch("/api/account/wishlist", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = `/${locale}/login?next=${encodeURIComponent(`/${locale}/account/wishlist`)}`;
        return;
      }
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: WishlistItem[] };
    const normalised = data.items.map((item) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] ?? null : item.product,
    }));
    setItems(normalised);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  async function removeItem(productId: string) {
    if (removing) return;
    setRemoving(productId);
    await fetch(`/api/account/wishlist/${productId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    setRemoving(null);
  }

  async function addToCart(product: WishlistProduct) {
    if (addingToCart) return;
    setAddingToCart(product.id);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    });
    setAddingToCart(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
          {isZh ? "账户" : "Account"}
        </p>
        <h1
          className="text-2xl font-bold text-[var(--neutral-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {isZh ? "收藏夹" : "Wishlist"}
        </h1>
        {!loading && (
          <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
            {items.length > 0
              ? isZh
                ? `${items.length} 件已收藏商品`
                : `${items.length} saved item${items.length === 1 ? "" : "s"}`
              : isZh
                ? "收藏夹为空"
                : "Your wishlist is empty"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-100)]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white px-6 py-12 text-center">
          <p className="text-3xl">🌿</p>
          <p className="mt-2 font-semibold text-[var(--neutral-700)]">
            {isZh ? "收藏夹还是空的" : "Nothing saved yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--neutral-500)]">
            {isZh
              ? "在商品页面点击心形图标收藏喜欢的商品。"
              : "Tap the heart icon on any product to save it here."}
          </p>
          <Link
            href={`/${locale}/shop`}
            className="mt-4 inline-block rounded-lg bg-[var(--color-brand-500)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] transition-colors"
          >
            {isZh ? "去选购 →" : "Browse the shop →"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            const imgUrl = product.images?.[0] ?? null;
            const isRemoving = removing === product.id;
            const isAddingCart = addingToCart === product.id;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white transition-shadow hover:shadow-md"
              >
                {/* Remove button */}
                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={() => void removeItem(product.id)}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[var(--neutral-400)] shadow-sm hover:bg-white hover:text-red-500 transition-colors disabled:opacity-40"
                  title={isZh ? "取消收藏" : "Remove from wishlist"}
                >
                  {isRemoving ? (
                    <span className="text-xs">…</span>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </button>

                {/* Product image */}
                <Link href={`/${locale}/shop/${product.slug}`}>
                  <div className="aspect-square overflow-hidden bg-[var(--neutral-100)]">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl">
                        🌿
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product info */}
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/${locale}/shop/${product.slug}`}>
                    <p className="font-semibold text-[var(--neutral-900)] hover:text-[var(--color-brand-600)] transition-colors">
                      {isZh && product.name_zh ? product.name_zh : product.name}
                    </p>
                    {isZh && product.name_zh && (
                      <p className="text-xs text-[var(--neutral-500)]">
                        {product.name}
                      </p>
                    )}
                  </Link>
                  {(isZh ? product.short_description_zh : product.short_description) && (
                    <p className="mt-1 text-xs text-[var(--neutral-500)] line-clamp-2">
                      {isZh
                        ? product.short_description_zh
                        : product.short_description}
                    </p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <p className="font-bold text-[var(--neutral-900)]">
                      ${(product.price_cents / 100).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      disabled={isAddingCart}
                      onClick={() => void addToCart(product)}
                      className="rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-600)] transition-colors disabled:opacity-60"
                    >
                      {isAddingCart
                        ? isZh
                          ? "加入中..."
                          : "Adding..."
                        : isZh
                          ? "加入购物车"
                          : "Add to cart"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
