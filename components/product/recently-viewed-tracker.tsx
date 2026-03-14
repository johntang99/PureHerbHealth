"use client";

import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed";

export function RecentlyViewedTracker({ productId, storeSlug }: { productId: string; storeSlug: string }) {
  useRecentlyViewed(productId, storeSlug);
  return null;
}
