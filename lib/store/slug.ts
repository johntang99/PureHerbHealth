const DEV_FALLBACK_STORE_SLUG = "pureherbhealth";

function clean(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function resolveStoreSlug(input?: string | null): string {
  const explicit = clean(input);
  if (explicit) return explicit;

  const fromEnv = clean(process.env.NEXT_PUBLIC_STORE_SLUG) ?? clean(process.env.STORE_SLUG);
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_STORE_SLUG;
  }

  throw new Error("Store slug is required in production. Set NEXT_PUBLIC_STORE_SLUG (and optionally STORE_SLUG).");
}
