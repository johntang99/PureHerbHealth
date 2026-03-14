import { z } from "zod";
import type { Locale } from "@/lib/i18n/config";
import { getLocalized } from "@/lib/i18n/get-localized";
import type { ProductCardDto } from "@/lib/catalog/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listProducts } from "@/lib/catalog/service";
import { handleApiError, ok } from "@/lib/utils/api";
import { resolveStoreSlug } from "@/lib/store/slug";

const querySchema = z.object({
  store_slug: z.string().optional(),
  locale: z.enum(["en", "zh"]).default("en"),
  anchor_product_id: z.string().uuid().optional(),
  exclude_ids: z.string().optional(),
  per_section: z.coerce.number().int().positive().max(12).default(6),
});

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  short_description: string | null;
  short_description_zh: string | null;
  price_cents: number;
  images: Array<{ url?: string; alt?: string; is_primary?: boolean }> | null;
  categories?: { slug: string; name: string; name_zh: string | null }[] | { slug: string; name: string; name_zh: string | null } | null;
};

function oneCategory(
  value: ProductRow["categories"],
): { slug: string; name: string; name_zh: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toCard(row: ProductRow, locale: Locale, storePriceCents?: number): ProductCardDto {
  const images = row.images ?? [];
  const primary = images.find((item) => item.is_primary) ?? images[0];
  const priceCents = storePriceCents ?? row.price_cents;
  const category = oneCategory(row.categories);
  return {
    id: row.id,
    slug: row.slug,
    name: getLocalized(row as Record<string, unknown>, "name", locale),
    short_description:
      getLocalized(row as Record<string, unknown>, "short_description", locale) ||
      (locale === "zh" ? "暂无简介" : "No description available."),
    price: Number((priceCents / 100).toFixed(2)),
    sale_price: null,
    primary_image: {
      url: primary?.url || "https://images.unsplash.com/photo-1611071536590-1450f0ea49c9?auto=format&fit=crop&w=900&q=80",
      alt: primary?.alt || (locale === "zh" ? "产品图片" : "Product image"),
    },
    category: {
      slug: category?.slug ?? "uncategorized",
      name: locale === "zh" && category?.name_zh ? category.name_zh : category?.name ?? (locale === "zh" ? "未分类" : "Uncategorized"),
    },
    rating_avg: 4.8,
    rating_count: 0,
    stock_status: "in_stock",
    badges: [],
    tcm_elements: [],
    store_price: storePriceCents ? Number((storePriceCents / 100).toFixed(2)) : undefined,
  };
}

function parseExcludeIds(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(part));
}

async function loadCardsByIds(params: {
  ids: string[];
  locale: Locale;
  storeSlug: string;
}): Promise<ProductCardDto[]> {
  const { ids, locale, storeSlug } = params;
  if (ids.length === 0) return [];
  const admin = getSupabaseAdminClient();
  const { data: store } = await admin.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
  if (!store?.id) return [];

  const { data: storeProducts } = await admin
    .from("store_products")
    .select("product_id,price_override_cents")
    .eq("store_id", store.id)
    .eq("enabled", true)
    .in("product_id", ids);
  const allowed = new Set((storeProducts ?? []).map((row) => row.product_id));
  const priceMap = new Map((storeProducts ?? []).map((row) => [row.product_id, row.price_override_cents]));
  if (allowed.size === 0) return [];

  const orderedAllowed = ids.filter((id) => allowed.has(id));
  if (orderedAllowed.length === 0) return [];

  const { data: products, error } = await admin
    .from("products")
    .select("id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,categories:category_id(slug,name,name_zh)")
    .in("id", orderedAllowed)
    .eq("enabled", true);
  if (error) throw error;
  const rows = (products ?? []) as ProductRow[];
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  return orderedAllowed
    .map((id) => rowMap.get(id))
    .filter((row): row is ProductRow => Boolean(row))
    .map((row) => toCard(row, locale, priceMap.get(row.id) ?? undefined));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const storeSlug = resolveStoreSlug(query.store_slug);
    const locale = query.locale as Locale;
    const excludeIds = new Set(parseExcludeIds(query.exclude_ids));
    const admin = getSupabaseAdminClient();

    const pool = await listProducts({
      locale,
      page: 1,
      perPage: 50,
      storeSlug,
      sort: "newest",
    });

    const { data: anchorProduct } = query.anchor_product_id
      ? await admin.from("products").select("id,category_id").eq("id", query.anchor_product_id).maybeSingle()
      : { data: null as { id: string; category_id: string | null } | null };
    const anchorCategoryId = anchorProduct?.category_id ?? null;

    const filteredPool = pool.products.filter((product) => !excludeIds.has(product.id));
    const poolIds = filteredPool.map((product) => product.id);
    const { data: poolCategoryRows } =
      poolIds.length > 0
        ? await admin.from("products").select("id,category_id").in("id", poolIds)
        : { data: [] as Array<{ id: string; category_id: string | null }> };
    const poolCategoryMap = new Map((poolCategoryRows ?? []).map((row) => [row.id, row.category_id]));

    const sameCategory = anchorCategoryId
      ? filteredPool.filter((product) => poolCategoryMap.get(product.id) === anchorCategoryId)
      : [];

    const basedCandidates = [
      ...sameCategory,
      ...filteredPool.filter((product) => !sameCategory.some((same) => same.id === product.id)),
    ];
    const basedOnAdded = basedCandidates.slice(0, query.per_section);
    const usedIds = new Set(basedOnAdded.map((item) => item.id));

    let alsoBought: ProductCardDto[] = [];
    if (query.anchor_product_id) {
      const { data: resolvedStore } = await admin.from("stores").select("id").eq("slug", storeSlug).maybeSingle();
      if (resolvedStore?.id) {
        const { data: anchorOrderItems } = await admin.from("order_items").select("order_id").eq("product_id", query.anchor_product_id);
        const anchorOrderIds = Array.from(new Set((anchorOrderItems ?? []).map((row) => row.order_id)));
        const { data: storeOrders } =
          anchorOrderIds.length > 0
            ? await admin.from("orders").select("id").eq("store_id", resolvedStore.id).in("id", anchorOrderIds)
            : { data: [] as Array<{ id: string }> };

        const orderIds = (storeOrders ?? []).map((row) => row.id);
        if (orderIds.length > 0) {
          const { data: coItems } = await admin
            .from("order_items")
            .select("product_id,quantity,order_id")
            .in("order_id", orderIds)
            .neq("product_id", query.anchor_product_id);

          const scoreMap = new Map<string, { orderIds: Set<string>; quantity: number }>();
          for (const item of coItems ?? []) {
            if (excludeIds.has(item.product_id) || usedIds.has(item.product_id)) continue;
            const score = scoreMap.get(item.product_id) ?? { orderIds: new Set<string>(), quantity: 0 };
            score.orderIds.add(item.order_id);
            score.quantity += item.quantity;
            scoreMap.set(item.product_id, score);
          }

          const rankedIds = Array.from(scoreMap.entries())
            .sort((a, b) => {
              const orderDiff = b[1].orderIds.size - a[1].orderIds.size;
              if (orderDiff !== 0) return orderDiff;
              return b[1].quantity - a[1].quantity;
            })
            .map(([productId]) => productId);

          alsoBought = await loadCardsByIds({
            ids: rankedIds.slice(0, query.per_section * 2),
            locale,
            storeSlug,
          });
        }
      }
    }

    if (alsoBought.length < query.per_section) {
      const fill = filteredPool.filter((product) => !usedIds.has(product.id) && !alsoBought.some((item) => item.id === product.id));
      alsoBought = [...alsoBought, ...fill].slice(0, query.per_section);
    } else {
      alsoBought = alsoBought.slice(0, query.per_section);
    }
    for (const item of alsoBought) usedIds.add(item.id);

    const youMightAlsoLike = filteredPool.filter((product) => !usedIds.has(product.id)).slice(0, query.per_section);

    return ok({
      based_on_added: basedOnAdded,
      also_bought: alsoBought,
      you_might_also_like: youMightAlsoLike,
      meta: {
        pool_size: pool.products.length,
        excluded_count: excludeIds.size,
        per_section: query.per_section,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
