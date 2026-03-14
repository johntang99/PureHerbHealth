/**
 * Maps incoming hostnames → store slugs.
 *
 * Priority order in middleware:
 *   1. x-store-slug request header  (set by clinic site proxy)
 *   2. This domain map              (domain-based multi-tenant routing)
 *   3. NEXT_PUBLIC_STORE_SLUG env   (single-store deployment)
 *   4. "pureherbhealth"             (dev fallback)
 *
 * ─── Adding a new clinic store ────────────────────────────────────────────
 * Local dev:  add the local domain below  +  add to /etc/hosts (see README)
 * Production: add the real domain below   +  set DNS A record to your server
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Runtime override via STORE_DOMAIN_MAP env var (JSON). Same format as chinese-medicine. */
function parseEnvMap(): Record<string, string> {
  try {
    const raw = process.env.STORE_DOMAIN_MAP;
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch { return {}; }
}
const ENV_MAP = parseEnvMap();

const DOMAIN_STORE_MAP: Record<string, string> = {
  // ── Local dev domains ────────────────────────────────────────────────────
  "localhost":               "pureherbhealth",    // main store (port 3005)
  "pureherbhealth.local":    "pureherbhealth",

  "drhuangclinic.local":     "dr-huang-clinic",
  "tcm-network.local":       "tcm-network-herbs",

  // ── Production domains ───────────────────────────────────────────────────
  "pureherbhealth.com":      "pureherbhealth",
  "www.pureherbhealth.com":  "pureherbhealth",

  "drhuangclinic.com":       "dr-huang-clinic",
  "www.drhuangclinic.com":   "dr-huang-clinic",

  // Add new clinic stores here:
  // "acupunctureflushing.com": "acu-flushing",
};

/**
 * Resolve store slug from the incoming Host header.
 * Strips port number before looking up.
 */
export function resolveStoreSlugFromHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase().trim();
  return ENV_MAP[hostname] ?? DOMAIN_STORE_MAP[hostname];
}
