import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getLocalized } from "@/lib/i18n/get-localized";
import type { Locale } from "@/lib/i18n/config";
import type { ProductCardDto, ProductListResponseDto } from "./types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  short_description: string | null;
  short_description_zh: string | null;
  price_cents: number;
  images: Array<{ url?: string; alt?: string; is_primary?: boolean }> | null;
  category_id: string | null;
  categories?: { slug: string; name: string; name_zh: string | null }[] | { slug: string; name: string; name_zh: string | null } | null;
  description?: string | null;
  description_zh?: string | null;
  description_markdown?: string | null;
  description_markdown_zh?: string | null;
  tcm_guide_markdown?: string | null;
  tcm_guide_markdown_zh?: string | null;
  ingredients_markdown?: string | null;
  ingredients_markdown_zh?: string | null;
  usage_markdown?: string | null;
  usage_markdown_zh?: string | null;
};

function oneCategory(
  value: ProductRow["categories"],
): { slug: string; name: string; name_zh: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toProductCard(row: ProductRow, locale: Locale, storePriceCents?: number): ProductCardDto {
  const images = row.images ?? [];
  const primary = images.find((item) => item.is_primary) ?? images[0];
  const listPriceCents = storePriceCents ?? row.price_cents;

  return {
    id: row.id,
    slug: row.slug,
    name: getLocalized(row as Record<string, unknown>, "name", locale),
    short_description:
      getLocalized(row as Record<string, unknown>, "short_description", locale) ||
      (locale === "zh" ? "暂无简介" : "No description available."),
    price: Number((listPriceCents / 100).toFixed(2)),
    sale_price: null,
    primary_image: {
      url:
        primary?.url ||
        "https://images.unsplash.com/photo-1611071536590-1450f0ea49c9?auto=format&fit=crop&w=900&q=80",
      alt: primary?.alt || (locale === "zh" ? "产品图片" : "Product image"),
    },
    category: {
      slug: oneCategory(row.categories)?.slug ?? "uncategorized",
      name:
        locale === "zh" && oneCategory(row.categories)?.name_zh
          ? (oneCategory(row.categories)?.name_zh as string)
          : oneCategory(row.categories)?.name ?? (locale === "zh" ? "未分类" : "Uncategorized"),
    },
    rating_avg: 4.8,
    rating_count: 0,
    stock_status: "in_stock",
    badges: [],
    tcm_elements: [],
    store_price: storePriceCents ? Number((storePriceCents / 100).toFixed(2)) : undefined,
  };
}

export async function listProducts(input: {
  locale: Locale;
  page: number;
  perPage: number;
  category?: string;
  search?: string;
  storeSlug?: string;
  sort?: string;
}) {
  const admin = getSupabaseAdminClient();
  const from = (input.page - 1) * input.perPage;
  const to = from + input.perPage - 1;

  let base = admin
    .from("products")
    .select("id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,category_id,categories:category_id(slug,name,name_zh)", {
      count: "exact",
    })
    .eq("enabled", true);

  if (input.storeSlug) {
    const { data: store } = await admin.from("stores").select("id").eq("slug", input.storeSlug).maybeSingle();
    if (!store?.id) return emptyProductList(input.page, input.perPage);
    const { data: storeProducts } = await admin
      .from("store_products")
      .select("product_id")
      .eq("store_id", store.id)
      .eq("enabled", true);
    const productIds = (storeProducts ?? []).map((item) => item.product_id);
    if (productIds.length === 0) return emptyProductList(input.page, input.perPage);
    base = base.in("id", productIds);
  }

  if (input.category) {
    const { data: category } = await admin.from("categories").select("id").eq("slug", input.category).maybeSingle();
    if (category?.id) {
      base = base.eq("category_id", category.id);
    } else {
      return emptyProductList(input.page, input.perPage);
    }
  }

  if (input.search) {
    const tokens = input.search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);
    if (tokens.length) {
      const clauses: string[] = [];
      for (const token of tokens) {
        clauses.push(`name.ilike.%${token}%`);
        clauses.push(`short_description.ilike.%${token}%`);
      }
      base = base.or(clauses.join(","));
    }
  }

  switch (input.sort) {
    case "price_asc":
      base = base.order("price_cents", { ascending: true });
      break;
    case "price_desc":
      base = base.order("price_cents", { ascending: false });
      break;
    case "name_asc":
      base = base.order("name", { ascending: true });
      break;
    case "newest":
    default:
      base = base.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await base.range(from, to);
  if (error) throw error;
  const rows = (data ?? []) as unknown as ProductRow[];

  let storePriceMap: Record<string, number> = {};
  if (input.storeSlug) {
    const { data: store } = await admin.from("stores").select("id").eq("slug", input.storeSlug).maybeSingle();
    if (store?.id && rows.length > 0) {
      const { data: storeProducts } = await admin
        .from("store_products")
        .select("product_id,price_override_cents")
        .eq("store_id", store.id)
        .eq("enabled", true)
        .in(
          "product_id",
          rows.map((r) => r.id),
        );

      storePriceMap = Object.fromEntries(
        (storeProducts ?? []).map((item) => [item.product_id, item.price_override_cents]).filter((entry) => typeof entry[1] === "number"),
      );
    }
  }

  const products = rows.map((row) => toProductCard(row, input.locale, storePriceMap[row.id]));
  const total = count ?? 0;
  const categories = await buildCategoryFilter(admin, input.locale);
  const priceRange = products.length
    ? {
        min: Math.min(...products.map((p) => p.price)),
        max: Math.max(...products.map((p) => p.price)),
      }
    : { min: 0, max: 0 };

  const response: ProductListResponseDto = {
    products,
    pagination: {
      page: input.page,
      per_page: input.perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / input.perPage)),
    },
    filters: {
      categories,
      price_range: priceRange,
      tcm_natures: [],
      tcm_elements: [],
    },
  };

  return response;
}

export async function getCategoryBySlug(slug: string, locale: Locale) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("categories").select("id,slug,name,name_zh").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    name: locale === "zh" && data.name_zh ? data.name_zh : data.name,
  };
}

export async function getProductDetail(slug: string, locale: Locale) {
  const admin = getSupabaseAdminClient();
  const productSelectWithMarkdown =
    "id,slug,name,name_zh,short_description,short_description_zh,description,description_zh,description_markdown,description_markdown_zh,tcm_guide_markdown,tcm_guide_markdown_zh,ingredients_markdown,ingredients_markdown_zh,usage_markdown,usage_markdown_zh,price_cents,images,videos,category_id,categories:category_id(slug,name,name_zh)";
  const productSelectLegacy =
    "id,slug,name,name_zh,short_description,short_description_zh,description,description_zh,price_cents,images,videos,category_id,categories:category_id(slug,name,name_zh)";

  let product: ProductRow | null = null;
  const withMarkdown = await admin.from("products").select(productSelectWithMarkdown).eq("slug", slug).eq("enabled", true).maybeSingle();
  if (withMarkdown.error && withMarkdown.error.message.toLowerCase().includes("description_markdown")) {
    const legacy = await admin.from("products").select(productSelectLegacy).eq("slug", slug).eq("enabled", true).maybeSingle();
    if (legacy.error) throw legacy.error;
    product = (legacy.data ?? null) as unknown as ProductRow | null;
  } else {
    if (withMarkdown.error) throw withMarkdown.error;
    product = (withMarkdown.data ?? null) as unknown as ProductRow | null;
  }
  if (!product) return null;

  const { data: related } = await admin
    .from("products")
    .select("id,slug,name,name_zh,short_description,short_description_zh,price_cents,images,category_id,categories:category_id(slug,name,name_zh)")
    .eq("enabled", true)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(4);

  // Fetch product variants
  const { data: variantRows } = await admin
    .from("product_variants")
    .select("id,name,name_zh,price_cents,compare_at_price_cents,sku,sort_order,is_default")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true });

  const realVariants = (variantRows ?? []).map((v) => ({
    id: v.id as string,
    name: (locale === "zh" && v.name_zh ? v.name_zh : v.name) as string,
    sku: (v.sku ?? `SKU-${product.slug}`) as string,
    price: Number(((v.price_cents as number) / 100).toFixed(2)),
    compare_at_price: v.compare_at_price_cents ? Number(((v.compare_at_price_cents as number) / 100).toFixed(2)) : null,
    sale_price: null,
    stock_quantity: 100,
    is_default: v.is_default as boolean,
  }));

  const variants = realVariants.length > 0
    ? realVariants
    : [{
        id: `${product.id}-default`,
        name: locale === "zh" ? "标准装" : "Standard",
        sku: `SKU-${product.slug}`,
        price: Number((product.price_cents / 100).toFixed(2)),
        compare_at_price: null,
        sale_price: null,
        stock_quantity: 100,
        is_default: true,
      }];

  const { data: reverseLinks } = await admin
    .from("content_products")
    .select("content_id,content:content_id(id,slug,title,type,status,created_at)")
    .eq("product_id", product.id);
  const relatedContent = (reverseLinks || [])
    .map((link) => {
      const content = Array.isArray(link.content) ? link.content[0] : link.content;
      if (!content || content.status !== "published") return null;
      return {
        id: content.id as string,
        slug: content.slug as string,
        title: content.title as string,
        type: content.type as string,
        published_at: content.created_at as string,
      };
    })
    .filter((item): item is { id: string; slug: string; title: string; type: string; published_at: string } => Boolean(item));

  return {
    id: product.id,
    slug: product.slug,
    name: getLocalized(product as Record<string, unknown>, "name", locale),
    short_description: getLocalized(product as Record<string, unknown>, "short_description", locale),
    long_description:
      getLocalized(product as Record<string, unknown>, "description", locale) ||
      (locale === "zh" ? "暂无详细介绍。" : "Detailed information is coming soon."),
    markdown_sections: {
      description:
        (locale === "zh" ? product.description_markdown_zh : product.description_markdown) ||
        `## Overview\n\n${
          getLocalized(product as Record<string, unknown>, "description", locale) ||
          (locale === "zh" ? "暂无详细介绍。" : "Detailed information is coming soon.")
        }`,
      tcm_guide:
        (locale === "zh" ? product.tcm_guide_markdown_zh : product.tcm_guide_markdown) ||
        `## When to Use This Formula\n\n- ${
          locale === "zh" ? "适用于补气和日常体质调理。" : "Best used for foundational qi support and seasonal resilience."
        }\n- ${locale === "zh" ? "建议根据个人体质咨询医师。" : "Consult a practitioner for constitution-specific guidance."}`,
      ingredients:
        (locale === "zh" ? product.ingredients_markdown_zh : product.ingredients_markdown) ||
        `## Ingredients\n\n- ${locale === "zh" ? "主要草本配方成分请见产品标签。" : "See product label for complete herbal composition."}\n- ${
          locale === "zh" ? "不含人工色素与防腐剂。" : "No artificial colors or preservatives."
        }`,
      usage:
        (locale === "zh" ? product.usage_markdown_zh : product.usage_markdown) ||
        `## Directions\n\n- ${locale === "zh" ? "每日两次，每次1-2粒。" : "Take 1-2 capsules, twice daily."}\n- ${
          locale === "zh" ? "饭前温水送服效果更佳。" : "Preferably with warm water before meals."
        }`,
    },
    price: Number((product.price_cents / 100).toFixed(2)),
    rating_avg: 4.8,
    rating_count: 0,
    images: product.images ?? [],
    category: {
      slug: oneCategory(product.categories as ProductRow["categories"])?.slug ?? "uncategorized",
      name:
        locale === "zh" && oneCategory(product.categories as ProductRow["categories"])?.name_zh
          ? (oneCategory(product.categories as ProductRow["categories"])?.name_zh as string)
          : oneCategory(product.categories as ProductRow["categories"])?.name ?? "Uncategorized",
    },
    related_products: (related ?? []).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: getLocalized(item as Record<string, unknown>, "name", locale),
      short_description: getLocalized(item as Record<string, unknown>, "short_description", locale),
      price: Number((item.price_cents / 100).toFixed(2)),
      primary_image: {
        url: item.images?.[0]?.url ?? "",
        alt: item.images?.[0]?.alt ?? "",
      },
      category: {
        slug: oneCategory(item.categories as ProductRow["categories"])?.slug ?? "uncategorized",
        name:
          locale === "zh" && oneCategory(item.categories as ProductRow["categories"])?.name_zh
            ? (oneCategory(item.categories as ProductRow["categories"])?.name_zh as string)
            : oneCategory(item.categories as ProductRow["categories"])?.name ?? "Uncategorized",
      },
      rating_avg: 4.8,
      rating_count: 0,
      stock_status: "in_stock" as const,
      badges: [],
      tcm_elements: [],
      sale_price: null,
    })),
    related_content: relatedContent,
    variants,
  };
}

async function buildCategoryFilter(admin: ReturnType<typeof getSupabaseAdminClient>, locale: Locale) {
  const { data, error } = await admin.from("categories").select("id,slug,name,name_zh");
  if (error) throw error;
  const categories = (data ?? []) as Array<{ id: string; slug: string; name: string; name_zh: string | null }>;

  const { data: products } = await admin.from("products").select("category_id").eq("enabled", true);
  const countByCategory = (products ?? []).reduce<Record<string, number>>((acc, row) => {
    const categoryId = row.category_id;
    if (categoryId) acc[categoryId] = (acc[categoryId] ?? 0) + 1;
    return acc;
  }, {});

  return categories.map((item) => ({
    slug: item.slug,
    name: locale === "zh" && item.name_zh ? item.name_zh : item.name,
    count: countByCategory[item.id] ?? 0,
  }));
}

function emptyProductList(page: number, perPage: number): ProductListResponseDto {
  return {
    products: [],
    pagination: { page, per_page: perPage, total: 0, total_pages: 1 },
    filters: { categories: [], price_range: { min: 0, max: 0 }, tcm_natures: [], tcm_elements: [] },
  };
}
