"use client";

import { useEffect } from "react";

export function useRecentlyViewed(productId: string, storeSlug: string) {
  useEffect(() => {
    if (!productId) return;
    const key = `${storeSlug}_recently_viewed`;
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      } catch {
        return [] as string[];
      }
    })();
    const next = [productId, ...existing.filter((id) => id !== productId)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(next));
  }, [productId, storeSlug]);
}
