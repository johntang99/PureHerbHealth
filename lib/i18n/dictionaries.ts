import "server-only";

import type { Locale } from "./config";

type Dictionary = Record<string, string>;

async function loadNamespace(locale: Locale, namespace: string): Promise<Dictionary> {
  const mod = await import(`@/dictionaries/${locale}/${namespace}.json`);
  return mod.default as Dictionary;
}

export async function getDictionaries(locale: Locale) {
  const namespaces = ["common", "shop", "product", "cart", "account", "ai", "content", "legal"];
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const),
  );

  return Object.fromEntries(entries) as Record<string, Dictionary>;
}
