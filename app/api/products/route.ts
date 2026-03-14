import { z } from "zod";
import { paginationSchema } from "@/lib/utils/validation";
import { handleApiError, ok } from "@/lib/utils/api";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchMediaAssetsByIds, toImageObjects, toVideoObjects } from "@/lib/media/selection";
import { listProducts } from "@/lib/catalog/service";
import { getStoreContextFromHeaders } from "@/lib/store/context";

const filterSchema = paginationSchema.extend({
  store_slug: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z
    .enum(["price_asc", "price_desc", "newest", "name_asc", "best_selling", "rating"])
    .optional()
    .default("newest"),
  locale: z.enum(["en", "zh"]).default("en"),
  per_page: z.coerce.number().int().positive().max(50).default(20),
});

const productCreateSchema = z
  .object({
    slug: z.string().min(2),
    name: z.string().min(2),
    name_zh: z.string().optional(),
    short_description: z.string().optional(),
    short_description_zh: z.string().optional(),
    description: z.string().optional(),
    description_zh: z.string().optional(),
    description_markdown: z.string().optional(),
    description_markdown_zh: z.string().optional(),
    tcm_guide_markdown: z.string().optional(),
    tcm_guide_markdown_zh: z.string().optional(),
    ingredients_markdown: z.string().optional(),
    ingredients_markdown_zh: z.string().optional(),
    usage_markdown: z.string().optional(),
    usage_markdown_zh: z.string().optional(),
    category_id: z.string().uuid().optional(),
    price_cents: z.number().int().nonnegative(),
    product_type: z.enum(["standard", "bundle"]).optional(),
    bundle_items: z.array(z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      quantity: z.number().int().positive(),
    })).optional(),
    image_asset_ids: z.array(z.string().uuid()).default([]),
    video_asset_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

const productUpdateSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    name_zh: z.string().optional(),
    short_description: z.string().optional(),
    short_description_zh: z.string().optional(),
    description: z.string().optional(),
    description_zh: z.string().optional(),
    description_markdown: z.string().optional(),
    description_markdown_zh: z.string().optional(),
    tcm_guide_markdown: z.string().optional(),
    tcm_guide_markdown_zh: z.string().optional(),
    ingredients_markdown: z.string().optional(),
    ingredients_markdown_zh: z.string().optional(),
    usage_markdown: z.string().optional(),
    usage_markdown_zh: z.string().optional(),
    category_id: z.string().uuid().optional(),
    price_cents: z.number().int().nonnegative().optional(),
    product_type: z.enum(["standard", "bundle"]).optional(),
    bundle_items: z.array(z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      quantity: z.number().int().positive(),
    })).optional(),
    image_asset_ids: z.array(z.string().uuid()).default([]),
    video_asset_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = filterSchema.parse(Object.fromEntries(searchParams.entries()));
    const response = await listProducts({
      locale: parsed.locale,
      page: parsed.page,
      perPage: parsed.per_page,
      category: parsed.category,
      search: parsed.search,
      storeSlug: parsed.store_slug,
      sort: parsed.sort,
    });
    return ok(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = productCreateSchema.parse(await request.json());
    const store = getStoreContextFromHeaders();
    const mediaRows = await fetchMediaAssetsByIds(store.storeSlug, [...body.image_asset_ids, ...body.video_asset_ids]);
    const images = toImageObjects(mediaRows.filter((row) => body.image_asset_ids.includes(row.id)));
    const videos = toVideoObjects(mediaRows.filter((row) => body.video_asset_ids.includes(row.id)));
    const admin = getSupabaseAdminClient();

    const { data, error } = await admin
      .from("products")
      .insert({
        slug: body.slug,
        name: body.name,
        name_zh: body.name_zh ?? null,
        short_description: body.short_description ?? null,
        short_description_zh: body.short_description_zh ?? null,
        description: body.description ?? null,
        description_zh: body.description_zh ?? null,
        description_markdown: body.description_markdown ?? null,
        description_markdown_zh: body.description_markdown_zh ?? null,
        tcm_guide_markdown: body.tcm_guide_markdown ?? null,
        tcm_guide_markdown_zh: body.tcm_guide_markdown_zh ?? null,
        ingredients_markdown: body.ingredients_markdown ?? null,
        ingredients_markdown_zh: body.ingredients_markdown_zh ?? null,
        usage_markdown: body.usage_markdown ?? null,
        usage_markdown_zh: body.usage_markdown_zh ?? null,
        category_id: body.category_id ?? null,
        price_cents: body.price_cents,
        product_type: body.product_type ?? "standard",
        bundle_items: body.bundle_items ?? null,
        images,
        videos,
      })
      .select("id, slug")
      .single();

    if (error) throw error;
    const productId = (data as { id: string }).id;
    const linkRows = [...body.image_asset_ids, ...body.video_asset_ids].map((mediaId, idx) => ({
      product_id: productId,
      media_asset_id: mediaId,
      position: idx,
    }));
    if (linkRows.length > 0) {
      const { error: linkError } = await admin.from("product_media_assets").upsert(linkRows, {
        onConflict: "product_id,media_asset_id",
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
    const body = productUpdateSchema.parse(await request.json());
    const store = getStoreContextFromHeaders();
    const mediaRows = await fetchMediaAssetsByIds(store.storeSlug, [...body.image_asset_ids, ...body.video_asset_ids]);
    const images = toImageObjects(mediaRows.filter((row) => body.image_asset_ids.includes(row.id)));
    const videos = toVideoObjects(mediaRows.filter((row) => body.video_asset_ids.includes(row.id)));
    const admin = getSupabaseAdminClient();

    const { data, error } = await admin
      .from("products")
      .update({
        slug: body.slug,
        name: body.name,
        name_zh: body.name_zh,
        short_description: body.short_description,
        short_description_zh: body.short_description_zh,
        description: body.description,
        description_zh: body.description_zh,
        description_markdown: body.description_markdown,
        description_markdown_zh: body.description_markdown_zh,
        tcm_guide_markdown: body.tcm_guide_markdown,
        tcm_guide_markdown_zh: body.tcm_guide_markdown_zh,
        ingredients_markdown: body.ingredients_markdown,
        ingredients_markdown_zh: body.ingredients_markdown_zh,
        usage_markdown: body.usage_markdown,
        usage_markdown_zh: body.usage_markdown_zh,
        category_id: body.category_id,
        price_cents: body.price_cents,
        product_type: body.product_type,
        bundle_items: body.bundle_items ?? null,
        images,
        videos,
      })
      .eq("id", body.id)
      .select("id, slug")
      .single();

    if (error) throw error;
    const { error: deleteLinkError } = await admin.from("product_media_assets").delete().eq("product_id", body.id);
    if (deleteLinkError) throw deleteLinkError;
    const linkRows = [...body.image_asset_ids, ...body.video_asset_ids].map((mediaId, idx) => ({
      product_id: body.id,
      media_asset_id: mediaId,
      position: idx,
    }));
    if (linkRows.length > 0) {
      const { error: linkError } = await admin.from("product_media_assets").insert(linkRows);
      if (linkError) throw linkError;
    }
    return ok({ item: data, media_enforced: true });
  } catch (error) {
    return handleApiError(error);
  }
}
