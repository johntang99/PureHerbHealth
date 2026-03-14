import { z } from "zod";
import { getStoreContextFromHeaders } from "@/lib/store/context";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchMediaAssetsByIds, toImageObjects, toVideoObjects } from "@/lib/media/selection";
import { handleApiError, ok } from "@/lib/utils/api";

const contentCreateSchema = z
  .object({
    type: z.string().min(2),
    slug: z.string().min(2),
    title: z.string().min(2),
    title_zh: z.string().optional(),
    body_markdown: z.string().optional(),
    body_markdown_zh: z.string().optional(),
    featured_image_asset_id: z.string().uuid().optional(),
    image_asset_ids: z.array(z.string().uuid()).default([]),
    video_asset_ids: z.array(z.string().uuid()).default([]),
    status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  })
  .strict();

const contentUpdateSchema = z
  .object({
    id: z.string().uuid(),
    type: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),
    title: z.string().min(2).optional(),
    title_zh: z.string().optional(),
    body_markdown: z.string().optional(),
    body_markdown_zh: z.string().optional(),
    featured_image_asset_id: z.string().uuid().optional(),
    image_asset_ids: z.array(z.string().uuid()).default([]),
    video_asset_ids: z.array(z.string().uuid()).default([]),
    status: z.enum(["draft", "review", "published", "archived"]).optional(),
  })
  .strict();

const listSchema = z.object({
  store_slug: z.string().optional(),
  type: z.enum(["article", "blog_post", "herb_profile", "condition_guide", "seasonal_guide", "element_guide"]).optional(),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "popular", "title_asc"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(48).default(12),
});

function stripMarkdown(input: string) {
  return input
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/[#*_>`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromBody(input: string | null | undefined, max = 140) {
  if (!input) return "";
  const plain = stripMarkdown(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trim()}...`;
}

function readingMinutes(input: string | null | undefined) {
  if (!input) return 1;
  const words = stripMarkdown(input).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function normalizeFeaturedImage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = typeof record.url === "string" ? record.url : "";
  if (!url) return null;
  return {
    url,
    alt: typeof record.alt === "string" ? record.alt : "",
  };
}

function toContentListItem(row: {
  id: string;
  slug: string;
  title: string;
  body_markdown: string | null;
  type: string;
  featured_image: unknown;
  tcm_data?: unknown;
  created_at: string;
  published_at?: string | null;
  view_count?: number | null;
  updated_at: string;
}) {
  const tcmData = row.tcm_data && typeof row.tcm_data === "object" ? (row.tcm_data as Record<string, unknown>) : {};
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: excerptFromBody(row.body_markdown),
    type: row.type as "article" | "blog_post" | "herb_profile" | "condition_guide" | "seasonal_guide" | "element_guide",
    featured_image: normalizeFeaturedImage(row.featured_image),
    published_at: row.published_at || row.created_at,
    reading_time_minutes: readingMinutes(row.body_markdown),
    tags: [],
    author: null,
    view_count: row.view_count || 0,
    body_system: typeof tcmData.body_system === "string" ? tcmData.body_system : null,
    updated_at: row.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const parsed = listSchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const page = parsed.page;
    const perPage = parsed.per_page;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let storeId: string | null = null;
    if (parsed.store_slug) {
      const { data: store, error: storeError } = await admin.from("stores").select("id").eq("slug", parsed.store_slug).maybeSingle();
      if (storeError) throw storeError;
      storeId = store?.id ?? null;
    }
    if (!storeId) {
      const { data: fallbackStore, error: fallbackError } = await admin.from("stores").select("id").eq("slug", "pureherbhealth").maybeSingle();
      if (fallbackError) throw fallbackError;
      storeId = fallbackStore?.id ?? null;
    }

    let listQuery = admin
      .from("content")
      .select("id,slug,title,body_markdown,type,featured_image,tcm_data,view_count,published_at,created_at,updated_at", { count: "exact" })
      .eq("status", "published");

    if (storeId) listQuery = listQuery.eq("store_id", storeId);
    if (parsed.type) listQuery = listQuery.eq("type", parsed.type);
    if (parsed.search) listQuery = listQuery.or(`title.ilike.%${parsed.search}%,body_markdown.ilike.%${parsed.search}%`);

    if (parsed.sort === "title_asc") {
      listQuery = listQuery.order("title", { ascending: true });
    } else if (parsed.sort === "popular") {
      listQuery = listQuery.order("view_count", { ascending: false }).order("published_at", { ascending: false });
    } else {
      listQuery = listQuery.order("published_at", { ascending: false });
    }
    listQuery = listQuery.range(from, to);

    const { data: rows, count, error } = await listQuery;
    if (error) throw error;
    const items = (rows || []).map(toContentListItem);

    let featured: ReturnType<typeof toContentListItem> | null = items[0] || null;
    if (!featured) {
      let featuredQuery = admin
        .from("content")
        .select("id,slug,title,body_markdown,type,featured_image,tcm_data,view_count,published_at,created_at,updated_at")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(1);
      if (storeId) featuredQuery = featuredQuery.eq("store_id", storeId);
      const { data: featuredRows, error: featuredError } = await featuredQuery;
      if (featuredError) throw featuredError;
      featured = featuredRows?.[0] ? toContentListItem(featuredRows[0]) : null;
    }

    let popularQuery = admin
      .from("content")
      .select("id,slug,title,body_markdown,type,featured_image,tcm_data,view_count,published_at,created_at,updated_at")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(5);
    if (storeId) popularQuery = popularQuery.eq("store_id", storeId);
    const { data: popularRows, error: popularError } = await popularQuery;
    if (popularError) throw popularError;
    const popular = (popularRows || []).map(toContentListItem);

    let categoryQuery = admin.from("content").select("type").eq("status", "published");
    if (storeId) categoryQuery = categoryQuery.eq("store_id", storeId);
    const { data: categoryRows, error: categoryError } = await categoryQuery;
    if (categoryError) throw categoryError;
    const categoryMap = new Map<string, number>();
    for (const row of categoryRows || []) {
      const type = row.type || "unknown";
      categoryMap.set(type, (categoryMap.get(type) || 0) + 1);
    }
    const categories = Array.from(categoryMap.entries()).map(([type, value]) => ({
      type,
      label: type.replace(/_/g, " "),
      count: value,
    }));

    return ok({
      items,
      featured,
      pagination: {
        page,
        per_page: perPage,
        total: count || 0,
        total_pages: Math.max(1, Math.ceil((count || 0) / perPage)),
      },
      sidebar: {
        popular,
        categories,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = contentCreateSchema.parse(await request.json());
    const store = getStoreContextFromHeaders();
    const allIds = [
      ...body.image_asset_ids,
      ...body.video_asset_ids,
      ...(body.featured_image_asset_id ? [body.featured_image_asset_id] : []),
    ];
    const mediaRows = await fetchMediaAssetsByIds(store.storeSlug, allIds);
    const featured = body.featured_image_asset_id
      ? mediaRows.find((row) => row.id === body.featured_image_asset_id && row.media_type === "image")
      : undefined;
    if (body.featured_image_asset_id && !featured) {
      throw new Error("featured_image_asset_id must reference an image asset.");
    }

    const images = toImageObjects(mediaRows.filter((row) => body.image_asset_ids.includes(row.id)));
    const videos = toVideoObjects(mediaRows.filter((row) => body.video_asset_ids.includes(row.id)));
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("content")
      .insert({
        store_id: null,
        type: body.type,
        slug: body.slug,
        title: body.title,
        title_zh: body.title_zh ?? null,
        body_markdown: body.body_markdown ?? null,
        body_markdown_zh: body.body_markdown_zh ?? null,
        status: body.status,
        featured_image: featured
          ? { media_asset_id: featured.id, url: featured.url, alt: featured.alt_text ?? "" }
          : null,
        images,
        videos,
      })
      .select("id, slug")
      .single();
    if (error) throw error;
    const contentId = (data as { id: string }).id;
    const linkRows = [...body.image_asset_ids, ...body.video_asset_ids].map((mediaId, idx) => ({
      content_id: contentId,
      media_asset_id: mediaId,
      position: idx,
    }));
    if (linkRows.length > 0) {
      const { error: linkError } = await admin.from("content_media_assets").upsert(linkRows, {
        onConflict: "content_id,media_asset_id",
      });
      if (linkError) throw linkError;
    }
    return ok({ item: data, media_enforced: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = contentUpdateSchema.parse(await request.json());
    const store = getStoreContextFromHeaders();
    const allIds = [
      ...body.image_asset_ids,
      ...body.video_asset_ids,
      ...(body.featured_image_asset_id ? [body.featured_image_asset_id] : []),
    ];
    const mediaRows = await fetchMediaAssetsByIds(store.storeSlug, allIds);
    const featured = body.featured_image_asset_id
      ? mediaRows.find((row) => row.id === body.featured_image_asset_id && row.media_type === "image")
      : undefined;
    if (body.featured_image_asset_id && !featured) {
      throw new Error("featured_image_asset_id must reference an image asset.");
    }

    const images = toImageObjects(mediaRows.filter((row) => body.image_asset_ids.includes(row.id)));
    const videos = toVideoObjects(mediaRows.filter((row) => body.video_asset_ids.includes(row.id)));
    const admin = getSupabaseAdminClient();

    const { data, error } = await admin
      .from("content")
      .update({
        type: body.type,
        slug: body.slug,
        title: body.title,
        title_zh: body.title_zh,
        body_markdown: body.body_markdown,
        body_markdown_zh: body.body_markdown_zh,
        status: body.status,
        featured_image: featured
          ? { media_asset_id: featured.id, url: featured.url, alt: featured.alt_text ?? "" }
          : null,
        images,
        videos,
      })
      .eq("id", body.id)
      .select("id, slug")
      .single();
    if (error) throw error;
    const { error: deleteLinkError } = await admin.from("content_media_assets").delete().eq("content_id", body.id);
    if (deleteLinkError) throw deleteLinkError;
    const linkRows = [...body.image_asset_ids, ...body.video_asset_ids].map((mediaId, idx) => ({
      content_id: body.id,
      media_asset_id: mediaId,
      position: idx,
    }));
    if (linkRows.length > 0) {
      const { error: linkError } = await admin.from("content_media_assets").insert(linkRows);
      if (linkError) throw linkError;
    }
    return ok({ item: data, media_enforced: true });
  } catch (error) {
    return handleApiError(error);
  }
}
