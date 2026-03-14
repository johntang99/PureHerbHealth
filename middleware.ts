import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, localeCookieName } from "@/lib/i18n/config";
import { resolveStoreSlug } from "@/lib/store/slug";
import { resolveStoreSlugFromHost } from "@/lib/store/domain-map";

function hasStaticExtension(pathname: string) {
  return pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|map|webp)$/) !== null;
}

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;
  const accept = request.headers.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("zh")) return "zh";
  return defaultLocale;
}

async function getSessionRole(request: NextRequest): Promise<"admin" | "other" | "none"> {
  const meResponse = await fetch(`${request.nextUrl.origin}/api/account/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });
  if (meResponse.status === 401) return "none";
  if (!meResponse.ok) return "other";
  const mePayload = (await meResponse.json()) as { profile?: { role?: string } };
  const role = mePayload.profile?.role;
  const isAdminRole = role === "platform_admin" || role === "platform_super_admin";
  return isAdminRole ? "admin" : "other";
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (
    pathname.startsWith("/_next") ||
    (pathname.startsWith("/api") && !isAdminApi) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    hasStaticExtension(pathname)
  ) {
    return NextResponse.next();
  }

  // Admin login page is public — no auth check needed
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const seg = pathname.split("/")[1];
  const pathnameHasLocale = isLocale(seg);

  if (!pathnameHasLocale && !isAdminPage && !isAdminApi) {
    const locale = getPreferredLocale(request);
    const url = new URL(`/${locale}${pathname}${search}`, request.url);
    return NextResponse.redirect(url);
  }

  return (async () => {
    if (isAdminApi) {
      // Allow server-to-server calls from trusted internal callers (e.g. chinese-medicine admin)
      const internalSecret = process.env.INTERNAL_API_SECRET;
      const requestSecret = request.headers.get("x-internal-secret");
      const isInternalCall = internalSecret && requestSecret === internalSecret;

      if (!isInternalCall) {
        const role = await getSessionRole(request);
        if (role === "none") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (role !== "admin") {
          return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
        }
      }
    }

    const locale = pathnameHasLocale ? seg : defaultLocale;

    // Resolve store slug (priority order):
    //   1. x-store-slug header (set by clinic-site middleware when using same-app rewrites)
    //   2. store_slug URL query param (used by proxied checkout/cart pages: ?store_slug=tcm-network-herbs)
    //   3. x-forwarded-host → domain map (when clinic site proxies via Next.js rewrites)
    //   4. host → domain map (direct access to pureherbhealth)
    //   5. env var / dev fallback
    const urlStoreSlug = request.nextUrl.searchParams.get("store_slug") || undefined;
    const storeSlug =
      request.headers.get("x-store-slug") ||
      urlStoreSlug ||
      resolveStoreSlugFromHost(request.headers.get("x-forwarded-host") || request.headers.get("host")) ||
      resolveStoreSlug();

    // Set on REQUEST headers so Server Components can read them via headers()
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);
    requestHeaders.set("x-store-slug", storeSlug);
    requestHeaders.set("x-store-id", "default-store");

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Also mirror on response headers for client-side access if needed
    response.headers.set("x-store-slug", storeSlug);
    return response;
  })();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
