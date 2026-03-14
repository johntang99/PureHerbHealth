import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ProviderSearchItem {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  alt: string;
  author?: string;
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = String(searchParams.get("provider") ?? "").toLowerCase();
  const query = String(searchParams.get("query") ?? "").trim();
  const page = parsePositiveInt(searchParams.get("page"), 1, 100);
  const perPage = parsePositiveInt(searchParams.get("perPage"), 24, 30);

  if (!["unsplash", "pexels"].includes(provider)) {
    return NextResponse.json({ message: "Invalid provider" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ items: [], page, totalPages: 0 });
  }

  try {
    if (provider === "unsplash") {
      const key = process.env.UNSPLASH_ACCESS_KEY ?? "";
      if (!key) return NextResponse.json({ message: "UNSPLASH_ACCESS_KEY is not configured" }, { status: 400 });

      const url = new URL("https://api.unsplash.com/search/photos");
      url.searchParams.set("query", query);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(perPage));

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ message: `Unsplash search failed (${res.status})`, detail: text.slice(0, 300) }, { status: 502 });
      }
      const payload = (await res.json()) as {
        results?: Array<{
          id: string;
          alt_description?: string | null;
          urls?: { small?: string; regular?: string; full?: string };
          user?: { name?: string };
        }>;
        total_pages?: number;
      };
      const items: ProviderSearchItem[] = (payload.results ?? [])
        .filter((e) => e.urls?.small && (e.urls?.regular || e.urls?.full))
        .map((e) => ({
          id: e.id,
          previewUrl: e.urls!.small!,
          sourceUrl: e.urls!.regular ?? e.urls!.full ?? e.urls!.small!,
          alt: e.alt_description ?? "Unsplash image",
          author: e.user?.name ?? undefined,
        }));
      return NextResponse.json({ items, page, totalPages: Math.max(0, Number(payload.total_pages ?? 0)) });
    }

    // Pexels
    const key = process.env.PEXELS_API_KEY ?? "";
    if (!key) return NextResponse.json({ message: "PEXELS_API_KEY is not configured" }, { status: 400 });

    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    const res = await fetch(url.toString(), { headers: { Authorization: key } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ message: `Pexels search failed (${res.status})`, detail: text.slice(0, 300) }, { status: 502 });
    }
    const payload = (await res.json()) as {
      photos?: Array<{
        id: number;
        alt?: string;
        photographer?: string;
        src?: { medium?: string; large2x?: string; original?: string };
      }>;
      page?: number;
      per_page?: number;
      total_results?: number;
    };
    const items: ProviderSearchItem[] = (payload.photos ?? [])
      .filter((e) => e.src?.medium && (e.src?.large2x || e.src?.original))
      .map((e) => ({
        id: String(e.id),
        previewUrl: e.src!.medium!,
        sourceUrl: e.src!.large2x ?? e.src!.original ?? e.src!.medium!,
        alt: e.alt ?? "Pexels image",
        author: e.photographer ?? undefined,
      }));
    const totalPages = payload.per_page
      ? Math.ceil(Number(payload.total_results ?? 0) / Number(payload.per_page))
      : 0;
    return NextResponse.json({ items, page: Number(payload.page ?? page), totalPages });
  } catch (error) {
    console.error("Provider search error:", error);
    return NextResponse.json({ message: "Provider search failed" }, { status: 500 });
  }
}
