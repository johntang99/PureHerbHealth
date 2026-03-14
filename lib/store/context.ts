import { headers } from "next/headers";
import { resolveStoreSlug } from "@/lib/store/slug";

export type StoreContext = {
  storeId: string;
  storeSlug: string;
  locale: string;
};

export function getStoreContextFromHeaders(): StoreContext {
  const h = headers();
  return {
    storeId: h.get("x-store-id") ?? "default-store",
    storeSlug: resolveStoreSlug(h.get("x-store-slug")),
    locale: h.get("x-locale") ?? "en",
  };
}
