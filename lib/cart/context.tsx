"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveStoreSlug } from "@/lib/store/slug";

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  product: {
    id: string;
    slug: string;
    name: string;
    image_url: string;
    short_description?: string | null;
    short_description_zh?: string | null;
  };
};

type CartState = {
  id: string | null;
  items: CartItem[];
  subtotal: number;
  item_count: number;
};

type CartContextValue = CartState & {
  isLoading: boolean;
  isOpen: boolean;
  storeSlug: string;
  openCart: () => void;
  closeCart: () => void;
  refresh: () => Promise<void>;
  addItem: (payload: { product_id: string; quantity?: number; store_slug?: string }) => Promise<void>;
  updateQuantity: (item_id: string, quantity: number) => Promise<void>;
  removeItem: (item_id: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children, storeSlug: storeSlugProp }: { children: React.ReactNode; storeSlug?: string }) {
  const STORE_SLUG = storeSlugProp || resolveStoreSlug();
  const [state, setState] = useState<CartState>({ id: null, items: [], subtotal: 0, item_count: 0 });
  const [isLoading, setLoading] = useState(true);
  const [isOpen, setOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const res = await fetch(`/api/cart?store_slug=${STORE_SLUG}`, { cache: "no-store" });
    const json = await res.json();
    setState({
      id: json.id ?? null,
      items: json.items ?? [],
      subtotal: json.subtotal ?? 0,
      item_count: json.item_count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      isLoading,
      isOpen,
      storeSlug: STORE_SLUG,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      refresh,
      addItem: async ({ product_id, quantity = 1, store_slug = STORE_SLUG }) => {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id, quantity, store_slug: store_slug || STORE_SLUG }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error("[cart] POST /api/cart failed", res.status, errText);
          throw new Error(`Add to cart failed: ${res.status} ${errText}`);
        }
        // Update state directly from POST response — avoids a race where router.push()
        // navigates before a separate refresh() GET has committed to React state.
        const json = await res.json();
        setState({
          id: json.id ?? null,
          items: json.items ?? [],
          subtotal: json.subtotal ?? 0,
          item_count: json.item_count ?? 0,
        });
        setOpen(true);
      },
      updateQuantity: async (item_id, quantity) => {
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_id, quantity }),
        });
        await refresh();
      },
      removeItem: async (item_id) => {
        await fetch(`/api/cart/${item_id}`, { method: "DELETE" });
        await refresh();
      },
    }),
    [state, isLoading, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
